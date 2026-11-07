const { execFile, spawn, execSync } = require('child_process');
const { PassThrough } = require('stream');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const proxyManager = require('./helpers/proxyManager');
const youtubeCircuit = require('./helpers/youtubeCircuit');

class CacheManager {
    constructor() {
        // Smart Storage Selector:
        // If custom CACHE_DIR provided, use it.
        // Otherwise, if running on Linux with >= 4GB RAM and /dev/shm is writable, use RAM Disk (/dev/shm/goolix_cache)
        const customCacheDir = process.env.CACHE_DIR;
        if (customCacheDir) {
            this.cacheDir = path.resolve(customCacheDir);
        } else if (process.platform === 'linux' && os.totalmem() >= 4 * 1024 * 1024 * 1024 && fs.existsSync('/dev/shm')) {
            this.cacheDir = '/dev/shm/goolix_cache';
            console.log('[CacheManager] Auto-selected High-Speed RAM Disk for audio cache: /dev/shm/goolix_cache');
        } else {
            this.cacheDir = path.resolve(__dirname, '../music_cache');
        }

        this.pinnedTracks = new Set();
        this.binPath = path.resolve(__dirname, process.platform === 'win32' ? '../bin/yt-dlp.exe' : '../bin/yt-dlp');
        
        this.ffmpegBundlePath = path.resolve(__dirname, '../bin/ffmpeg-bundle');
        this.ffmpegPath = path.join(this.ffmpegBundlePath, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        this.scMatchCache = new Map(); // identifier -> scsearch query
        
        // Setup directories and binaries
        try {
            if (!fs.existsSync(this.ffmpegBundlePath)) {
                fs.mkdirSync(this.ffmpegBundlePath, { recursive: true });
            }

            // Remove unneeded ffprobe if present to immediately free ~75MB disk space
            const bundledFfprobe = path.join(this.ffmpegBundlePath, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
            if (fs.existsSync(bundledFfprobe)) {
                try {
                    fs.unlinkSync(bundledFfprobe);
                    console.log('[CacheManager] Removed unneeded ffprobe to save disk space.');
                } catch {}
            }

            // Check if ffmpeg is in system PATH first
            let systemFfmpeg = null;
            try {
                const checkCmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
                const output = execSync(checkCmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n')[0].trim();
                if (output && fs.existsSync(output)) {
                    systemFfmpeg = output;
                }
            } catch {}

            if (systemFfmpeg) {
                this.ffmpegPath = systemFfmpeg;
                console.log(`[CacheManager] Using system FFmpeg: ${this.ffmpegPath}`);
            } else if (!fs.existsSync(this.ffmpegPath) && process.platform !== 'win32') {
                console.log('[CacheManager] Downloading standalone ffmpeg binary...');
                execSync(`curl -L "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-linux-x64" -o "${this.ffmpegPath}"`);
                fs.chmodSync(this.ffmpegPath, 0o755);
            }
        } catch (err) {
            console.error('[CacheManager] FFmpeg setup notice:', err.message);
        }

        this.downloadPromises = new Map();

        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        this._ensureExecutable();

        // Stream Guard Concurrency Limiter
        const configuredSpawns = parseInt(process.env.MAX_CONCURRENT_SPAWNS || '0', 10);
        if (configuredSpawns > 0) {
            this.maxConcurrentSpawns = configuredSpawns;
        } else {
            const cpus = os.cpus()?.length || 1;
            const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
            if (cpus <= 1 || totalMemMb < 1024) {
                this.maxConcurrentSpawns = 2;
            } else if (cpus <= 2 || totalMemMb < 3072) {
                this.maxConcurrentSpawns = 3;
            } else if (cpus <= 4 || totalMemMb < 6144) {
                this.maxConcurrentSpawns = 4;
            } else {
                this.maxConcurrentSpawns = Math.min(8, Math.max(4, cpus));
            }
        }
        this._activeSpawns = 0;
        this._activeTasks = new Map();
        this._spawnQueue = [];
        this._taskIdCounter = 0;
        console.log(`[CacheManager] Stream Guard Active (Initial Max Spawns: ${this.maxConcurrentSpawns} [${configuredSpawns > 0 ? 'Manual .env' : 'Auto-Tuned'}])`);
    }

    pinTrack(identifier) {
        if (!identifier) return;
        this.pinnedTracks.add(identifier);
    }

    unpinTrack(identifier) {
        if (!identifier) return;
        this.pinnedTracks.delete(identifier);
    }

    isPinned(identifier) {
        if (!identifier) return false;
        return this.pinnedTracks.has(identifier);
    }

    getCurrentMaxSpawns() {
        const configuredSpawns = parseInt(process.env.MAX_CONCURRENT_SPAWNS || '0', 10);
        if (configuredSpawns > 0) return configuredSpawns;

        // Auto-detect based on host hardware & active load
        const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
        if (totalMemMb < 1000) {
            // Strict lock on low-RAM systems (e.g. 400MB SG NAT VPS)
            return 1;
        }

        // Dynamic Burst on systems with >= 1GB RAM:
        // Allow 2 concurrent spawns if active streams < 5, else 1
        return this.pinnedTracks.size < 5 ? 2 : 1;
    }

    getActiveSpawns() {
        return this._activeSpawns;
    }

    getQueuedSpawnsCount() {
        return this._spawnQueue.length;
    }

    async _acquireSpawnSlot(priority = 'interactive', onAbort = null, trackTitle = '') {
        const taskId = ++this._taskIdCounter;
        const currentLimit = this.getCurrentMaxSpawns();

        // 1. Immediate slot available
        if (this._activeSpawns < currentLimit) {
            this._activeSpawns++;
            const task = { id: taskId, priority, onAbort, trackTitle, createdAt: Date.now() };
            this._activeTasks.set(taskId, task);
            let released = false;
            return () => {
                if (!released) {
                    released = true;
                    this._activeTasks.delete(taskId);
                    this._releaseSpawnSlot();
                }
            };
        }

        // 2. All slots occupied:
        // If an INTERACTIVE request arrives (Play / Skip), check if any running task is BACKGROUND (Pre-fetch)
        // If so, PREEMPT / ABORT the background task to free the slot immediately for the user!
        if (priority === 'interactive') {
            const bgTask = Array.from(this._activeTasks.values()).find(t => t.priority === 'background');
            if (bgTask && typeof bgTask.onAbort === 'function') {
                console.warn(`[CacheManager:StreamGuard] Preempting background pre-fetch "${bgTask.trackTitle || bgTask.id}" for user action "${trackTitle || 'Interactive'}"`);
                try {
                    bgTask.onAbort('Preempted by interactive user action');
                } catch (e) {
                    console.error('[CacheManager:StreamGuard] Failed to abort background task:', e.message);
                }
            }
        }

        // 3. Queue the request with priority insertion:
        // Interactive tasks jump ahead of all queued background tasks (FIFO among interactive tasks)
        return new Promise((resolve) => {
            const queueItem = {
                id: taskId,
                priority,
                onAbort,
                trackTitle,
                createdAt: Date.now(),
                resolve
            };

            if (priority === 'interactive') {
                const firstBgIndex = this._spawnQueue.findIndex(item => item.priority === 'background');
                if (firstBgIndex !== -1) {
                    this._spawnQueue.splice(firstBgIndex, 0, queueItem);
                } else {
                    this._spawnQueue.push(queueItem);
                }
            } else {
                this._spawnQueue.push(queueItem);
            }

            console.log(`[CacheManager:StreamGuard] Queued [${priority.toUpperCase()}] task for "${trackTitle || 'Track'}" (Queue: ${this._spawnQueue.length})`);
        });
    }

    _releaseSpawnSlot() {
        this._activeSpawns = Math.max(0, this._activeSpawns - 1);
        const currentLimit = this.getCurrentMaxSpawns();
        if (this._spawnQueue.length > 0 && this._activeSpawns < currentLimit) {
            const nextItem = this._spawnQueue.shift();
            if (nextItem && typeof nextItem.resolve === 'function') {
                this._activeSpawns++;
                const task = {
                    id: nextItem.id,
                    priority: nextItem.priority,
                    onAbort: nextItem.onAbort,
                    trackTitle: nextItem.trackTitle,
                    createdAt: Date.now()
                };
                this._activeTasks.set(nextItem.id, task);

                let released = false;
                nextItem.resolve(() => {
                    if (!released) {
                        released = true;
                        this._activeTasks.delete(nextItem.id);
                        this._releaseSpawnSlot();
                    }
                });
            }
        }
    }

    _ensureExecutable() {
        if (process.platform !== 'win32' && fs.existsSync(this.binPath)) {
            try { fs.chmodSync(this.binPath, 0o755); } catch {}
        }
    }

    getTrackHash(identifier) {
        return crypto.createHash('sha256').update(String(identifier || '')).digest('hex').slice(0, 32);
    }

    getTrackPath(identifier) {
        return path.join(this.cacheDir, `${this.getTrackHash(identifier)}.opus`);
    }

    isCached(identifier) {
        const filePath = this.getTrackPath(identifier);
        return fs.existsSync(filePath) && fs.statSync(filePath).size > 1024;
    }

    _buildAudioFilterChain(volume = 100, filter = 'off') {
        const parts = [];
        if (typeof volume === 'number' && volume !== 100) {
            parts.push(`volume=${(volume / 100).toFixed(2)}`);
        }
        if (filter && filter !== 'off') {
            const filterMap = {
                bassboost: 'bass=g=10,dynaudnorm',
                nightcore: 'asetrate=48000*1.25,aresample=48000',
                pop: 'equalizer=f=1000:t=q:w=1:g=2',
                soft: 'lowpass=f=3000',
                vaporwave: 'asetrate=48000*0.8,aresample=48000'
            };
            if (filterMap[filter]) {
                parts.push(filterMap[filter]);
            }
        }
        return parts.length > 0 ? parts.join(',') : null;
    }

    _buildYtDlpArgs(source, isStreamOutput = false, outTemplate = null, seekSeconds = 0) {
        const bufferSize = process.env.STREAM_BUFFER_SIZE || '512K';
        const chunkSize = process.env.STREAM_CHUNK_SIZE || '512K';
        const socketTimeout = process.env.STREAM_SOCKET_TIMEOUT || '10';

        const args = [
            '--no-cache-dir',
            '--no-playlist',
            '--no-warnings',
            '--no-progress',
            '--retries', '2',
            '--fragment-retries', '3',
            '--retry-sleep', '1',
            '--socket-timeout', socketTimeout,
            '--buffer-size', bufferSize,
            '--http-chunk-size', chunkSize,
            '--js-runtimes', 'node',
            '-f', '251/bestaudio/best'
        ];

        const isSoundCloud = source.includes('soundcloud.com') || source.startsWith('scsearch');

        // Direct hardware/network seek on YouTube pipe to prevent FFmpeg pipe starvation & filter glitches
        if (seekSeconds > 0 && isStreamOutput && !isSoundCloud) {
            args.push('--download-sections', `*${seekSeconds}-inf`);
        }
        const cookiesPath = path.resolve(__dirname, '../cookies.txt');
        const hasCookies = fs.existsSync(cookiesPath);
        const useIPv6 = process.env.USE_IPV6 === 'true';

        if (!isSoundCloud) {
            const netArgs = proxyManager.getNetworkArgs();
            if (netArgs.length > 0) {
                args.push(...netArgs);
            } else if (useIPv6) {
                args.push('--force-ipv6');
            }
        }

        if (hasCookies && !isSoundCloud) {
            args.push('--cookies', cookiesPath);
        }

        if (this.ffmpegPath) {
            args.push('--ffmpeg-location', path.dirname(this.ffmpegPath));
        }

        if (isStreamOutput) {
            args.push('-o', '-');
        } else if (outTemplate) {
            args.push('-x', '--audio-format', 'opus');
            args.push('--force-overwrites');
            args.push('-o', outTemplate);
        }

        args.push(source);
        return args;
    }

    _getSoundCloudFallback(track) {
        const identifier = track.identifier || track.uri;
        if (identifier && this.scMatchCache.has(identifier)) {
            return this.scMatchCache.get(identifier);
        }

        const title = track.title || '';
        const author = track.author || '';
        const cleanTitle = title
            .replace(/\[.*?\]|\(.*?\)|【.*?】|MV|Official|Music Video|Audio|Lyrics/gi, '')
            .replace(/[-|/\\#~!?@$%^&*_+<>{}=]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Avoid appending generic channel names or record labels that break search
        const isTopicOrLabel = /topic|gmm|rs|genie|records|music|vevo|i am/i.test(author);
        let query = cleanTitle || title;
        if (author && !isTopicOrLabel && !query.toLowerCase().includes(author.toLowerCase())) {
            query = `${query} ${author}`;
        }
        const res = query ? `scsearch1:${query.trim()}` : null;
        if (identifier && res) {
            if (this.scMatchCache.size > 200) {
                const firstKey = this.scMatchCache.keys().next().value;
                this.scMatchCache.delete(firstKey);
            }
            this.scMatchCache.set(identifier, res);
        }
        return res;
    }

    _streamFromDisk(targetPath, seekSeconds = 0, volume = 100, onSpawn = null, filter = 'off', bitrate = '64k', identifier = null) {
        const fileId = identifier || path.basename(targetPath, path.extname(targetPath));
        if (fileId) this.pinTrack(fileId);
        const unpin = () => {
            if (fileId) this.unpinTrack(fileId);
        };

        const filterChain = this._buildAudioFilterChain(volume, filter);

        // Fast path: Zero-copy direct disk stream (No child process, zero CPU overhead)
        if (seekSeconds <= 0 && !filterChain) {
            const fileStream = fs.createReadStream(targetPath, { highWaterMark: 1024 * 512 });
            fileStream.streamType = 'ogg/opus';
            fileStream.once('close', unpin);
            fileStream.once('end', unpin);
            fileStream.once('error', unpin);
            fileStream.kill = () => {
                unpin();
                try { fileStream.destroy(); } catch {}
            };
            if (typeof onSpawn === 'function') {
                onSpawn(fileStream);
            }
            return fileStream;
        }

        const ffmpegArgs = ['-nostdin', '-loglevel', 'error'];
        if (seekSeconds > 0) {
            ffmpegArgs.push('-ss', seekSeconds.toString());
        }
        ffmpegArgs.push('-i', targetPath);
        if (filterChain) {
            ffmpegArgs.push('-af', filterChain, '-c:a', 'libopus', '-b:a', bitrate || '128k', '-ar', '48000', '-ac', '2');
        } else if (seekSeconds > 0) {
            ffmpegArgs.push('-c:a', 'libopus', '-b:a', bitrate || '128k', '-vbr', 'on', '-ar', '48000', '-ac', '2');
        } else {
            ffmpegArgs.push('-c:a', 'copy');
        }
        ffmpegArgs.push('-f', 'opus', 'pipe:1');

        const ffmpegProc = spawn(this.ffmpegPath, ffmpegArgs, { windowsHide: true });
        ffmpegProc.once('close', unpin);
        ffmpegProc.once('error', unpin);
        ffmpegProc.stdout.once('close', unpin);
        ffmpegProc.stdout.once('end', unpin);
        ffmpegProc.on('error', (err) => console.error('[CacheManager] ffmpeg cached stream error:', err.message));
        ffmpegProc.stdout.streamType = 'ogg/opus';
        ffmpegProc.stdout.kill = () => {
            unpin();
            try { ffmpegProc.kill('SIGKILL'); } catch {}
        };
        if (typeof onSpawn === 'function') {
            onSpawn(ffmpegProc.stdout);
        }
        return ffmpegProc.stdout;
    }

    async createTrackStream(track, seekSeconds = 0, volume = 100, onSpawn = null, options = {}) {
        const filter = (options && options.audioFilter) || 'off';
        const bitrate = (options && options.bitrate) || '64k';

        // Remote Audio Node routing (Scale-Out Cluster)
        if (options && options.node && options.node.type === 'remote' && options.node.status === 'online') {
            try {
                console.log(`[CacheManager:Stream] Routing track "${track.title}" through remote node: ${options.node.name} (${options.node.host}:${options.node.port})`);
                return await this._streamFromRemoteNode(options.node, track, seekSeconds, volume, onSpawn, filter, bitrate);
            } catch (remoteErr) {
                console.warn(`[CacheManager] Remote node stream failed for "${track.title}", falling back to local:`, remoteErr.message);
            }
        }

        const identifier = track.identifier || crypto.createHash('md5').update(track.uri || '').digest('hex').slice(0, 20);
        const targetPath = this.getTrackPath(identifier);

        // 1. Play from cached file if present (<0.1s latency)
        if (this.isCached(identifier)) {
            console.log(`[CacheManager:Stream] Cache HIT for "${track.title}" (Serving from disk) | Filter: ${filter} | Bitrate: ${bitrate}`);
            return this._streamFromDisk(targetPath, seekSeconds, volume, onSpawn, filter, bitrate, identifier);
        }

        const isYouTube = !track.uri?.includes('soundcloud.com') && !track.uri?.startsWith('scsearch');

        // 2. FAST PATH: If YouTube circuit is OPEN, do not waste time attempting YouTube!
        // Immediately pipe from SoundCloud (latency ~2-3s).
        if (isYouTube && youtubeCircuit.isOpen()) {
            console.log(`[CacheManager:Stream] Circuit OPEN -> Fast-tracking "${track.title}" directly via SoundCloud pipe`);
            return this._trySoundCloudFallback(track, seekSeconds, volume, onSpawn, filter, bitrate);
        }

        const streamMode = (process.env.STREAM_MODE || 'cache').toLowerCase().trim();
        const durationSec = track.duration || (track.length ? Math.round(track.length / 1000) : 0);

        const maxCacheDurationSec = parseInt(process.env.MAX_CACHE_DURATION_SEC || '1800', 10); // 30 minutes threshold

        const isLive = track.isStream || durationSec <= 0 || track.title?.includes('🔴');

        // 1. Live streams or infinite feeds MUST ALWAYS pipe directly (Never attempt to cache infinite feeds to disk)
        if (isLive || streamMode === 'pipe' || (streamMode === 'auto' && durationSec > maxCacheDurationSec)) {
            console.log(`[CacheManager:Stream] Live pipe stream for ${isLive ? 'LIVE' : 'long'} track "${track.title}" (Mode: ${streamMode}, Duration: ${durationSec}s, Seek: ${seekSeconds}s)`);
            return this._spawnPipedStream(track, track.uri, seekSeconds, volume, false, onSpawn, filter, bitrate);
        }

        // 3. Cache Mode (Default, Zero-Stutter): Download full track to NVMe disk before playback
        try {
            console.log(`[CacheManager:Stream] Caching track to disk before playback: "${track.title}" (Mode: ${streamMode})`);
            await this.prepareTrack(track, false, onSpawn);
            if (this.isCached(identifier)) {
                return this._streamFromDisk(targetPath, seekSeconds, volume, onSpawn, filter, bitrate, identifier);
            }
        } catch (err) {
            if (youtubeCircuit.constructor.isBotBlock(err.message)) {
                console.warn(`[CacheManager] Anti-bot block detected: ${err.message}. Fast-switching to SoundCloud...`);
                youtubeCircuit.trip(err.message);
                return this._trySoundCloudFallback(track, seekSeconds, volume, onSpawn, filter, bitrate);
            }
            console.log(`[CacheManager] Disk caching timed out or failed for "${track.title}". Streaming directly via live pipe...`);
            return this._spawnPipedStream(track, track.uri, seekSeconds, volume, false, onSpawn, filter, bitrate);
        }

        // 4. Fallback to direct streaming
        return this._spawnPipedStream(track, track.uri, seekSeconds, volume, false, onSpawn, filter, bitrate);
    }

    async _spawnPipedStream(track, sourceUri, seekSeconds = 0, volume = 100, isFallback = false, onSpawn = null, filter = 'off', bitrate = '64k') {
        const releaseSlot = await this._acquireSpawnSlot('interactive', null, track.title);
        let slotReleased = false;
        const safeReleaseSlot = () => {
            if (!slotReleased) {
                slotReleased = true;
                releaseSlot();
            }
        };

        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            this._ensureExecutable();
            const isYouTube = !sourceUri.includes('soundcloud.com') && !sourceUri.startsWith('scsearch');
            const ytdlpArgs = this._buildYtDlpArgs(sourceUri, true, null, seekSeconds);
            const ytdlpProc = spawn(this.binPath, ytdlpArgs, { windowsHide: true });

            const durationSec = track.duration || (track.length ? Math.round(track.length / 1000) : 0);
            const isLive = track.isStream || durationSec <= 0 || track.title?.includes('🔴');
            const filterChain = this._buildAudioFilterChain(volume, filter);
            // YouTube Live streams use HLS AAC (not WebM Opus), so they must route through FFmpeg to transcode to Opus
            const useDirectPassthrough = isYouTube && !filterChain && !isLive;

            const threadQueueSize = process.env.THREAD_QUEUE_SIZE || '1024';
            const opusBitrate = bitrate || process.env.OPUS_BITRATE || '64k';
            const passThroughKb = parseInt(process.env.PASSTHROUGH_BUFFER_KB || '512', 10);
            const preBufferKb = parseInt(process.env.PRE_BUFFER_KB || '32', 10);
            const preBufferTimeoutMs = parseInt(process.env.PRE_BUFFER_TIMEOUT_MS || '200', 10);

            let ffmpegProc = null;
            const outputStream = new PassThrough({ highWaterMark: 1024 * passThroughKb });

            if (useDirectPassthrough) {
                console.log(`[CacheManager:Stream] Hybrid WebmOpus Direct Passthrough for "${track.title}" (Zero FFmpeg CPU | Seek: ${seekSeconds}s)`);
                outputStream.streamType = 'webm/opus';
                ytdlpProc.stdout.on('error', () => {});
                ytdlpProc.stdout.pipe(outputStream);
            } else {
                console.log(`[CacheManager:Stream] FFmpeg DSP Pipe for "${track.title}" (Filter: ${filter} | Vol: ${volume}% | Bitrate: ${opusBitrate} | Seek: ${seekSeconds}s)`);
                outputStream.streamType = 'ogg/opus';
                const ffmpegArgs = [
                    '-nostdin',
                    '-loglevel', 'error',
                    '-thread_queue_size', threadQueueSize
                ];
                // If seek was not already handled directly by yt-dlp download sections (e.g. SoundCloud)
                if (seekSeconds > 0 && !isYouTube) {
                    ffmpegArgs.push('-ss', seekSeconds.toString());
                }
                ffmpegArgs.push('-i', 'pipe:0', '-vn');
                if (filterChain) {
                    ffmpegArgs.push('-af', filterChain);
                }
                ffmpegArgs.push(
                    '-c:a', 'libopus',
                    '-b:a', opusBitrate,
                    '-vbr', 'on',
                    '-application', 'audio',
                    '-ar', '48000',
                    '-ac', '2',
                    '-f', 'opus',
                    'pipe:1'
                );

                ffmpegProc = spawn(this.ffmpegPath, ffmpegArgs, { windowsHide: true });

                // Prevent unhandled EPIPE errors
                ytdlpProc.stdout.on('error', () => {});
                ffmpegProc.stdin.on('error', () => {});
                ffmpegProc.stdout.on('error', () => {});

                // Pipe yt-dlp stdout into ffmpeg stdin
                ytdlpProc.stdout.pipe(ffmpegProc.stdin);
                ffmpegProc.stdout.pipe(outputStream);
            }

            let hasOutput = false;
            let isHandled = false;
            let stderrBuffer = '';
            let ffmpegStderr = '';
            let streamTimeout = null;
            let releaseTimer = null;

            ytdlpProc.stderr.on('data', (chunk) => {
                stderrBuffer += chunk.toString();
                if (stderrBuffer.length > 3000) stderrBuffer = stderrBuffer.slice(-3000);
            });

            if (ffmpegProc) {
                ffmpegProc.stderr.on('data', (chunk) => {
                    ffmpegStderr += chunk.toString();
                    if (ffmpegStderr.length > 2000) ffmpegStderr = ffmpegStderr.slice(-2000);
                });
            }

            // Combined kill helper for clean termination
            outputStream.kill = () => {
                safeReleaseSlot();
                if (streamTimeout) {
                    clearTimeout(streamTimeout);
                    streamTimeout = null;
                }
                if (releaseTimer) {
                    clearTimeout(releaseTimer);
                    releaseTimer = null;
                }
                try { ytdlpProc.kill('SIGKILL'); } catch {}
                if (ffmpegProc) {
                    try { ffmpegProc.kill('SIGKILL'); } catch {}
                }
                try { outputStream.destroy(); } catch {}
            };

            if (typeof onSpawn === 'function') {
                onSpawn(outputStream);
            }

            const triggerFallbackOrReject = async (reason, isBotBan = false) => {
                if (isHandled || hasOutput) return;
                isHandled = true;
                safeReleaseSlot();

                const activeProxy = proxyManager.getYouTubeProxy();
                if (activeProxy && !isFallback) {
                    proxyManager.reportFailure(activeProxy, reason);
                } else if (proxyManager.isVpnActive() && !isFallback) {
                    proxyManager.reportVpnFailure(reason);
                }

                if (isBotBan) {
                    youtubeCircuit.trip(reason);
                }

                if (streamTimeout) {
                    clearTimeout(streamTimeout);
                    streamTimeout = null;
                }
                if (releaseTimer) {
                    clearTimeout(releaseTimer);
                    releaseTimer = null;
                }
                outputStream.kill();

                if (!isFallback) {
                    console.log(`[CacheManager] Auto-switching to SoundCloud stream for: ${track.title}${isBotBan ? ' (Anti-Bot detected)' : ''}`);
                    try {
                        const fallbackStream = await this._trySoundCloudFallback(track, seekSeconds, volume, onSpawn, filter, bitrate);
                        return resolve(fallbackStream);
                    } catch (fbErr) {
                        return reject(new Error(`Stream failed: ${reason || fbErr.message}`));
                    }
                } else {
                    return reject(new Error(`Stream failed: ${reason || 'Playback failed'}`));
                }
            };

            let bufferedBytes = 0;
            const initialChunks = [];

            const releaseStream = () => {
                if (hasOutput || isHandled) return;
                hasOutput = true;
                isHandled = true;
                safeReleaseSlot();
                outputStream.off('data', onData);
                if (releaseTimer) {
                    clearTimeout(releaseTimer);
                    releaseTimer = null;
                }
                if (streamTimeout) {
                    clearTimeout(streamTimeout);
                    streamTimeout = null;
                }
                const activeProxy = proxyManager.getYouTubeProxy();
                if (activeProxy && !isFallback) {
                    proxyManager.reportSuccess(activeProxy, Date.now() - startTime);
                }
                track.realSource = isFallback ? 'SoundCloud (Bypass Fallback)' : (track.uri && track.uri.includes('soundcloud.com') ? 'SoundCloud (Direct)' : 'YouTube (Direct)');
                console.log(`[CacheManager:Stream] First audio buffer dispatched for "${track.title}" in ${Date.now() - startTime}ms (${bufferedBytes} bytes pre-buffered) | Real Source: ${track.realSource}`);
                outputStream.pause();
                for (let i = initialChunks.length - 1; i >= 0; i--) {
                    outputStream.unshift(initialChunks[i]);
                }
                resolve(outputStream);
            };

            const onData = (chunk) => {
                bufferedBytes += chunk.length;
                initialChunks.push(chunk);

                if (!releaseTimer) {
                    releaseTimer = setTimeout(releaseStream, preBufferTimeoutMs);
                    releaseTimer.unref();
                }

                if (bufferedBytes >= preBufferKb * 1024) {
                    releaseStream();
                }
            };

            outputStream.on('data', onData);

            // Handle premature failures
            ytdlpProc.on('error', async (err) => {
                console.error(`[CacheManager] yt-dlp error on "${track.title}":`, err.message);
                await triggerFallbackOrReject(err.message);
            });

            if (ffmpegProc) {
                ffmpegProc.on('error', async (err) => {
                    console.error(`[CacheManager] ffmpeg error on "${track.title}":`, err.message);
                    await triggerFallbackOrReject(err.message);
                });
            }

            ytdlpProc.on('close', async (code) => {
                if (code !== 0 && !hasOutput) {
                    const isBotBan = youtubeCircuit.constructor.isBotBlock(stderrBuffer);

                    console.warn(`[CacheManager] yt-dlp exited (code ${code})${isBotBan ? ' [YouTube Anti-Bot detected]' : ''}`);
                    if (stderrBuffer) {
                        console.warn(`[CacheManager yt-dlp stderr]:\n${stderrBuffer.trim()}`);
                    }
                    await triggerFallbackOrReject(stderrBuffer || `yt-dlp exit code ${code}`, isBotBan);
                }
            });

            if (ffmpegProc) {
                ffmpegProc.on('close', async (code) => {
                    if (!hasOutput) {
                        if (ffmpegStderr) {
                            console.warn(`[CacheManager ffmpeg stderr]:\n${ffmpegStderr.trim()}`);
                        }
                        await triggerFallbackOrReject(ffmpegStderr || `ffmpeg exit code ${code}`);
                    }
                });
            }

            // 12s primary timeout (fast failover instead of 30s)
            streamTimeout = setTimeout(async () => {
                if (!hasOutput && !isFallback) {
                    console.warn(`[CacheManager] Primary stream timed out (12s limit) for "${track.title}"`);
                    await triggerFallbackOrReject('Primary stream timed out');
                }
            }, 12000);
            streamTimeout.unref();
        });
    }

    _streamFromRemoteNode(node, track, seekSeconds = 0, volume = 100, onSpawn = null, filter = 'off', bitrate = '64k') {
        const http = require('http');
        return new Promise((resolve, reject) => {
            const identifier = track.identifier || crypto.createHash('md5').update(track.uri || '').digest('hex').slice(0, 20);
            const durationSec = track.duration || (track.length ? Math.round(track.length / 1000) : 0);
            const queryParams = new URLSearchParams({
                uri: track.uri,
                title: track.title || '',
                identifier: identifier,
                duration: String(durationSec),
                seek: String(seekSeconds),
                volume: String(volume),
                filter: String(filter),
                bitrate: String(bitrate)
            });

            const req = http.request({
                hostname: node.host,
                port: node.port || 2333,
                path: `/api/node/stream?${queryParams.toString()}`,
                method: 'GET',
                timeout: 12000,
                headers: {
                    'x-node-secret': process.env.NODE_AUTH_SECRET || ''
                }
            }, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Remote node ${node.id} responded with status ${res.statusCode}`));
                }

                res.streamType = (res.headers['content-type'] && res.headers['content-type'].includes('webm')) ? 'webm/opus' : 'ogg/opus';

                res.kill = () => {
                    try { req.destroy(); } catch {}
                };

                if (typeof onSpawn === 'function') {
                    onSpawn(res);
                }

                resolve(res);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Remote node ${node.id} stream connection timed out`));
            });

            req.on('error', (err) => {
                reject(err);
            });

            req.end();
        });
    }

    async _trySoundCloudFallback(track, seekSeconds = 0, volume = 100, onSpawn = null, filter = 'off', bitrate = '64k') {
        const fallbackQuery = this._getSoundCloudFallback(track);
        if (!fallbackQuery) {
            throw new Error('No valid fallback search query could be generated.');
        }
        return this._spawnPipedStream(track, fallbackQuery, seekSeconds, volume, true, onSpawn, filter, bitrate);
    }

    /**
     * Download and cache track on-disk.
     */
    async prepareTrack(track, isBackground = false, onSpawn = null) {
        const identifier = track.identifier || crypto.createHash('md5').update(track.uri || '').digest('hex').slice(0, 20);
        const trackHash = this.getTrackHash(identifier);
        const targetPath = this.getTrackPath(identifier);

        if (this.isCached(identifier)) {
            return targetPath;
        }

        // Proactive High-Watermark Check: ensure capacity is available before downloading
        this.cleanOldCache();

        // Memory Guard: Only applies to background pre-cache
        if (isBackground) {
            const mem = process.memoryUsage();
            if (mem.rss > 180 * 1024 * 1024) {
                if (global.gc) global.gc();
                console.warn('[CacheManager] High memory usage (>180MB). Skipping background pre-cache.');
                return targetPath;
            }
        }

        if (this.downloadPromises.has(trackHash)) {
            return this.downloadPromises.get(trackHash);
        }

        const priority = isBackground ? 'background' : 'interactive';
        let activeProc = null;
        let wasAborted = false;
        const abortHandler = (reason) => {
            wasAborted = true;
            if (activeProc) {
                console.warn(`[CacheManager:StreamGuard] Preempting background download for "${track.title}": ${reason}`);
                try { activeProc.kill('SIGTERM'); } catch {}
            }
        };

        const downloadPromise = (async () => {
            const releaseSlot = await this._acquireSpawnSlot(priority, isBackground ? abortHandler : null, track.title);
            try {
                this._ensureExecutable();
                const outTemplate = path.join(this.cacheDir, `${trackHash}.%(ext)s`);
            const isYouTube = !track.uri?.includes('soundcloud.com') && !track.uri?.startsWith('scsearch');

            // If circuit is open, download directly from SoundCloud
            if (isYouTube && youtubeCircuit.isOpen()) {
                const fallback = this._getSoundCloudFallback(track);
                if (fallback) {
                    const fbArgs = this._buildYtDlpArgs(fallback, false, outTemplate);
                    const fbBin = (isBackground && process.platform === 'linux') ? '/usr/bin/nice' : this.binPath;
                    const fbFinalArgs = (isBackground && process.platform === 'linux') ? ['-n', '19', this.binPath, ...fbArgs] : fbArgs;
                    await new Promise((resolve, reject) => {
                        const fbChild = execFile(fbBin, fbFinalArgs, { maxBuffer: 8 * 1024 * 1024, timeout: 35000, windowsHide: true }, (fbErr) => {
                            activeProc = null;
                            if (fbErr) return reject(fbErr);
                            resolve();
                        });
                        activeProc = fbChild;
                        if (typeof onSpawn === 'function') {
                            onSpawn({
                                kill: () => {
                                    try { fbChild.kill('SIGKILL'); } catch {}
                                }
                            });
                        }
                    });
                    track.realSource = 'SoundCloud (Bypass Fallback)';
                    if (fs.existsSync(targetPath)) return targetPath;
                }
            }

            const args = this._buildYtDlpArgs(track.uri, false, outTemplate);
            const activeProxy = isYouTube ? proxyManager.getYouTubeProxy() : null;
            const startTime = Date.now();
            const downloadTimeout = isBackground 
                ? parseInt(process.env.DOWNLOAD_TIMEOUT_BG_MS || '50000', 10) 
                : parseInt(process.env.DOWNLOAD_TIMEOUT_MS || '35000', 10);

            const execBin = (isBackground && process.platform === 'linux') ? '/usr/bin/nice' : this.binPath;
            const execArgs = (isBackground && process.platform === 'linux') ? ['-n', '19', this.binPath, ...args] : args;

            try {
                await new Promise((resolve, reject) => {
                    const child = execFile(execBin, execArgs, { maxBuffer: 8 * 1024 * 1024, timeout: downloadTimeout, windowsHide: true }, (err, stdout, stderr) => {
                        activeProc = null;
                        if (err) {
                            const errMsg = (stderr || '') + (err.message || '');
                            return reject(new Error(errMsg));
                        }
                        resolve();
                    });
                    activeProc = child;
                    if (typeof onSpawn === 'function') {
                        onSpawn({
                            kill: () => {
                                try { child.kill('SIGKILL'); } catch {}
                            }
                        });
                    }
                });
                if (activeProxy) {
                    proxyManager.reportSuccess(activeProxy, Date.now() - startTime);
                }
                track.realSource = track.uri && track.uri.includes('soundcloud.com') ? 'SoundCloud (Direct)' : 'YouTube (Direct)';
            } catch (err) {
                if (isBackground && (wasAborted || err.signal === 'SIGTERM' || err.killed)) {
                    console.log(`[CacheManager] Background pre-cache aborted for "${track.title}" (Yielded to interactive request).`);
                    return null;
                }

                if (activeProxy) {
                    proxyManager.reportFailure(activeProxy, err.message);
                }
                if (!wasAborted && youtubeCircuit.constructor.isBotBlock(err.message)) {
                    youtubeCircuit.trip(err.message);
                }
                // Try SoundCloud fallback download
                const fallback = this._getSoundCloudFallback(track);
                if (fallback && !track.uri.includes('soundcloud.com')) {
                    const fbArgs = this._buildYtDlpArgs(fallback, false, outTemplate);
                    const fbBin = (isBackground && process.platform === 'linux') ? '/usr/bin/nice' : this.binPath;
                    const fbFinalArgs = (isBackground && process.platform === 'linux') ? ['-n', '19', this.binPath, ...fbArgs] : fbArgs;
                    await new Promise((resolve, reject) => {
                        const fbChild = execFile(fbBin, fbFinalArgs, { maxBuffer: 8 * 1024 * 1024, timeout: 35000, windowsHide: true }, (fbErr) => {
                            activeProc = null;
                            if (fbErr) return reject(fbErr);
                            resolve();
                        });
                        activeProc = fbChild;
                        if (typeof onSpawn === 'function') {
                            onSpawn({
                                kill: () => {
                                    try { fbChild.kill('SIGKILL'); } catch {}
                                }
                            });
                        }
                    });
                    track.realSource = 'SoundCloud (Bypass Fallback)';
                    console.log(`[CacheManager] Track cached via SoundCloud: "${track.title}"`);
                } else {
                    throw err;
                }
            }

            if (fs.existsSync(targetPath)) {
                return targetPath;
            }
            throw new Error(`Cached file not found at ${targetPath}`);
        } finally {
            releaseSlot();
            this.downloadPromises.delete(trackHash);
            if (global.gc) global.gc();
            this.cleanOldCache();
        }
    })();

        this.downloadPromises.set(trackHash, downloadPromise);
        return downloadPromise;
    }

    /**
     * Proactive LRU Sweeper with High-Watermark (85%) & Active Stream Pinning:
     * Enforces strict disk quota (default 350MB) and never deletes currently active streams.
     */
    cleanOldCache(maxAgeHours = null) {
        try {
            if (!fs.existsSync(this.cacheDir)) return;
            const now = Date.now();
            const ageHours = maxAgeHours !== null 
                ? maxAgeHours 
                : parseFloat(process.env.CACHE_MAX_AGE_HOURS || '6');
            const maxAgeMs = ageHours * 60 * 60 * 1000;
            const files = fs.readdirSync(this.cacheDir);

            let totalSizeBytes = 0;
            const fileStats = [];

            for (const file of files) {
                if (!file.endsWith('.opus') && !file.endsWith('.webm') && !file.endsWith('.m4a') && !file.endsWith('.mp3')) continue;
                const fullPath = path.join(this.cacheDir, file);
                const fileIdentifier = path.basename(file, path.extname(file));

                try {
                    const stats = fs.statSync(fullPath);
                    const isPinned = this.isPinned(fileIdentifier);

                    // If file exceeded TTL and is not actively streaming, delete it
                    if (now - stats.mtimeMs > maxAgeMs && !isPinned) {
                        try { fs.unlinkSync(fullPath); } catch {}
                    } else {
                        totalSizeBytes += stats.size;
                        fileStats.push({
                            path: fullPath,
                            identifier: fileIdentifier,
                            size: stats.size,
                            mtime: stats.mtimeMs,
                            pinned: isPinned
                        });
                    }
                } catch {}
            }

            const maxMb = parseInt(process.env.CACHE_MAX_SIZE_MB || '350', 10);
            const maxCacheBytes = maxMb * 1024 * 1024;
            const highWatermarkBytes = Math.round(maxCacheBytes * 0.85); // 85% High Watermark
            const lowWatermarkBytes = Math.round(maxCacheBytes * 0.60); // 60% Low Watermark

            // If total cache size exceeds 85%, proactively evict unpinned files by LRU down to 60%
            if (totalSizeBytes > highWatermarkBytes) {
                fileStats.sort((a, b) => a.mtime - b.mtime);
                let evictedCount = 0;
                let evictedBytes = 0;

                for (const item of fileStats) {
                    if (totalSizeBytes <= lowWatermarkBytes) break;
                    if (item.pinned) continue; // NEVER delete actively playing tracks!

                    try {
                        fs.unlinkSync(item.path);
                        totalSizeBytes -= item.size;
                        evictedBytes += item.size;
                        evictedCount++;
                    } catch {}
                }
                if (evictedCount > 0) {
                    console.log(`[CacheManager:LRU] High-watermark reached (85%). Evicted ${evictedCount} unpinned files (${(evictedBytes / 1024 / 1024).toFixed(1)}MB). Remaining: ${(totalSizeBytes / 1024 / 1024).toFixed(1)}MB / ${maxMb}MB`);
                }
            }
        } catch (err) {
            console.error('[CacheManager] Cache cleanup error:', err.message);
        }
    }

    getCacheStats() {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                return { usedBytes: 0, usedMb: 0, maxMb: parseInt(process.env.CACHE_MAX_SIZE_MB || '350', 10), files: 0 };
            }
            const files = fs.readdirSync(this.cacheDir);
            let totalSizeBytes = 0;
            let fileCount = 0;
            for (const file of files) {
                if (file.endsWith('.opus') || file.endsWith('.m4a') || file.endsWith('.mp3')) {
                    try {
                        const stats = fs.statSync(path.join(this.cacheDir, file));
                        totalSizeBytes += stats.size;
                        fileCount++;
                    } catch {}
                }
            }
            const maxMb = parseInt(process.env.CACHE_MAX_SIZE_MB || '350', 10);
            return {
                usedBytes: totalSizeBytes,
                usedMb: Math.round(totalSizeBytes / (1024 * 1024)),
                maxMb,
                files: fileCount
            };
        } catch {
            return { usedBytes: 0, usedMb: 0, maxMb: 350, files: 0 };
        }
    }
    clearAllCache() {
        try {
            if (!fs.existsSync(this.cacheDir)) return { freedMb: 0, filesRemoved: 0 };
            const files = fs.readdirSync(this.cacheDir);
            let freedBytes = 0;
            let filesRemoved = 0;
            for (const file of files) {
                if (file.endsWith('.opus') || file.endsWith('.m4a') || file.endsWith('.mp3')) {
                    const fullPath = path.join(this.cacheDir, file);
                    try {
                        const stats = fs.statSync(fullPath);
                        freedBytes += stats.size;
                        fs.unlinkSync(fullPath);
                        filesRemoved++;
                    } catch {}
                }
            }
            return {
                freedMb: Math.round(freedBytes / (1024 * 1024)),
                filesRemoved
            };
        } catch (err) {
            console.error('[CacheManager] Error clearing cache:', err.message);
            return { freedMb: 0, filesRemoved: 0, error: err.message };
        }
    }
}

module.exports = new CacheManager();

const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    NoSubscriberBehavior,
    entersState, 
    StreamType 
} = require('@discordjs/voice');
const prism = require('prism-media');
const CacheManager = require('./CacheManager');
const settingsManager = require('./helpers/settingsManager');
const subscriptionManager = require('./billing/subscriptionManager');

class PlayerQueue extends Array {
    static get [Symbol.species]() {
        return Array;
    }

    constructor(player) {
        super();
        this.player = player;
        this.current = null;
        this.previous = null;
    }

    add(track) {
        if (Array.isArray(track)) {
            this.push(...track);
        } else {
            this.push(track);
        }
        this._triggerPreCache();
    }

    unshift(...items) {
        const result = super.unshift(...items);
        this._triggerPreCache();
        return result;
    }

    shift() {
        const result = super.shift();
        this._triggerPreCache();
        return result;
    }

    _triggerPreCache() {
        if (this.player && this.player._preCacheNextTrack) {
            this.player._preCacheNextTrack();
        }
    }

    clear() {
        this.length = 0;
    }

    shuffle() {
        for (let i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
    }

    remove(index) {
        if (index >= 0 && index < this.length) {
            return this.splice(index, 1)[0];
        }
        return null;
    }

    get totalSize() {
        return this.length + (this.current ? 1 : 0);
    }
}

class Player {
    constructor(manager, options) {
        this.manager = manager;
        this.guildId = options.guildId;
        this.voiceId = options.voiceId;
        this.textId = options.textId;
        this.volume = typeof options.volume === 'number' ? options.volume : settingsManager.getGuildVolume(this.guildId);
        this.loop = 'none'; // 'none' | 'track' | 'queue'
        this.autoplay = typeof options.autoplay === 'boolean' ? options.autoplay : settingsManager.getGuildAutoplay(this.guildId);
        const tier = subscriptionManager.getTierConfig(this.guildId);
        this.audioFilter = tier.audioFilter || 'off';
        this.playedHistory = new Set();
        this.recentArtists = [];
        this._preloadedAutoplayTrack = null;
        this._autoplayPreloadTimer = null;
        this.paused = false;
        this.playing = false;
        this.nowPlayingMessage = null;
        this._position = 0;
        this.playbackStartTime = 0;

        this.queue = new PlayerQueue(this);
        const maxMissedFrames = parseInt(process.env.MAX_MISSED_FRAMES || '350', 10);
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
                maxMissedFrames: maxMissedFrames
            }
        });
        this.connection = null;
        this.currentResource = null;
        this.currentProcess = null;
        this._playToken = 0;
        this._advancing = false;
        this._starting = false; // in-flight guard
        this._isSkipping = false;
        this._destroyed = false;
        this._isStopping = false;
        this.previousTracks = [];
        this._actionDebounceTimer = null;
        this._seekDebounceTimer = null;
        this._pendingSeekPosition = null;

        this._setupVoiceConnection(options);
        this._setupAudioPlayer();
        this.enforceTierLimits();
    }

    enforceTierLimits() {
        const isSupp = subscriptionManager.isSupporter(this.guildId);
        if (!isSupp) {
            if (this.autoplay) {
                this.autoplay = false;
                settingsManager.setGuildAutoplay(this.guildId, false);
                this._preloadedAutoplayTrack = null;
                if (this._autoplayPreloadTimer) {
                    clearTimeout(this._autoplayPreloadTimer);
                    this._autoplayPreloadTimer = null;
                }
            }
            if (this.audioFilter && this.audioFilter !== 'off') {
                this.audioFilter = 'off';
                subscriptionManager.setGuildAudioFilter(this.guildId, 'off');
                if (this.playing && this.queue.current) {
                    try { this.seek(this.position); } catch {}
                }
            }
            if (this.queue && this.queue.length > 10) {
                this.queue.splice(10);
            }
        }
        return isSupp;
    }

    _setupVoiceConnection(options) {
        const guild = this.manager.client.guilds.cache.get(this.guildId);
        if (!guild) return;

        this.connection = joinVoiceChannel({
            channelId: this.voiceId,
            guildId: this.guildId,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: options.deaf !== false
        });

        this.connection.subscribe(this.audioPlayer);

        this.connection.on('error', error => console.error(`[VoiceConnection ERROR] guild ${this.guildId}:`, error.message));

        entersState(this.connection, VoiceConnectionStatus.Ready, 20_000)
            .then(() => console.log(`[Player] Voice connection ready for guild ${this.guildId}`))
            .catch(err => console.error(`[Player] Voice connection error:`, err.message));

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                this.destroy();
            }
        });
    }

    _setupAudioPlayer() {
        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (this._destroyed || this._isStopping) return;
            if (newState.status === AudioPlayerStatus.Playing) {
                this.playing = true;
                this.paused = false;
                this.playbackStartTime = Date.now();
                console.log(`[Player] Audio playback started for: "${this.queue.current?.title}"`);
            } else if (newState.status === AudioPlayerStatus.Idle) {
                this.playing = false;
            }
        });

        this.audioPlayer.on(AudioPlayerStatus.Idle, async () => {
            if (this._destroyed || this._isStopping) return;
            if (this._starting) return;
            if (this._advancing) return;
            if (this._actionDebounceTimer) return;
            await this._advanceQueue();
        });

        this.audioPlayer.on('error', (error) => {
            if (this._destroyed || this._isStopping || this._starting || this._advancing) return;
            const msg = (error && error.message) ? error.message.toLowerCase() : '';
            if (msg.includes('aborted') || msg.includes('premature close') || msg.includes('destroyed')) {
                return;
            }
            console.error(`AudioPlayer error in guild ${this.guildId}:`, error.message);
            this.manager.emit('playerException', this, this.queue.current, error);
            this.skip();
        });
    }

    async _advanceQueue() {
        if (this._destroyed || this._isStopping || this._advancing) return;
        if (!this.connection) return;
        this._advancing = true;
        try {
            if (this._destroyed || this._isStopping || !this.connection) return;
            try { this.audioPlayer.stop(true); } catch {}
            if (this.currentProcess) {
                try { this.currentProcess.kill(); } catch {}
                this.currentProcess = null;
            }

            const isSkip = this._isSkipping;
            this._isSkipping = false;

            const finishedTrack = this.queue.current;
            this.playing = false;
            this._position = 0;

            if (finishedTrack) {
                this.queue.previous = finishedTrack;
                this.previousTracks.push(finishedTrack);
                if (this.previousTracks.length > 25) this.previousTracks.shift();
                this.manager.emit('playerEnd', this, finishedTrack);

                if (this._destroyed || this._isStopping || !this.connection) return;

                if (this.loop === 'track' && !isSkip) {
                    await this.playTrack(finishedTrack);
                    return;
                } else if (this.loop === 'queue' && !isSkip) {
                    this.queue.add(finishedTrack);
                }
            }

            if (this._destroyed || this._isStopping || !this.connection) return;

            this.enforceTierLimits();
            const isSupp = subscriptionManager.isSupporter(this.guildId);

            const referenceTrack = finishedTrack || this.queue.previous;
            if (this.queue.length > 0) {
                let nextTrack = this.queue.shift();
                while (nextTrack && !isSupp && (nextTrack.duration > 1800 || nextTrack.isStream)) {
                    console.log(`[Player] Skipping over-30min track "${nextTrack.title}" for Free tier.`);
                    nextTrack = this.queue.shift();
                }
                if (nextTrack) {
                    await this.playTrack(nextTrack);
                } else {
                    this.queue.current = null;
                    this.manager.emit('playerEmpty', this);
                }
            } else if (this.autoplay && isSupp && (this._preloadedAutoplayTrack || referenceTrack)) {
                let nextTrack = this._preloadedAutoplayTrack;
                this._preloadedAutoplayTrack = null;

                if (!nextTrack && referenceTrack) {
                    nextTrack = await this._findNextAutoplayTrack(referenceTrack);
                }

                if (this._destroyed || this._isStopping || !this.connection) return;

                if (nextTrack) {
                    console.log(`[Player] Autoplay playing next: "${nextTrack.title}" (${nextTrack.uri})`);
                    await this.playTrack(nextTrack);
                } else {
                    this.queue.current = null;
                    this.manager.emit('playerEmpty', this);
                }
            } else {
                this.queue.current = null;
                this.manager.emit('playerEmpty', this);
            }
        } catch (error) {
            console.error('[Player] Advance error:', error);
            this.manager.emit('playerException', this, this.queue.current, error);
        } finally {
            this._advancing = false;
        }
    }

    get position() {
        if (!this.playing || this.paused) return this._position || 0;
        return (this._position || 0) + (Date.now() - this.playbackStartTime);
    }

    set position(val) {
        this._position = val;
    }

    async play() {
        if (this._destroyed || this._isStopping || !this.connection || this.playing || this._starting || this._advancing) return;
        await this._advanceQueue();
    }

    _createBufferedResource(stream) {
        // High-capacity Opus demuxer buffer: buffers up to 250 Opus frames (~5-7s) in RAM (~180 KB)
        // Prevents audio stutter caused by the default tiny 16-frame buffer in @discordjs/voice
        const demuxer = new prism.opus.OggDemuxer({ readableHighWaterMark: 250 });
        stream.on('error', (err) => {
            try { demuxer.destroy(err); } catch {}
        });
        demuxer.on('error', (err) => {
            console.error('[AudioDemuxer] Demuxer stream error:', err.message);
        });

        const demuxed = stream.pipe(demuxer);
        demuxed.kill = () => {
            try {
                if (stream.kill) stream.kill();
                else if (stream.destroy) stream.destroy();
            } catch {}
            try { demuxer.destroy(); } catch {}
        };

        const resource = createAudioResource(demuxed, { inputType: StreamType.Opus, inlineVolume: true });
        if (resource.volume) {
            resource.volume.setVolume(Math.max(0, (this.volume ?? 100) / 100));
        }

        return {
            resource,
            stream: demuxed
        };
    }

    async playTrack(track) {
        if (this._destroyed || this._isStopping || !this.connection) return;
        const token = ++this._playToken;
        this._starting = true;
        try {
            this.queue.current = track;
            this._position = 0;
            this.playbackStartTime = Date.now();
            this.manager.emit('playerPrepare', this, track);
            if (track) {
                if (track.identifier) this.playedHistory.add(track.identifier);
                if (track.uri) this.playedHistory.add(track.uri);
                if (this.playedHistory.size > 50) {
                    const first = this.playedHistory.values().next().value;
                    this.playedHistory.delete(first);
                }
                const artistName = this._extractArtistName(track);
                if (artistName) {
                    this.recentArtists.push(artistName);
                    if (this.recentArtists.length > 5) {
                        this.recentArtists.shift();
                    }
                }
            }

            if (!this.connection) return;

            if (this.connection.state.status !== VoiceConnectionStatus.Ready) {
                await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
                if (this._destroyed || this._isStopping || token !== this._playToken || !this.connection) return;
            }

            const streamPrepStart = Date.now();
            console.log(`[Player] Preparing stream: "${track.title}" (Guild: ${this.guildId})`);

            try { this.audioPlayer.stop(true); } catch {}
            if (this.currentProcess) {
                try { this.currentProcess.kill(); } catch {}
                this.currentProcess = null;
            }

            if (this._destroyed || this._isStopping || token !== this._playToken || !this.connection) return;

            const nodeRouter = require('./cluster/NodeRouter');
            const isSupporter = subscriptionManager.isSupporter(this.guildId);
            if (!this.node || this.node.status !== 'online') {
                this.node = nodeRouter.selectBestNode(this.guildId, isSupporter);
            }

            // Direct real-time streaming with early process tracker
            const stream = await CacheManager.createTrackStream(
                track, 
                0, 
                100, 
                (proc) => {
                    if (this._destroyed || this._isStopping || token !== this._playToken || !this.connection) {
                        try { proc.kill(); } catch {}
                        return;
                    }
                    this.currentProcess = proc;
                },
                {
                    audioFilter: this.audioFilter || 'off',
                    bitrate: this.getBitrate(),
                    node: this.node
                }
            );

            if (this._destroyed || this._isStopping || token !== this._playToken || !this.connection) {
                if (stream && stream.kill) {
                    try { stream.kill(); } catch {}
                }
                return;
            }

            const buffered = this._createBufferedResource(stream);
            this.currentProcess = buffered.stream;
            const resource = buffered.resource;

            this.currentResource = resource;
            this.audioPlayer.play(resource);
            console.log(`[Player] Audio resource dispatched to voice channel in ${Date.now() - streamPrepStart}ms: "${track.title}"`);
            this.manager.emit('playerStart', this, track);
            this._preCacheNextTrack();
            this._scheduleAutoplayPreload(track);
        } catch (error) {
            if (this._destroyed || token !== this._playToken) return;
            console.error(`Failed to play track ${track.title}:`, error.message);
            this.manager.emit('playerException', this, track, error);
            this.playing = false;
            try { this.audioPlayer.stop(); } catch {}
        } finally {
            this._starting = false;
            if (!this._destroyed && !this._isStopping && token !== this._playToken && this.audioPlayer.state.status === AudioPlayerStatus.Idle && this.queue.length > 0) {
                this._advanceQueue().catch(() => {});
            }
        }
    }

    pause(pause = true) {
        if (pause) {
            this.audioPlayer.pause();
            this._position = this.position;
            this.paused = true;
        } else {
            this.audioPlayer.unpause();
            this.playbackStartTime = Date.now();
            this.paused = false;
        }
        return this.paused;
    }

    resume() {
        return this.pause(false);
    }

    skip() {
        if (this._destroyed || !this.connection) return false;

        // Stop current playing stream immediately to silence audio
        this._playToken++;
        this._advancing = false;
        if (this.currentProcess) {
            try { this.currentProcess.kill(); } catch {}
            this.currentProcess = null;
        }
        try { this.audioPlayer.stop(true); } catch {}
        this.playing = false;

        // Archive current track into previousTracks stack
        if (this.queue.current) {
            this.previousTracks.push(this.queue.current);
            if (this.previousTracks.length > 30) this.previousTracks.shift();
            this.queue.previous = this.queue.current;
        }

        // Shift next track in memory immediately
        const isSupp = subscriptionManager.isSupporter(this.guildId);
        let nextTrack = null;
        while (this.queue.length > 0) {
            const candidate = this.queue.shift();
            if (!isSupp && (candidate.duration > 1800 || candidate.isStream)) {
                console.log(`[Player] Skipping over-30min track "${candidate.title}" for Free tier.`);
                continue;
            }
            nextTrack = candidate;
            break;
        }

        this.queue.current = nextTrack;

        // Debounce actual playback start across 250ms to handle rapid clicking/spamming
        if (this._actionDebounceTimer) {
            clearTimeout(this._actionDebounceTimer);
        }

        return new Promise((resolve) => {
            this._actionDebounceTimer = setTimeout(async () => {
                this._actionDebounceTimer = null;
                if (this._destroyed || this._isStopping || !this.connection) {
                    return resolve(false);
                }

                if (this.queue.current) {
                    await this.playTrack(this.queue.current);
                    resolve(true);
                } else if (this.autoplay && isSupp) {
                    const refTrack = this.queue.previous;
                    let autoTrack = this._preloadedAutoplayTrack;
                    this._preloadedAutoplayTrack = null;
                    if (!autoTrack && refTrack) {
                        autoTrack = await this._findNextAutoplayTrack(refTrack);
                    }
                    if (autoTrack && !this._destroyed && !this._isStopping) {
                        console.log(`[Player] Autoplay playing next: "${autoTrack.title}" (${autoTrack.uri})`);
                        await this.playTrack(autoTrack);
                        resolve(true);
                    } else {
                        this.queue.current = null;
                        this.manager.emit('playerEmpty', this);
                        resolve(false);
                    }
                } else {
                    this.queue.current = null;
                    this.manager.emit('playerEmpty', this);
                    resolve(false);
                }
            }, 250);
        });
    }

    stop() {
        if (this._destroyed) return;
        this._isStopping = true;
        if (this._actionDebounceTimer) {
            clearTimeout(this._actionDebounceTimer);
            this._actionDebounceTimer = null;
        }
        if (this._seekDebounceTimer) {
            clearTimeout(this._seekDebounceTimer);
            this._seekDebounceTimer = null;
        }
        this._pendingSeekPosition = null;
        if (this._actionDebounceTimer) {
            clearTimeout(this._actionDebounceTimer);
            this._actionDebounceTimer = null;
        }
        if (this._seekDebounceTimer) {
            clearTimeout(this._seekDebounceTimer);
            this._seekDebounceTimer = null;
        }
        this._pendingSeekPosition = null;

        if (this._preCacheTimer) {
            clearTimeout(this._preCacheTimer);
            this._preCacheTimer = null;
        }
        if (this._autoplayPreloadTimer) {
            clearTimeout(this._autoplayPreloadTimer);
            this._autoplayPreloadTimer = null;
        }
        this._preloadedAutoplayTrack = null;
        this._isSkipping = false;
        this._playToken++;
        this.playing = false;
        this.paused = false;
        if (this.currentProcess) {
            try { this.currentProcess.kill(); } catch {}
            this.currentProcess = null;
        }
        this.queue.clear();
        this.queue.current = null;
        try {
            this.audioPlayer.stop(true);
        } catch {}
        setTimeout(() => {
            if (!this._destroyed) {
                this._isStopping = false;
            }
        }, 500);
    }

    getBitrate() {
        const tier = subscriptionManager.getTierConfig(this.guildId);
        return tier.bitrate || '128k';
    }

    setFilter(filter) {
        if (!subscriptionManager.isSupporter(this.guildId)) {
            this.audioFilter = 'off';
            subscriptionManager.setGuildAudioFilter(this.guildId, 'off');
            return 'off';
        }
        this.audioFilter = filter || 'off';
        subscriptionManager.setGuildAudioFilter(this.guildId, this.audioFilter);
        if (this.playing && this.queue.current) {
            this.seek(this.position);
        }
        return this.audioFilter;
    }

    setVolume(volume) {
        this.volume = volume;
        settingsManager.setGuildVolume(this.guildId, volume);
        if (this.currentResource && this.currentResource.volume) {
            this.currentResource.volume.setVolume(Math.max(0, volume / 100));
            return;
        }
        if (this.playing && this.queue.current) {
            this.seek(this.position);
        }
    }

    setLoop(mode) {
        this.loop = mode;
        return this.loop;
    }

    cycleLoop() {
        if (this.loop === 'none') this.loop = 'track';
        else if (this.loop === 'track') this.loop = 'queue';
        else this.loop = 'none';
        return this.loop;
    }

    playPrevious() {
        if (this._destroyed || !this.connection) return false;

        const hasHistory = this.previousTracks && this.previousTracks.length > 0;
        const fallbackPrev = this.queue.previous;
        if (!hasHistory && !fallbackPrev) return false;

        // Stop current playing stream immediately to silence audio
        this._playToken++;
        this._advancing = false;
        if (this.currentProcess) {
            try { this.currentProcess.kill(); } catch {}
            this.currentProcess = null;
        }
        try { this.audioPlayer.stop(true); } catch {}
        this.playing = false;

        // Push current track back to the front of queue so user can skip forward again
        if (this.queue.current) {
            this.queue.unshift(this.queue.current);
        }

        // Pop the previous track from history stack
        const prevTrack = hasHistory ? this.previousTracks.pop() : fallbackPrev;
        this.queue.current = prevTrack;
        this.queue.previous = this.previousTracks.length > 0 ? this.previousTracks[this.previousTracks.length - 1] : null;

        // Debounce actual playback start across 250ms to handle rapid clicking/spamming
        if (this._actionDebounceTimer) {
            clearTimeout(this._actionDebounceTimer);
        }

        return new Promise((resolve) => {
            this._actionDebounceTimer = setTimeout(async () => {
                this._actionDebounceTimer = null;
                if (this._destroyed || this._isStopping || !this.connection) {
                    return resolve(false);
                }

                if (this.queue.current) {
                    await this.playTrack(this.queue.current);
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 250);
        });
    }

    _scheduleAutoplayPreload(currentTrack) {
        if (this._autoplayPreloadTimer) {
            clearTimeout(this._autoplayPreloadTimer);
            this._autoplayPreloadTimer = null;
        }

        if (this._destroyed || this._isStopping || !this.connection || !this.autoplay || !subscriptionManager.isSupporter(this.guildId) || this.queue.length > 0) return;

        // Pre-fetch next autoplay song in background 3 seconds after playback starts
        this._autoplayPreloadTimer = setTimeout(async () => {
            if (this._destroyed || this._isStopping || !this.connection || !this.autoplay || !subscriptionManager.isSupporter(this.guildId) || this.queue.length > 0 || this._preloadedAutoplayTrack) return;
            try {
                console.log(`[Player:Autoplay] Pre-fetching next song in background for: "${currentTrack.title}"`);
                const track = await this._findNextAutoplayTrack(currentTrack);
                if (this._destroyed || this._isStopping || !this.connection) return;
                if (track && this.autoplay && this.queue.length === 0) {
                    this._preloadedAutoplayTrack = track;
                    console.log(`[Player:Autoplay] Pre-cached candidate ready: "${track.title}" (${track.uri})`);
                    const streamMode = (process.env.STREAM_MODE || 'auto').toLowerCase().trim();
                    if (streamMode !== 'pipe') {
                        this._triggerNodePrecache(track);
                    }
                }
            } catch (err) {
                console.warn('[Player:Autoplay] Preload failed:', err.message);
            }
        }, 3000);
    }

    _extractArtistName(track) {
        if (!track) return '';
        const title = (track.title || '').replace(/\[.*?\]|\(.*?\)|【.*?】|「.*?」|MV|Official.*$/gi, '').trim();
        const parts = title.split(/[-–—|]/).map(p => p.trim()).filter(Boolean);
        if (parts.length > 1) {
            if (parts[0].length <= 35 && !/^(เพลง|official|audio|mv|live|lyric)/i.test(parts[0])) {
                return parts[0].toLowerCase();
            }
            if (parts[1].length <= 35) {
                return parts[1].toLowerCase();
            }
        }
        if (track.author) {
            const clean = track.author.replace(/[-_]topic|official|channel|vevo|records?|music/gi, '').trim();
            if (clean.length >= 2) return clean.toLowerCase();
        }
        return '';
    }

    async _findNextAutoplayTrack(lastTrack) {
        try {
            const ytMatch = (lastTrack.uri || '').match(/(?:v=|\/embed\/|\/17\/|\/v\/|https:\/\/youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
            const videoId = lastTrack.identifier && lastTrack.identifier.length === 11 
                ? lastTrack.identifier 
                : (ytMatch ? ytMatch[1] : null);

            let candidates = [];

            // Tier 1: YouTube Official Radio Mix (list=RD<videoId>)
            if (videoId) {
                const radioUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
                console.log(`[Player:Autoplay] Fetching YouTube Radio Mix for: "${lastTrack.title}" (${videoId})`);
                const res = await this.manager.search(radioUrl, {
                    requester: lastTrack.requester || this.manager.client?.user,
                    forcePlaylist: true,
                    limit: 15
                });
                if (res && res.tracks && res.tracks.length > 0) {
                    candidates = res.tracks;
                }
            }

            // Tier 2: Keyword search fallback if Radio Mix failed or non-YouTube
            if (candidates.length === 0) {
                const cleanTitle = (lastTrack.title || '')
                    .replace(/\[.*?\]|\(.*?\)|【.*?】|MV|Official|Music Video|Audio|Lyrics/gi, '')
                    .replace(/[|/\\#~!?@$%^&*_+<>{}=]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                const cleanAuthor = (lastTrack.author || '')
                    .replace(/- topic|official|channel|vevo/gi, '')
                    .trim();

                const query = cleanAuthor ? `${cleanAuthor} song` : `${cleanTitle} music`;
                console.log(`[Player:Autoplay] Fallback keyword search: "${query}"`);
                const res = await this.manager.search(query, {
                    requester: lastTrack.requester || this.manager.client?.user
                });
                if (res && res.tracks) {
                    candidates = res.tracks;
                }
            }

            // Filter out: current track, recently played tracks, tracks already in queue
            const isFresh = (t) => {
                if (!t) return false;
                if (t.identifier === lastTrack.identifier || t.uri === lastTrack.uri) return false;
                if (t.identifier && this.playedHistory.has(t.identifier)) return false;
                if (t.uri && this.playedHistory.has(t.uri)) return false;
                if (this.queue.some(q => (q.identifier && q.identifier === t.identifier) || q.uri === t.uri)) return false;
                return true;
            };

            const freshCandidates = candidates.filter(isFresh);
            if (freshCandidates.length === 0) return null;

            // Prioritize different artist to preserve musical tone while preventing same artist repetition
            const lastArtist = this._extractArtistName(lastTrack);
            const isDiverseArtist = (t) => {
                const tArtist = this._extractArtistName(t);
                const titleLower = (t.title || '').toLowerCase();
                const authorLower = (t.author || '').toLowerCase();

                // 1. Must not match current/last track artist
                if (lastArtist && (titleLower.includes(lastArtist) || authorLower.includes(lastArtist))) {
                    return false;
                }
                if (tArtist && lastArtist && (tArtist.includes(lastArtist) || lastArtist.includes(tArtist))) {
                    return false;
                }

                // 2. Must not be in recent 3 artists
                for (const recent of this.recentArtists.slice(-3)) {
                    if (recent && (titleLower.includes(recent) || authorLower.includes(recent))) {
                        return false;
                    }
                }
                return true;
            };

            const diverseCandidates = freshCandidates.filter(isDiverseArtist);

            // Pick randomly from top 3 diverse candidates for natural radio flow
            if (diverseCandidates.length > 0) {
                const pool = diverseCandidates.slice(0, 3);
                const selected = pool[Math.floor(Math.random() * pool.length)];
                console.log(`[Player:Autoplay] Selected diverse artist track: "${selected.title}" (Genre matched, artist diversified)`);
                return selected;
            }

            // Fallback: Pick top fresh candidate if diversity pool is empty
            console.log(`[Player:Autoplay] Falling back to fresh candidate: "${freshCandidates[0].title}"`);
            return freshCandidates[0];
        } catch (err) {
            console.warn('[Player] Autoplay search failed:', err.message);
        }
        return null;
    }

    seekBy(deltaMs) {
        if (!this.queue.current || this._destroyed || this._isStopping) return;
        const currentBase = this._pendingSeekPosition !== null ? this._pendingSeekPosition : this.position;
        const maxDuration = this.queue.current.length || (this.queue.current.duration ? this.queue.current.duration * 1000 : Infinity);
        const targetPos = Math.max(0, Math.min(currentBase + deltaMs, maxDuration > 0 && maxDuration !== Infinity ? maxDuration - 1000 : Infinity));
        return this.seek(targetPos);
    }

    seek(positionMs) {
        if (!this.queue.current || this._destroyed || this._isStopping) return;
        this._pendingSeekPosition = Math.max(0, positionMs);
        this.position = this._pendingSeekPosition;

        if (this._seekDebounceTimer) {
            clearTimeout(this._seekDebounceTimer);
        }

        return new Promise((resolve) => {
            this._seekDebounceTimer = setTimeout(async () => {
                this._seekDebounceTimer = null;
                const finalPos = this._pendingSeekPosition;
                this._pendingSeekPosition = null;
                try {
                    await this._executeSeek(finalPos !== null ? finalPos : positionMs);
                } catch (err) {
                    console.error('[Player] Seek error:', err.message);
                }
                resolve();
            }, 300);
        });
    }

    async _executeSeek(positionMs) {
        if (!this.queue.current || this._destroyed || this._isStopping) return;
        const token = ++this._playToken;
        this._starting = true;
        try {
            try { this.audioPlayer.stop(true); } catch {}
            if (this.currentProcess) {
                try { this.currentProcess.kill(); } catch {}
                this.currentProcess = null;
            }

            const seekSeconds = Math.max(0, Math.floor(positionMs / 1000));
            const stream = await CacheManager.createTrackStream(
                this.queue.current, 
                seekSeconds, 
                100, 
                (proc) => {
                    if (this._destroyed || this._isStopping || token !== this._playToken) {
                        try { proc.kill(); } catch {}
                        return;
                    }
                    this.currentProcess = proc;
                },
                {
                    audioFilter: this.audioFilter || 'off',
                    bitrate: this.getBitrate(),
                    node: this.node
                }
            );

            if (this._destroyed || this._isStopping || token !== this._playToken || !this.connection) {
                if (stream && stream.kill) try { stream.kill(); } catch {}
                return;
            }

            const buffered = this._createBufferedResource(stream);
            this.currentProcess = buffered.stream;
            const resource = buffered.resource;

            this.currentResource = resource;
            this.position = positionMs;
            this.playbackStartTime = Date.now();
            this.audioPlayer.play(resource);
        } catch (error) {
            console.error('[Player] Seek error:', error.message);
        } finally {
            this._starting = false;
        }
    }

    _preCacheNextTrack() {
        if (this._destroyed || this._isStopping || !this.connection) return;
        const streamMode = (process.env.STREAM_MODE || 'auto').toLowerCase().trim();
        if (streamMode === 'pipe') return;

        if (this._preCacheTimer) {
            clearTimeout(this._preCacheTimer);
            this._preCacheTimer = null;
        }

        // Delay pre-caching by 8s so current track playback stabilizes first
        this._preCacheTimer = setTimeout(() => {
            if (this._destroyed || this._isStopping || !this.connection) return;
            // Pre-cache only if RAM usage is healthy (<150MB) and player is still active
            const mem = process.memoryUsage();
            if (mem.rss > 150 * 1024 * 1024) return;

            if (this.queue.length > 0 && this.playing) {
                const nextTrack = this.queue[0];
                this._triggerNodePrecache(nextTrack);
            }
        }, 8000);
    }

    _triggerNodePrecache(track) {
        if (!track || !track.uri) return;
        const identifier = track.identifier || Buffer.from(track.uri).toString('hex').slice(0, 20);
        if (this.node && this.node.type === 'remote' && this.node.status === 'online') {
            const http = require('http');
            const q = new URLSearchParams({
                uri: track.uri,
                identifier: identifier,
                title: track.title || ''
            });
            const req = http.request({
                hostname: this.node.host,
                port: this.node.port || 2333,
                path: `/api/node/precache?${q.toString()}`,
                method: 'POST',
                timeout: 5000,
                headers: {
                    'x-node-secret': process.env.NODE_AUTH_SECRET || ''
                }
            });
            req.on('error', () => {});
            req.end();
        } else if (!CacheManager.isCached(identifier)) {
            CacheManager.prepareTrack(track, true).catch(() => {});
        }
    }

    destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this._isStopping = true;
        this.playing = false;
        this.paused = false;
        this._playToken++;

        if (this._actionDebounceTimer) {
            clearTimeout(this._actionDebounceTimer);
            this._actionDebounceTimer = null;
        }
        if (this._seekDebounceTimer) {
            clearTimeout(this._seekDebounceTimer);
            this._seekDebounceTimer = null;
        }
        this._pendingSeekPosition = null;

        if (this._preCacheTimer) {
            clearTimeout(this._preCacheTimer);
            this._preCacheTimer = null;
        }
        if (this._autoplayPreloadTimer) {
            clearTimeout(this._autoplayPreloadTimer);
            this._autoplayPreloadTimer = null;
        }
        this._preloadedAutoplayTrack = null;
        this._isSkipping = false;

        this.queue.clear();
        this.queue.current = null;
        this.queue.previous = null;

        if (this.currentProcess) {
            try { this.currentProcess.kill(); } catch {}
            this.currentProcess = null;
        }

        if (this.audioPlayer) {
            try {
                this.audioPlayer.removeAllListeners();
                this.audioPlayer.stop(true);
            } catch {}
        }

        if (this.nowPlayingMessage) {
            try { this.nowPlayingMessage.delete().catch(() => {}); } catch {}
            this.nowPlayingMessage = null;
        }

        if (this.connection) {
            try {
                this.connection.removeAllListeners();
                this.connection.destroy();
            } catch {}
            this.connection = null;
        }

        if (this.manager && this.manager.players) {
            this.manager.players.delete(this.guildId);
        }

        if (global.gc) global.gc();
    }
}

module.exports = Player;

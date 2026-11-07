const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

class YouTubeCircuit {
    constructor() {
        this.openUntil = 0;
        this.cooldownMs = parseInt(process.env.YT_CIRCUIT_COOLDOWN_MS || '600000', 10); // default 10 minutes
        this.lastReason = null;
        this.lastTripTime = 0;
        this._probing = false;
        this._probeInterval = null;
        this._isRotatingVpn = false;
        this._lastRotateTime = 0;
        this._consecutiveRotationFailures = 0;
        this._rotationBackoffUntil = 0;
        this._autoRotateVpn = process.env.AUTO_ROTATE_VPN !== 'false';
        this.binPath = path.resolve(__dirname, process.platform === 'win32' ? '../../bin/yt-dlp.exe' : '../../bin/yt-dlp');
    }

    isOpen() {
        return Date.now() < this.openUntil;
    }

    trip(reason = 'Anti-Bot detected') {
        const cleanReason = (reason || 'Anti-Bot block').toString().slice(0, 100);
        this.lastReason = cleanReason;
        this.lastTripTime = Date.now();
        this.openUntil = Date.now() + this.cooldownMs;
        console.warn(`[YouTubeCircuit] Circuit OPEN (Bypassing YouTube to SoundCloud for ${Math.round(this.cooldownMs / 60000)}m) - ${cleanReason}`);

        // Reactive Auto-Rotation: If VPN is active and auto-rotation is enabled, trigger background failover
        if (this._autoRotateVpn && process.platform === 'linux') {
            this._scheduleVpnRotation(cleanReason);
        }
    }

    reset() {
        if (this.openUntil !== 0) {
            console.log('[YouTubeCircuit] Circuit CLOSED (YouTube unblocked/recovered).');
        }
        this.openUntil = 0;
        this.lastReason = null;
        this._consecutiveRotationFailures = 0;
        this._rotationBackoffUntil = 0;
    }

    static isBotBlock(text) {
        if (!text) return false;
        const str = typeof text === 'string' ? text : text.toString();
        return /Sign in to confirm|not a bot|unusual traffic|HTTP Error 429|HTTP Error 403|Forbidden|captcha/i.test(str);
    }

    _scheduleVpnRotation(reason) {
        if (this._isRotatingVpn) {
            return;
        }

        const now = Date.now();
        if (now < this._rotationBackoffUntil) {
            console.log(`[YouTubeCircuit:AutoRotate] In rotation backoff until ${new Date(this._rotationBackoffUntil).toLocaleTimeString()}. Skipping.`);
            return;
        }

        if (now - this._lastRotateTime < 40000) {
            console.log(`[YouTubeCircuit:AutoRotate] Rate-limited: Last rotation was ${Math.round((now - this._lastRotateTime) / 1000)}s ago. Skipping.`);
            return;
        }

        setTimeout(() => {
            this._executeVpnRotation(reason).catch((err) => {
                console.error('[YouTubeCircuit:AutoRotate] Unhandled error during rotation:', err.message);
            });
        }, 1000).unref();
    }

    async _executeVpnRotation(reason) {
        if (this._isRotatingVpn) return;
        this._isRotatingVpn = true;
        this._lastRotateTime = Date.now();

        try {
            const proxyManager = require('./proxyManager');
            if (!proxyManager.isVpnActive()) {
                console.log('[YouTubeCircuit:AutoRotate] VPN is not currently active. Skipping rotation.');
                return;
            }

            console.warn(`[YouTubeCircuit:AutoRotate] YouTube blocked on VPN (${reason}). Auto-switching to next ProtonVPN server...`);
            const res = await proxyManager.switchVpnServer('next');

            if (!res || !res.ok) {
                this._consecutiveRotationFailures++;
                console.warn(`[YouTubeCircuit:AutoRotate] VPN switch failed (${this._consecutiveRotationFailures}/3): ${res?.reason || 'Unknown'}`);
                if (this._consecutiveRotationFailures >= 3) {
                    this._rotationBackoffUntil = Date.now() + 600000;
                    console.warn('[YouTubeCircuit:AutoRotate] 3 consecutive VPN rotation failures. Backing off for 10 minutes.');
                }
                return;
            }

            console.log(`[YouTubeCircuit:AutoRotate] Switched to server "${res.server}" (Tun IP: ${res.ip}). Waiting 2s for routes to settle...`);
            await new Promise(r => setTimeout(r, 2000));

            // Test if YouTube works on the fresh VPN IP
            const testOk = await this._quickTestYouTube();
            if (testOk) {
                console.log(`[YouTubeCircuit:AutoRotate] YouTube test PASSED on server "${res.server}"! Auto-resetting Circuit Breaker.`);
                this.reset();
            } else {
                this._consecutiveRotationFailures++;
                console.warn(`[YouTubeCircuit:AutoRotate] Server "${res.server}" is also restricted by YouTube (${this._consecutiveRotationFailures}/3). Staying on fallback.`);
                if (this._consecutiveRotationFailures >= 3) {
                    this._rotationBackoffUntil = Date.now() + 600000;
                }
            }
        } catch (err) {
            console.error('[YouTubeCircuit:AutoRotate] Rotation execution error:', err.message);
        } finally {
            this._isRotatingVpn = false;
        }
    }

    async _quickTestYouTube(customNetArgs = null) {
        try {
            const proxyManager = require('./proxyManager');
            const netArgs = customNetArgs || proxyManager.getNetworkArgs();
            if (process.platform !== 'win32' && fs.existsSync(this.binPath)) {
                try { fs.chmodSync(this.binPath, 0o755); } catch {}
            }

            const args = [
                '--no-warnings',
                '--socket-timeout', '6',
                '--no-playlist',
                ...netArgs,
                '-g',
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            ];

            return new Promise((resolve) => {
                execFile(this.binPath, args, { timeout: 8000, windowsHide: true }, (err, stdout) => {
                    if (err) return resolve(false);
                    const out = (stdout || '').trim();
                    resolve(out.startsWith('http'));
                });
            });
        } catch {
            return false;
        }
    }

    startProbe(binPath, getProxyFn) {
        if (this._probeInterval) return;

        // Run non-blocking probe on startup
        setTimeout(() => {
            this._runProbe().catch(() => {});
        }, 1500);

        // Run probe periodically every cooldown interval
        this._probeInterval = setInterval(() => {
            if (this.isOpen()) {
                this._runProbe().catch(() => {});
            }
        }, this.cooldownMs);
        this._probeInterval.unref();
    }

    async _runProbe() {
        if (this._probing) return;
        this._probing = true;
        try {
            const testOk = await this._quickTestYouTube();
            if (testOk) {
                this.reset();
            } else {
                this.trip('Startup/Probe check failed');
            }
        } catch (err) {
            this.trip('Probe error: ' + err.message);
        } finally {
            this._probing = false;
        }
    }

    getStatus() {
        const open = this.isOpen();
        const remainingMs = Math.max(0, this.openUntil - Date.now());
        const remainingMin = Math.ceil(remainingMs / 60000);
        return {
            isOpen: open,
            status: open ? `Open (Bypass Active, retry in ${remainingMin}m)` : 'Closed (YouTube Active)',
            lastReason: this.lastReason,
            remainingMinutes: remainingMin,
            isRotatingVpn: this._isRotatingVpn,
            autoRotateVpn: this._autoRotateVpn
        };
    }
}

module.exports = new YouTubeCircuit();


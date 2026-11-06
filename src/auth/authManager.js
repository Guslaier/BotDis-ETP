const crypto = require('crypto');

class AuthManager {
    constructor() {
        this.secret = process.env.AUTH_SECRET || 'goolix_default_cluster_auth_secret_2026';
        this.nodeSecret = process.env.NODE_AUTH_SECRET || 'goolix_node_worker_secret_key';
        this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
        this.adminPassword = process.env.ADMIN_PASSWORD || 'goolix_admin_pass';

        this.loginAttempts = new Map(); // ip -> { count, lockedUntil }
    }

    _cleanIp(ip) {
        if (!ip) return '127.0.0.1';
        return ip.replace('::ffff:', '');
    }

    isIpRateLimited(ip) {
        const clean = this._cleanIp(ip);
        const record = this.loginAttempts.get(clean);
        if (!record) return false;
        if (record.lockedUntil && Date.now() < record.lockedUntil) {
            return true;
        }
        if (record.lockedUntil && Date.now() >= record.lockedUntil) {
            this.loginAttempts.delete(clean);
            return false;
        }
        return false;
    }

    recordFailedLogin(ip) {
        const clean = this._cleanIp(ip);
        const record = this.loginAttempts.get(clean) || { count: 0, lockedUntil: null };
        record.count++;
        if (record.count >= 5) {
            record.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes lock
            console.warn(`[AuthManager] IP ${clean} locked out for 5 minutes due to 5 failed logins.`);
        }
        this.loginAttempts.set(clean, record);
    }

    resetLoginAttempts(ip) {
        const clean = this._cleanIp(ip);
        this.loginAttempts.delete(clean);
    }

    verifyAdminCredentials(username, password, ip) {
        if (this.isIpRateLimited(ip)) {
            return { success: false, reason: 'RATE_LIMITED' };
        }

        const validUser = (username === this.adminUsername);
        const validPass = (password === this.adminPassword);

        if (validUser && validPass) {
            this.resetLoginAttempts(ip);
            const token = this.generateSessionToken(username);
            return { success: true, token };
        }

        this.recordFailedLogin(ip);
        return { success: false, reason: 'INVALID_CREDENTIALS' };
    }

    generateSessionToken(username) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
            sub: username,
            role: 'admin',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 3600) // 24 hours
        })).toString('base64url');

        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        return `${header}.${payload}.${signature}`;
    }

    verifySessionToken(token) {
        if (!token || typeof token !== 'string') return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;
        const expectedSig = crypto
            .createHmac('sha256', this.secret)
            .update(`${header}.${payload}`)
            .digest('base64url');

        if (signature !== expectedSig) return null;

        try {
            const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (data.exp && Date.now() / 1000 > data.exp) {
                return null; // Expired
            }
            return data;
        } catch {
            return null;
        }
    }

    verifyNodeSecret(req) {
        const nodeKey = req.headers['x-node-secret'] || '';
        return nodeKey === this.nodeSecret;
    }
}

module.exports = new AuthManager();

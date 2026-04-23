/**
 * LootLocker Integration for Seeker Go
 * Reference implementation with offline queuing
 */

class LootLockerService {
    constructor() {
        this.apiKey = window.LOOTLOCKER_APsI_KEY || "dev_c5adaa99b89344599c92f2f0e535f96a";
        this.domainKey = "jgzdbwyc";
        this.baseUrl = "https://jgzdbwyc.api.lootlocker.io/game";
        this.sessionToken = null;
        this.playerIdentifier = localStorage.getItem('ll_player_identifier') || crypto.randomUUID();
        localStorage.setItem('ll_player_identifier', this.playerIdentifier);
        this.leaderboardKey = "33850";
        this.isOnline = false;

        // Restore session if available
        const cached = localStorage.getItem('ll_session_token');
        if (cached) {
            this.sessionToken = cached;
            this.isOnline = true;
        }
    }

    async startSession() {
        if (this.sessionToken) {
            console.log("LootLocker: Reusing cached session token");
            this.isOnline = true;
            this.processOfflineQueue();
            return { ok: true, session_token: this.sessionToken, player_id: this.playerIdentifier };
        }

        try {
            console.log("Trying to start session for lootlocekr")
            const response = await fetch(`${this.baseUrl}/v2/session/guest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-domain-key': this.domainKey
                },
                body: JSON.stringify({
                    game_key: this.apiKey,
                    game_version: "1.0.0.0",
                    player_identifier: this.playerIdentifier,
                })
            });

            const data = await response.json();
            if (!data.session_token) throw new Error("No session token: " + JSON.stringify(data));

            this.sessionToken = data.session_token;
            localStorage.setItem('ll_session_token', this.sessionToken);
            this.isOnline = true;
            console.log("LootLocker: Session started", data);

            // Sync player name if available
            const name = localStorage.getItem('player_name');
            if (name) this.setPlayerName(name);

            this.processOfflineQueue();
            return { ok: true, ...data };
        } catch (e) {
            this.isOnline = false;
            console.warn("LootLocker: Offline / session failed", e);
            return { ok: false, error: e.message };
        }
    }

    async ensureSession() {
        if (!this.sessionToken) await this.startSession();
    }

    async setPlayerName(name) {
        await this.ensureSession();
        if (!this.sessionToken) return { ok: false };
        try {
            const response = await fetch(`https://api.lootlocker.io/game/player/name`, {
                method: 'PATCH',
                headers: {
                    'x-session-token': this.sessionToken,
                    'LL-Version': '2021-03-01',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: name })
            });
            const data = await response.json();
            this.isOnline = true;
            localStorage.setItem('player_name', name);
            return { ok: true, data };
        } catch (e) {
            this.isOnline = false;
            console.error("LootLocker: Failed to set player name", e);
            return { ok: false, error: e.message };
        }
    }

    async submitScore(score, metadata = {}) {
        await this.ensureSession();
        const name = localStorage.getItem('player_name') || 'Anonymous';

        const payload = {
            member_id: name,
            score: score,
            metadata: JSON.stringify(metadata)
        };

        if (!this.sessionToken || !this.isOnline) {
            this.queueScore(payload);
            return { ok: true, queued: true };
        }

        try {
            const response = await fetch(`https://api.lootlocker.io/game/leaderboards/${this.leaderboardKey}/submit`, {
                method: 'POST',
                headers: {
                    'x-session-token': this.sessionToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearSession();
                    await this.startSession();
                    return this.submitScore(score, metadata);
                }
                throw new Error(`Submit failed: ${response.status}`);
            }

            const data = await response.json();
            this.isOnline = true;
            return { ok: true, ...data };
        } catch (e) {
            this.isOnline = false;
            console.warn("LootLocker: Submit failed, queuing", e);
            this.queueScore(payload);
            return { ok: true, queued: true };
        }
    }

    async getTopScores(count = 100) {
        await this.ensureSession();
        if (!this.sessionToken) return { ok: false, entries: [] };
        try {
            const response = await fetch(`https://api.lootlocker.io/game/leaderboards/${this.leaderboardKey}/list?count=${count}`, {
                method: 'GET',
                headers: {
                    'x-session-token': this.sessionToken,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            this.isOnline = true;

            let items = data.items || [];
            if (!data.items && data.rank) items = [data];
            if (data[0] && !data.items) items = data;

            const entries = items.map(item => ({
                rank: item.rank,
                score: item.score,
                name: item.player?.name || item.member_id || `Player #${item.rank}`,
                skr: (() => {
                    try { return JSON.parse(item.metadata)?.skr || 0; } catch { return 0; }
                })(),
            }));

            return { ok: true, entries };
        } catch (e) {
            this.isOnline = false;
            console.error("LootLocker: Failed to get scores", e);
            return { ok: false, entries: [] };
        }
    }

    queueScore(payload) {
        try {
            const queue = JSON.parse(localStorage.getItem('ls_pending_scores') || '[]');
            queue.push(payload);
            localStorage.setItem('ls_pending_scores', JSON.stringify(queue));
        } catch (e) {
            console.error("LootLocker: Failed to queue score", e);
        }
    }

    async processOfflineQueue() {
        if (!this.sessionToken || !this.isOnline) return;
        const queue = JSON.parse(localStorage.getItem('ls_pending_scores') || '[]');
        if (!queue.length) return;

        console.log(`LootLocker: Processing ${queue.length} queued scores...`);
        const remaining = [];
        for (const item of queue) {
            try {
                const response = await fetch(`https://api.lootlocker.io/game/leaderboards/${this.leaderboardKey}/submit`, {
                    method: 'POST',
                    headers: {
                        'x-session-token': this.sessionToken,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(item)
                });
                if (!response.ok) throw new Error();
            } catch {
                remaining.push(item);
            }
        }
        localStorage.setItem('ls_pending_scores', JSON.stringify(remaining));
    }

    clearSession() {
        localStorage.removeItem('ll_session_token');
        this.sessionToken = null;
        this.isOnline = false;
    }
}

// Global instance
const service = new LootLockerService();
window.lootLocker = service;

// Exported Interface for compatibility
export const initLootLocker = () => service.startSession();
export const submitScore = (score, skr) => service.submitScore(score, { skr });
export const getLeaderboard = (count) => service.getTopScores(count);
export const getPlayerRank = () => service.getTopScores(1).then(r => {
    // This is a bit of a hack to match getPlayerRank if needed, 
    // but the original getPlayerRank used getmemberrank.
    // We'll keep it simple for now as the user's example doesn't have it.
    return { ok: false };
});
export const setPlayerName = (name) => service.setPlayerName(name);
export const getPlayerName = () => localStorage.getItem('player_name');
export const getPlayerId = () => service.playerIdentifier;
export const hasSession = () => !!service.sessionToken;
export const clearSession = () => service.clearSession();

/**
 * LootLocker Integration for Seeker Go
 * Game ID: 102803
 * Leaderboard Key: seeker_go_leaderboard
 * Domain: https://8qcdgnbx.api.lootlocker.io/
 */

const LL_CONFIG = {
  apiBase: 'https://8qcdgnbx.api.lootlocker.io/game',
  apiKey: 'dev_8e131ef53d234244b12b05933a76a59f',
  domainKey: '8qcdgnbx',
  leaderboardKey: 'seeker_go_leaderboard',
};

let _sessionToken = null;
let _playerId = null;
let _playerName = null;

function llHeaders(extra = {}) {
  const h = {
    'Content-Type': 'application/json',
    'x-session-token': _sessionToken || '',
    ...extra,
  };
  return h;
}

/**
 * Initialize a guest session. Persists token in localStorage.
 * Returns { ok, playerId, sessionToken }
 */
export async function initLootLocker() {
  try {
    // Reuse existing session if valid
    const stored = localStorage.getItem('ll_session');
    if (stored) {
      const data = JSON.parse(stored);
      _sessionToken = data.sessionToken;
      _playerId = data.playerId;
      _playerName = data.playerName || null;
      console.log('🔑 LootLocker: Reusing session for player', _playerId);
      return { ok: true, playerId: _playerId, sessionToken: _sessionToken, cached: true };
    }

    // Create new guest session
    const deviceId = localStorage.getItem('ll_device_id') || crypto.randomUUID();
    localStorage.setItem('ll_device_id', deviceId);

    const res = await fetch(`${LL_CONFIG.apiBase}/v2/session/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LL_CONFIG.apiKey,
      },
      body: JSON.stringify({ game_version: '1.0.0', device_id: deviceId }),
    });

    const data = await res.json();

    if (!res.ok || !data.session_token) {
      console.warn('⚠️ LootLocker: Session init failed', data);
      return { ok: false, error: data };
    }

    _sessionToken = data.session_token;
    _playerId = data.player_id;

    localStorage.setItem('ll_session', JSON.stringify({
      sessionToken: _sessionToken,
      playerId: _playerId,
      playerName: null,
    }));

    console.log('✅ LootLocker: New session for player', _playerId);
    return { ok: true, playerId: _playerId, sessionToken: _sessionToken };
  } catch (err) {
    console.error('❌ LootLocker: initLootLocker error', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Submit a score to the global leaderboard.
 * @param {number} score - Distance in metres
 * @param {number} skr - SKR shards collected
 */
export async function submitScore(score, skr) {
  if (!_sessionToken) {
    console.warn('⚠️ LootLocker: No session — cannot submit score');
    return { ok: false };
  }
  try {
    const res = await fetch(
      `${LL_CONFIG.apiBase}/leaderboards/${LL_CONFIG.leaderboardKey}/submit`,
      {
        method: 'POST',
        headers: llHeaders(),
        body: JSON.stringify({ score, metadata: JSON.stringify({ skr }) }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.warn('⚠️ LootLocker: submitScore failed', data);
      return { ok: false, error: data };
    }
    console.log('🏆 LootLocker: Score submitted', score, '| rank:', data.rank);
    return { ok: true, rank: data.rank, score: data.score };
  } catch (err) {
    console.error('❌ LootLocker: submitScore error', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Fetch the top N global leaderboard entries.
 * @param {number} count - Number of entries to fetch (default 10)
 */
export async function getLeaderboard(count = 10) {
  if (!_sessionToken) await initLootLocker();
  try {
    const res = await fetch(
      `${LL_CONFIG.apiBase}/leaderboards/${LL_CONFIG.leaderboardKey}/list?count=${count}`,
      { headers: llHeaders() }
    );
    const data = await res.json();
    if (!res.ok) {
      console.warn('⚠️ LootLocker: getLeaderboard failed', data);
      return { ok: false, entries: [] };
    }
    const entries = (data.items || []).map((item) => ({
      rank: item.rank,
      score: item.score,
      name: item.player?.name || item.player?.public_uid || `Player #${item.rank}`,
      skr: (() => {
        try { return JSON.parse(item.metadata)?.skr || 0; } catch { return 0; }
      })(),
    }));
    return { ok: true, entries };
  } catch (err) {
    console.error('❌ LootLocker: getLeaderboard error', err);
    return { ok: false, entries: [] };
  }
}

/**
 * Get this player's current rank on the leaderboard.
 */
export async function getPlayerRank() {
  if (!_sessionToken) return { ok: false };
  try {
    const res = await fetch(
      `${LL_CONFIG.apiBase}/leaderboards/${LL_CONFIG.leaderboardKey}/getmemberrank?member_id=${_playerId}`,
      { headers: llHeaders() }
    );
    const data = await res.json();
    if (!res.ok) return { ok: false };
    return { ok: true, rank: data.rank, score: data.score };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Set the player's display name.
 * @param {string} name
 */
export async function setPlayerName(name) {
  if (!_sessionToken) return { ok: false };
  try {
    const res = await fetch(`${LL_CONFIG.apiBase}/player/name`, {
      method: 'PATCH',
      headers: llHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data };

    _playerName = name;
    const stored = JSON.parse(localStorage.getItem('ll_session') || '{}');
    stored.playerName = name;
    localStorage.setItem('ll_session', JSON.stringify(stored));

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function getPlayerName() { return _playerName; }
export function getPlayerId() { return _playerId; }
export function hasSession() { return !!_sessionToken; }

/** Clear session (logout) */
export function clearSession() {
  _sessionToken = null;
  _playerId = null;
  _playerName = null;
  localStorage.removeItem('ll_session');
}

/**
 * LocalScores — persists high scores and run history using localStorage.
 */

const STORAGE_KEY = 'seeker_go_scores';
const MAX_HISTORY = 20;

export function getLocalScores() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"best":0,"bestSkr":0,"runs":[]}');
  } catch {
    return { best: 0, bestSkr: 0, runs: [] };
  }
}

/**
 * Record a completed run.
 * @param {number} distance
 * @param {number} skr
 * @returns {{ isNewBest: boolean, best: number }}
 */
export function recordRun(distance, skr) {
  const data = getLocalScores();
  const isNewBest = distance > data.best;

  data.best    = Math.max(data.best, distance);
  data.bestSkr = Math.max(data.bestSkr, skr);

  data.runs.unshift({ distance, skr, ts: Date.now() });
  if (data.runs.length > MAX_HISTORY) data.runs.length = MAX_HISTORY;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return { isNewBest, best: data.best };
}

export function getBestScore() {
  return getLocalScores().best;
}

export function clearLocalScores() {
  localStorage.removeItem(STORAGE_KEY);
}

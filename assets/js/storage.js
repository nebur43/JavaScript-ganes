// Wrapper minimal sobre localStorage para récords y preferencias.
const PREFIX = 'ganes:';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* quota / disabled */ }
}

export function getHighScore(gameId) {
  const raw = safeGet(PREFIX + 'hs:' + gameId);
  const n = raw == null ? 0 : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function setHighScore(gameId, score) {
  const current = getHighScore(gameId);
  if (score > current) {
    safeSet(PREFIX + 'hs:' + gameId, String(score));
    return true;
  }
  return false;
}

export function getPref(key, fallback = null) {
  const v = safeGet(PREFIX + 'pref:' + key);
  return v == null ? fallback : v;
}

export function setPref(key, value) {
  safeSet(PREFIX + 'pref:' + key, String(value));
}

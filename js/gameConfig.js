/**
 * "Circuit" Pong : paramètres physiques + durée d'épisode (séparé du cerveau).
 */
const GAME_CONFIG_FORMAT_VERSION = 1;

const GAME_CONFIG_DEFAULTS = {
  ballSpeed: 6,
  ballRadius: 10,
  paddleWidth: 15,
  paddleHeight: 80,
  paddleMoveSpeed: 8,
  lifetime: 3600,
  presetId: 'builtin-medium',
  obstacles: [],
};

const BUILTIN_PRESETS = {
  easy: {
    presetId: 'builtin-easy',
    ballSpeed: 4,
    ballRadius: 10,
    paddleWidth: 18,
    paddleHeight: 100,
    paddleMoveSpeed: 10,
    lifetime: 3600,
    obstacles: [],
  },
  medium: {
    presetId: 'builtin-medium',
    ballSpeed: 6,
    ballRadius: 10,
    paddleWidth: 15,
    paddleHeight: 80,
    paddleMoveSpeed: 8,
    lifetime: 3600,
    obstacles: [],
  },
  hard: {
    presetId: 'builtin-hard',
    ballSpeed: 9,
    ballRadius: 9,
    paddleWidth: 12,
    paddleHeight: 55,
    paddleMoveSpeed: 6,
    lifetime: 3600,
    obstacles: [],
  },
};

function sanitizeObstacles(arr) {
  if (!Array.isArray(arr)) return [];
  let out = [];
  for (let o of arr) {
    if (!o || typeof o !== 'object') continue;
    let x = Number(o.x);
    let y = Number(o.y);
    let w = Number(o.w);
    let h = Number(o.h);
    if (![x, y, w, h].every((v) => Number.isFinite(v)) || w <= 0 || h <= 0) continue;
    out.push({ x, y, w, h });
  }
  return out;
}

function cloneGameConfig(base) {
  return {
    formatVersion: GAME_CONFIG_FORMAT_VERSION,
    ballSpeed: base.ballSpeed,
    ballRadius: base.ballRadius,
    paddleWidth: base.paddleWidth,
    paddleHeight: base.paddleHeight,
    paddleMoveSpeed: base.paddleMoveSpeed,
    lifetime: base.lifetime,
    presetId: base.presetId || 'custom',
    obstacles: sanitizeObstacles(base.obstacles || []),
  };
}

function mergeGameConfig(overrides) {
  const o = overrides || {};
  const obs =
    o.obstacles !== undefined ? sanitizeObstacles(o.obstacles) : sanitizeObstacles(GAME_CONFIG_DEFAULTS.obstacles);
  return cloneGameConfig({
    ...GAME_CONFIG_DEFAULTS,
    ...o,
    presetId: o.presetId != null ? o.presetId : GAME_CONFIG_DEFAULTS.presetId,
    obstacles: obs,
  });
}

/** Valide un objet importé ; retourne null si aucun paramètre numérique valide. */
function normalizeImportedGameConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const n = {};
  const nums = ['ballSpeed', 'ballRadius', 'paddleWidth', 'paddleHeight', 'paddleMoveSpeed', 'lifetime'];
  for (const k of nums) {
    if (raw[k] === undefined || raw[k] === null) continue;
    const v = Number(raw[k]);
    if (!Number.isFinite(v) || v <= 0) return null;
    n[k] = v;
  }
  if (Object.keys(n).length === 0) return null;
  return mergeGameConfig({
    ...GAME_CONFIG_DEFAULTS,
    ...n,
    presetId: raw.presetId || 'custom',
    obstacles: raw.obstacles,
  });
}

function gameConfigsEqual(a, b) {
  if (!a || !b) return false;
  const keys = ['ballSpeed', 'ballRadius', 'paddleWidth', 'paddleHeight', 'paddleMoveSpeed', 'lifetime'];
  for (const k of keys) {
    if (a[k] !== b[k]) return false;
  }
  return JSON.stringify(a.obstacles || []) === JSON.stringify(b.obstacles || []);
}

function getBuiltinPreset(kind) {
  const p = BUILTIN_PRESETS[kind];
  return p ? cloneGameConfig(p) : cloneGameConfig(BUILTIN_PRESETS.medium);
}

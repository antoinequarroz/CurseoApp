const MODES = new Set(['off', 'canary', 'on']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_CANARY_USERS = 10;

export function resolveServerMode(mode, legacyEnabled) {
  if (mode === undefined) {
    return legacyEnabled === 'true' ? 'on' : 'off';
  }

  const normalized = mode.trim().toLowerCase();
  return MODES.has(normalized) ? normalized : 'off';
}

export function parseCanaryUserIds(value) {
  if (!value) return new Set();

  const ids = value
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter((id) => UUID_PATTERN.test(id));

  return new Set([...new Set(ids)].slice(0, MAX_CANARY_USERS));
}

export function canAccessSwissGroceries({ mode, legacyEnabled, canaryUserIds, userId }) {
  const resolvedMode = resolveServerMode(mode, legacyEnabled);
  if (resolvedMode === 'on') return true;
  if (resolvedMode !== 'canary') return false;

  return parseCanaryUserIds(canaryUserIds).has(userId.toLowerCase());
}

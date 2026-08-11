import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_CANARY_USERS,
  canAccessSwissGroceries,
  parseCanaryUserIds,
  resolveServerMode,
} from '../../../supabase/functions/swissgroceries/access.mjs';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';

test('le mode est ferme par defaut et pour toute valeur inconnue', () => {
  assert.equal(resolveServerMode(undefined, undefined), 'off');
  assert.equal(resolveServerMode('invalid', 'true'), 'off');
  assert.equal(resolveServerMode('', 'true'), 'off');
});

test('le flag historique ne vaut que lorsque le nouveau mode est absent', () => {
  assert.equal(resolveServerMode(undefined, 'true'), 'on');
  assert.equal(resolveServerMode('canary', 'true'), 'canary');
  assert.equal(resolveServerMode('off', 'true'), 'off');
});

test('la cohorte ignore les valeurs invalides, dedoublonne et reste bornee', () => {
  const manyIds = Array.from({ length: 12 }, (_, index) =>
    `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  );
  const parsed = parseCanaryUserIds(` invalide,${USER_ID.toUpperCase()},${USER_ID},${manyIds.join(',')}`);

  assert.equal(parsed.has(USER_ID), true);
  assert.equal(parsed.has('invalide'), false);
  assert.equal(parsed.size, MAX_CANARY_USERS);
});

test('seul un UUID authentifie explicitement autorise passe en canary', () => {
  const common = {
    mode: 'canary',
    legacyEnabled: 'false',
    canaryUserIds: USER_ID,
  };

  assert.equal(canAccessSwissGroceries({ ...common, userId: USER_ID }), true);
  assert.equal(canAccessSwissGroceries({ ...common, userId: OTHER_ID }), false);
  assert.equal(canAccessSwissGroceries({ ...common, mode: 'off', userId: USER_ID }), false);
  assert.equal(canAccessSwissGroceries({ ...common, mode: 'on', userId: OTHER_ID }), true);
});

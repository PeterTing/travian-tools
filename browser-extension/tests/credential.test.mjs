// 擴充登入憑證的到期 / 清除邏輯測試（node --test，不需安裝任何套件）
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CREDENTIAL_KEY,
  EXPIRY_SKEW_MS,
  LEGACY_AUTH_KEY,
  MAX_LIFETIME_MS,
  clearCredential,
  describeExpiry,
  isExpired,
  isTrustedSender,
  loadCredential,
  normalizeCredential,
  saveCredential,
} from '../lib/credential.js';
import { TRUSTED_SITE_ORIGINS } from '../lib/config.js';

const NOW = Date.parse('2026-10-05T03:00:00Z');
const HOUR = 60 * 60 * 1000;
const TOKEN = 'header.payload.signature';

/** chrome.storage.local 的最小替身 */
function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    async set(items) {
      Object.assign(data, items);
    },
    async remove(keys) {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
    },
  };
}

describe('normalizeCredential', () => {
  it('accepts a token with an ISO expiry and keeps only safe user fields', () => {
    const cred = normalizeCredential(
      {
        access_token: TOKEN,
        expires_at: new Date(NOW + 8 * HOUR).toISOString(),
        user: { username: 'petert', email: 'p@example.com', password: 'nope' },
      },
      NOW,
    );
    assert.deepEqual(cred, {
      access_token: TOKEN,
      expires_at: NOW + 8 * HOUR,
      user: { username: 'petert', email: 'p@example.com' },
    });
  });

  it('rejects missing expiry, expired, nearly expired and over-long tokens', () => {
    assert.equal(normalizeCredential({ access_token: TOKEN }, NOW), null);
    assert.equal(normalizeCredential({ access_token: TOKEN, expires_at: 'soon' }, NOW), null);
    assert.equal(normalizeCredential({ access_token: TOKEN, expires_at: NOW - 1 }, NOW), null);
    assert.equal(
      normalizeCredential({ access_token: TOKEN, expires_at: NOW + EXPIRY_SKEW_MS }, NOW),
      null,
    );
    assert.equal(
      normalizeCredential({ access_token: TOKEN, expires_at: NOW + MAX_LIFETIME_MS + 1 }, NOW),
      null,
    );
    assert.equal(normalizeCredential({ access_token: '', expires_at: NOW + HOUR }, NOW), null);
    assert.equal(normalizeCredential(null, NOW), null);
  });
});

describe('isExpired', () => {
  it('treats missing credential or past expiry as expired', () => {
    assert.equal(isExpired(null, NOW), true);
    assert.equal(isExpired({ access_token: TOKEN, expires_at: NOW - 1 }, NOW), true);
    assert.equal(isExpired({ access_token: TOKEN }, NOW), true);
    assert.equal(isExpired({ access_token: TOKEN, expires_at: NOW + HOUR }, NOW), false);
  });
});

describe('loadCredential', () => {
  it('returns a valid credential', async () => {
    const cred = { access_token: TOKEN, expires_at: NOW + HOUR, user: null };
    const storage = memoryStorage({ [CREDENTIAL_KEY]: cred });
    assert.deepEqual(await loadCredential(storage, NOW), cred);
    assert.deepEqual(storage.data[CREDENTIAL_KEY], cred);
  });

  it('clears an expired credential on read (expired = logged out)', async () => {
    const storage = memoryStorage({
      [CREDENTIAL_KEY]: { access_token: TOKEN, expires_at: NOW - 1 },
    });
    assert.equal(await loadCredential(storage, NOW), null);
    assert.equal(CREDENTIAL_KEY in storage.data, false);
  });

  it('drops the legacy password-login auth record', async () => {
    const storage = memoryStorage({ [LEGACY_AUTH_KEY]: { access_token: TOKEN } });
    assert.equal(await loadCredential(storage, NOW), null);
    assert.deepEqual(storage.data, {});
  });
});

describe('saveCredential / clearCredential', () => {
  it('saves a valid credential and clears it on logout', async () => {
    const storage = memoryStorage({ [LEGACY_AUTH_KEY]: { old: true } });
    const saved = await saveCredential(
      storage,
      { access_token: TOKEN, expires_at: NOW + HOUR },
      NOW,
    );
    assert.equal(saved.expires_at, NOW + HOUR);
    assert.deepEqual(await loadCredential(storage, NOW), saved);

    await clearCredential(storage);
    assert.deepEqual(storage.data, {});
    assert.equal(await loadCredential(storage, NOW), null);
  });

  it('does not store an invalid credential', async () => {
    const storage = memoryStorage();
    assert.equal(await saveCredential(storage, { access_token: TOKEN, expires_at: NOW - 1 }, NOW), null);
    assert.deepEqual(storage.data, {});
  });
});

describe('isTrustedSender', () => {
  it('only trusts the tool site origins', () => {
    assert.equal(isTrustedSender({ origin: 'http://localhost:5174' }, TRUSTED_SITE_ORIGINS), true);
    assert.equal(
      isTrustedSender({ url: 'http://localhost:5173/dashboard' }, TRUSTED_SITE_ORIGINS),
      true,
    );
    assert.equal(isTrustedSender({ origin: 'https://ts3.x1.asia.travian.com' }, TRUSTED_SITE_ORIGINS), false);
    assert.equal(isTrustedSender({ origin: 'http://localhost:5174.evil.test' }, TRUSTED_SITE_ORIGINS), false);
    assert.equal(isTrustedSender({ url: 'not a url' }, TRUSTED_SITE_ORIGINS), false);
    assert.equal(isTrustedSender(undefined, TRUSTED_SITE_ORIGINS), false);
  });
});

describe('describeExpiry', () => {
  it('formats remaining time', () => {
    assert.equal(describeExpiry({ expires_at: NOW + 8 * HOUR }, NOW), '8 小時後到期');
    assert.equal(describeExpiry({ expires_at: NOW + 90 * 60000 }, NOW), '1 小時 30 分後到期');
    assert.equal(describeExpiry({ expires_at: NOW + 5 * 60000 }, NOW), '5 分後到期');
  });
});

// popup「存到」：預設選網站目前選的帳號；popup 裡改選只影響這一次上傳
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { normalizeCredential } from '../lib/credential.js';
import { openPopup, resetPopupGlobals } from './helpers/fakePopup.mjs';

const accounts = [
  { account_id: 'a1', label: 'PeterT · ts3' },
  { account_id: 'a2', label: 'PeterT · ts5' },
  { account_id: 'a3', label: '小號 · ts3' },
];

describe('「存到」 default', () => {
  afterEach(resetPopupGlobals);

  it('starts on the account the site has selected', async () => {
    const { elements } = await openPopup({ accounts, selectedAccountId: 'a2' });
    assert.equal(elements['account-select'].value, 'a2');
    assert.equal(elements['target-row'].classList.contains('hidden'), false);
    assert.equal(elements['sync-btn'].disabled, false);
  });

  it('ignores a selected id that is not in the list', async () => {
    const { elements } = await openPopup({ accounts, selectedAccountId: 'gone' });
    assert.equal(elements['account-select'].value, '');
  });

  it('still auto-picks the only account when the site sent no selection', async () => {
    const { elements } = await openPopup({ accounts: [accounts[0]] });
    assert.equal(elements['account-select'].value, 'a1');
  });

  it('changing it in the popup never writes back (storage or site)', async () => {
    const { elements, storageSet, runtimeSend } = await openPopup({
      accounts,
      selectedAccountId: 'a2',
    });
    const select = elements['account-select'];
    select.value = 'a3';
    select.emit('change');
    assert.equal(select.value, 'a3');
    assert.equal(storageSet.mock.callCount(), 0);
    assert.equal(runtimeSend.mock.callCount(), 0);
    const js = readFileSync(new URL('../popup/popup.js', import.meta.url), 'utf8');
    assert.doesNotMatch(js, /selected_account_id\s*=/);
    assert.doesNotMatch(js, /storage\.set\(/);
  });
});

describe('credential selected_account_id', () => {
  const NOW = 1_800_000_000_000;
  const base = { access_token: 'x'.repeat(20), expires_at: NOW + 60 * 60 * 1000 };

  it('keeps the site selection when it is one of the accounts', () => {
    const cred = normalizeCredential({ ...base, accounts, selected_account_id: 'a3' }, NOW);
    assert.equal(cred.selected_account_id, 'a3');
  });

  it('drops anything else', () => {
    for (const selected of ['nope', 42, null, undefined, { a: 1 }]) {
      const cred = normalizeCredential({ ...base, accounts, selected_account_id: selected }, NOW);
      assert.equal(cred.selected_account_id, null);
    }
  });
});

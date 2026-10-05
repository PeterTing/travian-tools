// popup「請先在工具網站新增遊戲帳號」連結：用最小的假 DOM／chrome 實際跑 popup.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';

import { ADD_ACCOUNT_PATH, TOOL_SITE_URL, TRUSTED_SITE_ORIGINS } from '../lib/config.js';
import { UPLOAD_HINTS } from '../lib/pages.js';
import { openPopup, resetPopupGlobals } from './helpers/fakePopup.mjs';

describe('popup「請先在工具網站新增遊戲帳號」', () => {
  afterEach(resetPopupGlobals);

  it('is a link when the user has no game account yet', async () => {
    const { elements } = await openPopup({ accounts: [] });
    const hint = elements['upload-hint'];
    assert.equal(hint.classList.contains('hidden'), false);
    assert.equal(hint.children.length, 1);
    const [link] = hint.children;
    assert.equal(link.tagName, 'A');
    assert.equal(link.id, 'add-account-link');
    assert.equal(link.textContent, UPLOAD_HINTS.NO_ACCOUNTS);
    assert.equal(link.href, `${TOOL_SITE_URL}/game-accounts/new`);
    assert.equal(elements['sync-btn'].disabled, true);
  });

  it('hides the whole 「存到」 row while the link is shown', async () => {
    const { elements } = await openPopup({ accounts: [] });
    assert.equal(elements['target-row'].classList.contains('hidden'), true);
  });

  it('opens the tool site add-account page in a new tab, like the login button', async () => {
    const { elements, opened, closed } = await openPopup({ accounts: [] });
    const event = elements['upload-hint'].children[0].press();
    assert.equal(event.defaultPrevented, true);
    assert.equal(opened.mock.callCount(), 1);
    assert.deepEqual(opened.mock.calls[0].arguments, [
      `${TOOL_SITE_URL}${ADD_ACCOUNT_PATH}`,
      '_blank',
      'noopener',
    ]);
    assert.equal(closed.mock.callCount(), 1);
  });

  it('stays plain text for the other hints', async () => {
    const accounts = [
      { account_id: 'a1', label: 'PeterT · ts3' },
      { account_id: 'a2', label: 'PeterT · ts5' },
    ];
    const { elements, opened } = await openPopup({ accounts });
    const hint = elements['upload-hint'];
    assert.equal(hint.textContent, UPLOAD_HINTS.CHOOSE_ACCOUNT);
    assert.equal(hint.children.length, 0);
    assert.equal(opened.mock.callCount(), 0);
  });

  it('points at the tool site only, using its add-account route', () => {
    assert.equal(ADD_ACCOUNT_PATH, '/game-accounts/new');
    assert.ok(TRUSTED_SITE_ORIGINS.includes(new URL(`${TOOL_SITE_URL}${ADD_ACCOUNT_PATH}`).origin));
    const js = readFileSync(new URL('../popup/popup.js', import.meta.url), 'utf8');
    assert.match(js, /window\.open\(`\$\{TOOL_SITE_URL\}\$\{ADD_ACCOUNT_PATH\}`, '_blank', 'noopener'\)/);
    assert.doesNotMatch(js, /chrome\.tabs\.create/);
  });
});

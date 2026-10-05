// popup「請先在工具網站新增遊戲帳號」連結：用最小的假 DOM／chrome 實際跑 popup.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it, mock } from 'node:test';

import { ADD_ACCOUNT_PATH, TOOL_SITE_URL, TRUSTED_SITE_ORIGINS } from '../lib/config.js';
import { UPLOAD_HINTS } from '../lib/pages.js';

class FakeElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.children = [];
    this.listeners = {};
    this.value = '';
    this.disabled = false;
    this.href = '';
    this.className = '';
    this._text = '';
    const classes = new Set();
    this.classList = {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, force) => (force ? classes.add(c) : classes.delete(c)),
    };
  }

  get textContent() {
    return this.children.length ? this.children.map((c) => c.textContent).join('') : this._text;
  }

  set textContent(value) {
    this.children = [];
    this._text = String(value);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this._text = '';
    this.children = children;
  }

  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }

  /** 模擬使用者按下（只呼叫我們註冊的 click 監聽器） */
  press() {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const fn of this.listeners.click ?? []) fn(event);
    return event;
  }
}

const POPUP_IDS = [
  'login-section', 'main-section', 'open-site-btn', 'logout-btn', 'username', 'expiry',
  'account-select', 'page-line', 'page-type', 'upload-hint', 'sync-btn', 'sync-result',
  'error-message',
];

let run = 0;

/** 裝好假環境後載入一份新的 popup.js，等它讀完目前頁面 */
async function openPopup({ accounts }) {
  const elements = Object.fromEntries(POPUP_IDS.map((id) => [id, new FakeElement('div', id)]));
  const opened = mock.fn();
  const closed = mock.fn();
  globalThis.document = {
    getElementById: (id) => elements[id] ?? null,
    createElement: (tag) => new FakeElement(tag),
  };
  globalThis.window = { open: opened, close: closed };
  globalThis.chrome = {
    runtime: { lastError: undefined },
    storage: {
      local: {
        get: async () => ({
          credential: {
            access_token: 'test-token',
            expires_at: Date.now() + 60 * 60 * 1000,
            user: { username: 'peter' },
            accounts,
          },
        }),
        set: async () => {},
        remove: async () => {},
      },
    },
    tabs: {
      query: async () => [{ id: 1, url: 'https://ts3.x1.international.travian.com/dorf1.php' }],
      sendMessage: (_tabId, message, callback) =>
        callback(message.action === 'ping' ? { success: true } : { success: true, page_type: 'village_overview' }),
    },
    scripting: { executeScript: async () => {} },
  };
  run += 1;
  await import(`../popup/popup.js?run=${run}`);
  const hint = elements['upload-hint'];
  for (let i = 0; i < 50 && hint.textContent === UPLOAD_HINTS.DETECTING; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { elements, opened, closed };
}

describe('popup「請先在工具網站新增遊戲帳號」', () => {
  afterEach(() => {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.chrome;
  });

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

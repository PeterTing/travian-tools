// popup 測試用的最小假 DOM／chrome：實際載入 popup.js（不是測試檔，node --test 不會直接跑它）
import { mock } from 'node:test';

import { UPLOAD_HINTS } from '../../lib/pages.js';

export class FakeElement {
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

  /** 呼叫我們註冊的某種事件監聽器（例如使用者改了下拉選單） */
  emit(type) {
    const event = { type, target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const fn of this.listeners[type] ?? []) fn(event);
    return event;
  }

  /** 模擬使用者按下（只呼叫我們註冊的 click 監聽器） */
  press() {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const fn of this.listeners.click ?? []) fn(event);
    return event;
  }
}

export const POPUP_IDS = [
  'login-section', 'main-section', 'open-site-btn', 'logout-btn', 'username', 'expiry',
  'account-select', 'page-line', 'page-type', 'upload-hint', 'sync-btn', 'sync-result',
  'error-message', 'target-row',
];

let run = 0;

/** 裝好假環境後載入一份新的 popup.js，等它讀完目前頁面 */
export async function openPopup({ accounts, selectedAccountId } = {}) {
  const elements = Object.fromEntries(POPUP_IDS.map((id) => [id, new FakeElement('div', id)]));
  const opened = mock.fn();
  const storageSet = mock.fn(async () => {});
  const runtimeSend = mock.fn();
  const closed = mock.fn();
  globalThis.document = {
    getElementById: (id) => elements[id] ?? null,
    createElement: (tag) => new FakeElement(tag),
  };
  globalThis.window = { open: opened, close: closed };
  globalThis.chrome = {
    runtime: { lastError: undefined, sendMessage: runtimeSend },
    storage: {
      local: {
        get: async () => ({
          credential: {
            access_token: 'test-token',
            expires_at: Date.now() + 60 * 60 * 1000,
            user: { username: 'peter' },
            accounts,
            ...(selectedAccountId === undefined ? {} : { selected_account_id: selectedAccountId }),
          },
        }),
        set: storageSet,
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
  await import(`../../popup/popup.js?run=${run}`);
  const hint = elements['upload-hint'];
  for (let i = 0; i < 50 && hint.textContent === UPLOAD_HINTS.DETECTING; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { elements, opened, closed, storageSet, runtimeSend };
}


export function resetPopupGlobals() {
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.chrome;
}

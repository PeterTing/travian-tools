// P0-03：擴充只送 HTML；產量負號由後端共用解析器處理（見 backend/tests/unit/parsers/test_numbers.py）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../content/content.js', import.meta.url), 'utf8');

function loadContentScript(href) {
  const clone = {
    querySelectorAll(sel) {
      const nodes = [];
      if (String(sel).includes('script') || String(sel).includes('style')) {
        nodes.push({ remove() {} });
      }
      return nodes;
    },
    outerHTML:
      '<html><head></head><body><div id="servertime"><span id="tp1">10:00:00</span></div><script>x</script></body></html>',
  };
  const context = {
    console: { log() {}, error() {}, warn() {} },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    window: {
      location: { href, pathname: new URL(href).pathname, search: new URL(href).search },
    },
    document: {
      documentElement: { cloneNode: () => clone },
      querySelector(sel) {
        if (String(sel).includes('tp1') || String(sel).includes('servertime')) {
          return { textContent: '10:00:00' };
        }
        return null;
      },
    },
    Date,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

describe('content script: HTML payload for shared parser', () => {
  it('detects dorf1 / dorf2 / rally / reports', () => {
    assert.equal(
      loadContentScript('https://ts3.x1.asia.travian.com/dorf1.php').getPageType(),
      'village_overview',
    );
    assert.equal(
      loadContentScript('https://ts3.x1.asia.travian.com/dorf2.php').getPageType(),
      'village_center',
    );
    assert.equal(
      loadContentScript('https://ts3.x1.asia.travian.com/build.php?id=39&gid=16&tt=1').getPageType(),
      'rally_point',
    );
    assert.equal(
      loadContentScript('https://ts3.x1.asia.travian.com/berichte.php').getPageType(),
      'reports',
    );
  });

  it('collectPagePayload returns html + url + server_time + page_type (scripts stripped)', () => {
    const page = loadContentScript('https://ts3.x1.asia.travian.com/dorf1.php');
    const payload = page.collectPagePayload();
    assert.equal(payload.page_type, 'village_overview');
    assert.match(payload.url, /dorf1\.php/);
    assert.equal(payload.server_time, '10:00:00');
    assert.match(payload.html, /<!DOCTYPE html>/);
  });
});

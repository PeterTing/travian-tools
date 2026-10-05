// 村莊總覽（dorf1）產量表的讀法：糧食淨產量是負的時候要留住負號（村莊列表會標紅）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../content/content.js', import.meta.url), 'utf8');

// 遊戲實際的格子：U+2212 負號，數字前後夾著 LRE/PDF 之類的方向控制字元
const LRO = '\u202d';
const PDF = '\u202c';
const cell = (text) => ({ textContent: text });

/** 在假的頁面裡載入 content.js（不連網、不碰 chrome API），回傳它的全域函式 */
function loadContentScript(productionCells) {
  const table = { querySelectorAll: () => productionCells };
  const context = {
    console: { log() {}, error() {}, warn() {} },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    window: { location: { href: 'https://ts3.x1.asia.travian.com/dorf1.php', pathname: '/dorf1.php', search: '' } },
    document: {
      getElementById: (id) => (id === 'production' ? table : null),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

describe('content script: production table', () => {
  it('keeps a negative net crop (game uses U+2212 wrapped in direction marks)', () => {
    const page = loadContentScript([
      cell(`${LRO}${LRO}820${PDF}${PDF}`),
      cell('800'),
      cell('1,900'),
      cell(`${LRO}${LRO}\u2212320${PDF}${PDF}`),
    ]);
    assert.deepEqual({ ...page.parseProduction() }, { wood: 820, clay: 800, iron: 1900, crop: -320 });
  });

  it('reads positive and ASCII-minus values, with any thousands separator', () => {
    const page = loadContentScript([cell('+1.240'), cell('2 100'), cell('0'), cell('-1,050')]);
    assert.deepEqual({ ...page.parseProduction() }, { wood: 1240, clay: 2100, iron: 0, crop: -1050 });
  });

  it('parseSignedInt ignores a minus that is not in front of the number, and empty cells', () => {
    const page = loadContentScript([]);
    assert.equal(page.parseSignedInt('12-3'), 123);
    assert.equal(page.parseSignedInt(''), 0);
    assert.equal(page.parseSignedInt(undefined), 0);
    assert.equal(page.parseSignedInt('\u2212 45 /h'), -45);
  });

  it('falls back to zeros when the table has fewer than four cells', () => {
    const page = loadContentScript([cell('1')]);
    assert.deepEqual({ ...page.parseProduction() }, { wood: 0, clay: 0, iron: 0, crop: 0 });
  });
});

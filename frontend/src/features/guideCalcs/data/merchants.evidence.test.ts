// 商人容量／速度、交易所每級加成綁官方出處（P0-23 幕僚長審查）：數字改回舊的（匈人 750、交易所 10%／20%）測試就會失敗
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MERCHANTS, TRADE_OFFICE_PER_LEVEL, TRADE_OFFICE_PER_LEVEL_DEFAULT, TRADE_OFFICE_PER_LEVEL_ROMAN, tradeOfficePerLevel, type TribeId } from './travian';

const EVIDENCE = resolve(__dirname, '../../../../../scripts/game_data/evidence');
const support = JSON.parse(readFileSync(resolve(EVIDENCE, 'official_support_2026-10-10.json'), 'utf8'));
const kb = JSON.parse(readFileSync(resolve(EVIDENCE, 'official_kb_buildings_2026-10-10.json'), 'utf8'));
const TRIBES: TribeId[] = ['romans', 'teutons', 'gauls', 'egyptians', 'huns', 'spartans', 'vikings'];

describe('merchant capacity / speed = official help page S3', () => {
  const s3 = support.articles.s3;
  it.each(TRIBES)('%s', (tribe) => {
    const [cap, speed] = s3.merchants[tribe] as [number, number];
    expect(MERCHANTS[tribe]).toEqual({ capacity: cap, speed });
    // 數字要真的在 S3 全文裡（不是只在我們自己整理的欄位）
    expect(s3.text).toContain(`Carry ${cap} resources, move at ${speed} fields/hour.`);
  });
  it('Huns carry 500 (old data said 750)', () => {
    expect(MERCHANTS.huns.capacity).toBe(500);
  });
});

describe('trade office per level = official knowledge base trade office effect column', () => {
  const rows = kb.buildings['28'].rows as { level: number; effects: string[] }[];
  const pct = (s: string) => Number(s.replace(/[+%]/g, ''));
  it('every level 1–20: other tribes / Romans', () => {
    expect(rows).toHaveLength(20);
    for (const r of rows) {
      expect(Math.round(TRADE_OFFICE_PER_LEVEL_DEFAULT * 100 * r.level)).toBe(pct(r.effects[0]!));
      expect(Math.round(TRADE_OFFICE_PER_LEVEL_ROMAN * 100 * r.level)).toBe(pct(r.effects[1]!));
    }
  });
  it('20% / 40% per level (old data said 10% / 20%)', () => {
    expect(TRADE_OFFICE_PER_LEVEL_DEFAULT).toBe(0.2);
    expect(TRADE_OFFICE_PER_LEVEL_ROMAN).toBe(0.4);
    expect(TRADE_OFFICE_PER_LEVEL).toBe(TRADE_OFFICE_PER_LEVEL_DEFAULT);
    expect(tradeOfficePerLevel('romans')).toBe(0.4);
    for (const t of TRIBES.filter((x) => x !== 'romans')) expect(tradeOfficePerLevel(t)).toBe(0.2);
  });
});

import { useState, useMemo } from 'react';
import { CROPPER_LAYOUTS, FIELD_PRODUCTION, BONUS_BUILDINGS_VERIFIED, OASIS_TYPES, type CropperId, type ResourceType } from '../data/travian';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip';
import type { PendingKind } from '@/lib/pendingNotes';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import { CalcBar } from '@/components/autofill/CalcFrame'
import LevelSelect from '@/components/common/LevelSelect'
import BuildingIcon from '@/components/common/BuildingIcon'
import { ingameBuildingName } from '@/lib/ingameNames';

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export interface CropSimInput {
  layoutId: CropperId;
  fieldLevel: number;
  bonus: { saw: number; bri: number; fnd: number; mil: number; bak: number };
  oasis: Record<ResourceType, number>; // percent
  gold: boolean;
  /** Egyptian Waterworks level (0 = not Egyptian). +5% oasis bonus per level (official knowledge base, P0-23) */
  waterworks: number;
}

/**
 * Capital production per hour.
 * production = fields × base × (1 + bonus buildings + oasis) × 1.25 (Plus gold, multiplied last)
 * This reproduces the small travian guide's Table 1 (non-Egyptian) cell by cell.
 * Plus multiplies the total: official support.travian.com S129 "applies to the total production" (P0-23).
 */
export function cropSim(input: CropSimInput) {
  const layout = CROPPER_LAYOUTS.find(l => l.id === input.layoutId)!;
  const base = FIELD_PRODUCTION[input.fieldLevel] ?? 0;
  const goldMult = input.gold ? 1.25 : 1;
  const ww = 1 + Math.max(0, Math.min(20, input.waterworks)) * 0.05;
  const bbPct: Record<ResourceType, number> = {
    wood: input.bonus.saw * 0.05,
    clay: input.bonus.bri * 0.05,
    iron: input.bonus.fnd * 0.05,
    crop: (input.bonus.mil + input.bonus.bak) * 0.05,
  };
  const oPct: Record<ResourceType, number> = {
    wood: (input.oasis.wood / 100) * ww,
    clay: (input.oasis.clay / 100) * ww,
    iron: (input.oasis.iron / 100) * ww,
    crop: (input.oasis.crop / 100) * ww,
  };
  const counts: Record<ResourceType, number> = { wood: layout.wood, clay: layout.clay, iron: layout.iron, crop: layout.crop };
  const totals: Record<ResourceType, number> = { wood: 0, clay: 0, iron: 0, crop: 0 };
  const rows = (['wood', 'clay', 'iron', 'crop'] as ResourceType[]).map(t => {
    const total = counts[t] * base * (1 + bbPct[t] + oPct[t]) * goldMult;
    totals[t] = total;
    return { t, n: counts[t], base, bb: bbPct[t], oa: oPct[t], total };
  });
  return { rows, totals };
}

/** 一村最多 3 塊綠洲（官方 S48）；木／土／鐵 +50% 只在納塔區（灰色區）才有 */
export const OASIS_SLOTS = 3;
const NATAR_ONLY = new Set(['single50_wood', 'single50_clay', 'single50_iron']);

/** 3 個綠洲格 → 每種資源的加成 %（只能是官方 S48 的綠洲組合，不能自己打 250%） */
export function oasisPercent(slotIds: string[]): Record<ResourceType, number> {
  const out: Record<ResourceType, number> = { wood: 0, clay: 0, iron: 0, crop: 0 };
  for (const id of slotIds.slice(0, OASIS_SLOTS)) {
    const o = OASIS_TYPES.find(x => x.id === id);
    if (!o) continue;
    for (const [k, v] of Object.entries(o.bonuses)) out[k as ResourceType] += Math.round((v ?? 0) * 100);
  }
  return out;
}

export default function CropSimCalculator() {
  const { lang } = useLang();
  const [layoutId, setLayoutId] = useState<CropperId>('15c');
  const [flv, setFlv] = useState(18);
  const [bonus, setBonus] = useState({ saw: 5, bri: 5, fnd: 5, mil: 5, bak: 5 });
  // 3 個綠洲格（預設 3 塊糧 +50%＝參考表 150% 那一欄）
  const [slots, setSlots] = useState<string[]>(['single50_crop', 'single50_crop', 'single50_crop']);
  const oasis = useMemo(() => oasisPercent(slots), [slots]);
  const [gold, setGold] = useState(true);
  const [waterworks, setWaterworks] = useState(0);
  // 資源田產量、供水系統 +5%/級：官方知識庫；Plus ×1.25 乘在總產量上：官方 S129（P0-23）。
  // 加成建築（只算用到的那幾種資源）的資料哪天又標待驗證，這裡會自動帶回灰標
  const kindsFor = (bb: boolean): PendingKind[] => [
    ...(bb && !BONUS_BUILDINGS_VERIFIED ? ['building' as const] : []),
  ];
  const bbNonCrop = bonus.saw > 0 || bonus.bri > 0 || bonus.fnd > 0;
  const bbCrop = bonus.mil > 0 || bonus.bak > 0;
  const simKinds = kindsFor(bbNonCrop || bbCrop);
  const nonCropKinds = kindsFor(bbNonCrop);
  const cropKinds = kindsFor(bbCrop);
  const chipFor = (kinds: PendingKind[]) => (kinds.length ? <> <PendingVerifyChip kinds={kinds} /></> : null);

  const result = useMemo(
    () => cropSim({ layoutId, fieldLevel: flv, bonus, oasis, gold, waterworks }),
    [layoutId, flv, bonus, oasis, gold, waterworks],
  );

  const nonCrop = result.totals.wood + result.totals.clay + result.totals.iron;
  const total = nonCrop + result.totals.crop;

  return (
    <>
      <div className={s.intro}>
        {/* Table 1 reference numbers — see calculators.regression.test.ts */}
        <h2>{lang === 'en' ? 'Capital production' : '首都產量模擬'}</h2>
        <p>{lang === 'en'
          ? 'Estimates total capital production per hour (wood, clay, iron, and crop) with all bonuses. Compare 15c / 9c / 7c / 6c layouts. The gold production bonus (+25%) is multiplied on top of fields × (1 + bonus buildings + oasis).'
          : '估算首都每小時總產量（木、土、鐵、糧），可比較 15c／9c／7c／6c。算法：田產量 ×（1＋加成建築＋綠洲），有勾金幣產量加成再 ×1.25。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Layout & level' : '佈局與等級'}</h4>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Layout' : '佈局'}</label>
            <select value={layoutId} onChange={e => setLayoutId(e.target.value as CropperId)}>
              {CROPPER_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
            </select>
          </div>
          <div className="mb-3.5">
            {/* 1–20 級（稽核 2026-10-10 拿掉 21 級）；所有田同一個等級，圖示用農場 */}
            <LevelSelect lang={lang} label={lang === 'en' ? 'Field level' : '田地等級'} buildingId="cropland" min={1} max={20} value={flv} onChange={setFlv} testId="crop-sim-field-level" />
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Bonus buildings' : '加成建築'}</h4>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><LevelSelect lang={lang} label={lang === 'en' ? 'Sawmill' : ingameBuildingName('sawmill')!} buildingId="sawmill" min={0} max={5} value={bonus.saw} onChange={v => setBonus(p => ({ ...p, saw: v }))} testId="cropsim-bonus-saw" /></div>
            <div className="mb-3.5 min-w-0"><LevelSelect lang={lang} label={lang === 'en' ? 'Brickyard' : ingameBuildingName('brickyard')!} buildingId="brickyard" min={0} max={5} value={bonus.bri} onChange={v => setBonus(p => ({ ...p, bri: v }))} testId="cropsim-bonus-bri" /></div>
          </div>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><LevelSelect lang={lang} label={lang === 'en' ? 'Iron Foundry' : ingameBuildingName('iron_foundry')!} buildingId="iron_foundry" min={0} max={5} value={bonus.fnd} onChange={v => setBonus(p => ({ ...p, fnd: v }))} testId="cropsim-bonus-fnd" /></div>
            <div className="mb-3.5 min-w-0"><LevelSelect lang={lang} label={lang === 'en' ? 'Grain Mill' : ingameBuildingName('grain_mill')!} buildingId="grain_mill" min={0} max={5} value={bonus.mil} onChange={v => setBonus(p => ({ ...p, mil: v }))} testId="cropsim-bonus-mil" /></div>
          </div>
          <div className="mb-3.5 min-w-0"><LevelSelect lang={lang} label={lang === 'en' ? 'Bakery' : ingameBuildingName('bakery')!} buildingId="bakery" min={0} max={5} value={bonus.bak} onChange={v => setBonus(p => ({ ...p, bak: v }))} testId="cropsim-bonus-bak" /></div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Oases (up to 3)' : '綠洲（最多 3 塊）'}</h4>
          <p className={s.muted} style={{ margin: '0 0 8px' }}>
            {lang === 'en'
              ? "Pick the oases this village holds (official S48). Hero's Mansion 10 / 15 / 20 holds 1 / 2 / 3. Wood / clay / iron +50% only exist in the grey Natarian area."
              : '選這村佔的綠洲（官方 S48）。英雄宅 10／15／20 級可佔 1／2／3 塊。木／土／鐵 +50% 只有納塔區（灰色區）才有。'}
          </p>
          {Array.from({ length: OASIS_SLOTS }, (_, i) => (
            <div className={s.field} key={i}>
              <label>{lang === 'en' ? `Oasis ${i + 1}` : `綠洲 ${i + 1}`}</label>
              <select data-testid={`cropsim-oasis-${i + 1}`} value={slots[i] ?? ''} onChange={e => setSlots(p => p.map((v, k) => (k === i ? e.target.value : v)))}>
                <option value="">{lang === 'en' ? 'None' : '沒有'}</option>
                {OASIS_TYPES.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label[lang === 'en' ? 'en' : 'zh']}{NATAR_ONLY.has(o.id) ? (lang === 'en' ? ' (Natarian area)' : '（納塔區）') : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <p className={s.muted} data-testid="cropsim-oasis-total" style={{ margin: '0 0 8px' }}>
            {lang === 'en' ? 'Total: ' : '合計：'}
            {(['wood', 'clay', 'iron', 'crop'] as ResourceType[]).filter(k => oasis[k] > 0).map(k => `${{ wood: lang === 'en' ? 'wood' : '木', clay: lang === 'en' ? 'clay' : '土', iron: lang === 'en' ? 'iron' : '鐵', crop: lang === 'en' ? 'crop' : '糧' }[k]} +${oasis[k]}%`).join('、') || '0%'}
          </p>

          <label className={s.check}><input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} /> {lang === 'en' ? 'Gold production bonus +25%' : '金幣產量加成 +25%'}</label>
          <div className="mb-3.5">
            <LevelSelect
              lang={lang}
              label={lang === 'en' ? 'Egyptian Waterworks level (0 = not Egyptian)' : '埃及供水系統等級（不是埃及選 0）'}
              buildingId="waterworks"
              value={waterworks}
              onChange={setWaterworks}
              min={0}
              max={20}
              testId="crop-sim-waterworks"
            />
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Total /hr' : '總計 /hr'}
          // 總計用到的資料有待驗證的才標（目前都核對過）
          titlePending={simKinds.length ? simKinds : false}
          primary={<>{fmtInt(total)}</>}
          secondary={
            lang === 'en'
              ? `Crop ${fmtInt(result.totals.crop)} · other ${fmtInt(nonCrop)}`
              : `糧食 ${fmtInt(result.totals.crop)} · 其餘 ${fmtInt(nonCrop)}`
          }
        >
          {/* 基礎（3 級以上產量）、加成%（加成建築）、綠洲%／總計（供水系統、Plus）：表格標題旁一個灰標
              （不放在欄位標題裡，390 欄位才不會被擠成一字一行）；每列 44px、垂直置中 */}
          {simKinds.length ? (
            <PendingRow as="h4" className="flex min-h-11 items-center gap-1" data-testid="cropsim-breakdown-title">
              <span>{lang === 'en' ? 'Production breakdown /hr' : '產量分解 /hr'}</span>
              <PendingVerifyChip kinds={simKinds} />
            </PendingRow>
          ) : (
            <h4 data-testid="cropsim-breakdown-title">{lang === 'en' ? 'Production breakdown /hr' : '產量分解 /hr'}</h4>
          )}
          <table className={`${s.table} ${s.tapRows}`} data-testid="cropsim-breakdown">
            <thead>
              {/* 欄位標題不換行（390 剛好放得下，「加成%」不會被切成「加／成%」） */}
              <tr className="h-11 whitespace-nowrap">
                <th><span className="sr-only sm:not-sr-only">{lang === 'en' ? 'Resource' : '資源'}</span></th>
                <th>{lang === 'en' ? 'Fields' : '田數'}</th>
                <th>{lang === 'en' ? 'Base' : '基礎'}</th>
                <th>{lang === 'en' ? 'Bonus%' : '加成%'}</th>
                <th>{lang === 'en' ? 'Oasis%' : '綠洲%'}</th>
                <th>{lang === 'en' ? 'Total /hr' : '總計 /hr'}</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map(r => {
                const names: Record<string, string> = lang === 'en'
                  ? { wood: 'Wood', clay: 'Clay', iron: 'Iron', crop: 'Crop' }
                  : { wood: '木材', clay: '黏土', iron: '鐵礦', crop: '糧食' };
                return (
                  <tr key={r.t} className="h-11">
                    {/* 390 寬第一欄只放圖示（名稱給螢幕閱讀器），≥640 才顯示名稱（P0-17 (d)） */}
                    <td className="whitespace-nowrap"><span className="inline-flex items-center gap-2"><BuildingIcon id={r.t} size={20} /><span className="sr-only sm:not-sr-only">{names[r.t]}</span></span></td>
                    <td>{r.n} × {r.base}</td>
                    <td>{(r.n * r.base).toLocaleString()}</td>
                    <td>+{(r.bb * 100).toFixed(0)}%</td>
                    <td>+{(r.oa * 100).toFixed(0)}%</td>
                    <td>{fmtInt(r.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <PendingRow className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? 'Wood + Clay + Iron /hr' : '木 + 土 + 鐵 /hr'}{chipFor(nonCropKinds)}</span><span className={s.value}>{fmtInt(nonCrop)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Crop /hr' : '糧食 /hr'}{chipFor(cropKinds)}</span><span className={s.value}>{fmtInt(result.totals.crop)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Total /hr' : '總計 /hr'}{chipFor(simKinds)}</span><span className={`${s.value} ${s.highlight}`}>{fmtInt(total)}</span></PendingRow>

          <h4>{lang === 'en' ? 'Reference (Lv 18, fully buffed)' : '參考值（18 級、加成拉滿）'}</h4>
          <table className={s.table}>
            <thead><tr>
              <th>{lang === 'en' ? 'Layout' : '首都配置'}</th>
              <th>150%</th>
              <th>125%</th>
              <th>100%</th>
              <th>75%</th>
            </tr></thead>
            <tbody>
              <tr><td>1-1-1-15</td><td>136,500</td><td>126,000</td><td>115,500*</td><td>105,000*</td></tr>
              <tr><td>3-3-3-9</td><td>107,100</td><td>100,800</td><td>94,500</td><td>88,200</td></tr>
              <tr><td>3-4-4-7</td><td>97,300</td><td>92,400</td><td>87,500</td><td>82,600</td></tr>
            </tbody>
          </table>
          <div className={s.note}>
            {lang === 'en'
              ? 'From the small travian guide, Table 1 — NOT Egyptian. Total production of all four resources per hour (x1): Lv 18 fields, all bonus buildings Lv 5, gold production bonus ×1.25 multiplied last. Columns = crop-oasis bonus (150% = three 50% crop oases). * The guide prints 105,000 / 94,500 for these two cells; recomputing every cell with the same formula gives 115,500 / 105,000, so we show the recomputed value. Pick the layout and crop oases above to reproduce any cell.'
              : '出自 small travian guide 表 1，不是埃及。數字是四種資源合計的每小時總產量（x1）：田 18 級、加成建築全 5 級、金幣產量加成 ×1.25 乘在最後。欄位＝糧綠洲加成（150%＝3 塊 50% 糧綠洲）。* 這兩格原表寫 105,000／94,500，用同一套公式逐格重算應為 115,500／105,000，這裡顯示重算值。在上面選配置和糧綠洲就能重現任一格。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}

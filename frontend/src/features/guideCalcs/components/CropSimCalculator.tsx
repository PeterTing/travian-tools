import { useState, useMemo } from 'react';
import { CROPPER_LAYOUTS, FIELD_PRODUCTION, type CropperId, type ResourceType } from '../data/travian';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'

const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');

export interface CropSimInput {
  layoutId: CropperId;
  fieldLevel: number;
  bonus: { saw: number; bri: number; fnd: number; mil: number; bak: number };
  oasis: Record<ResourceType, number>; // percent
  gold: boolean;
  /** Egyptian Waterworks level (0 = not Egyptian). +5% oasis bonus per level — 待驗證 */
  waterworks: number;
}

/**
 * Capital production per hour.
 * production = fields × base × (1 + bonus buildings + oasis) × 1.25 (Plus gold, multiplied last)
 * This reproduces the small travian guide's Table 1 (non-Egyptian) cell by cell.
 * Gold multiplied vs added has no official statement yet → 待 ts11 開 Plus 實測.
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

export default function CropSimCalculator() {
  const { lang } = useLang();
  const [layoutId, setLayoutId] = useState<CropperId>('15c');
  const [flv, setFlv] = useState(18);
  const [bonus, setBonus] = useState({ saw: 5, bri: 5, fnd: 5, mil: 5, bak: 5 });
  const [oasis, setOasis] = useState({ wood: 0, clay: 0, iron: 0, crop: 150 });
  const [gold, setGold] = useState(true);
  const [waterworks, setWaterworks] = useState(0);

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
          ? 'Estimates total capital production per hour (wood, clay, iron, and crop) with all bonuses. Compare 15c / 9c / 7c / 6c layouts. Plus +25% is multiplied on top of fields × (1 + bonus buildings + oasis).'
          : '估算首都每小時總產量（木、土、鐵、糧），可比較 15c／9c／7c／6c。算法：田產量 ×（1＋加成建築＋綠洲），有勾 Plus 再 ×1.25。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Layout & level' : '佈局 & 等級'}</h4>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Layout' : '佈局'}</label>
            <select value={layoutId} onChange={e => setLayoutId(e.target.value as CropperId)}>
              {CROPPER_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
            </select>
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Field level' : '田地等級'}</label>
            <select value={flv} onChange={e => setFlv(+e.target.value)}>
              {Array.from({ length: 21 }, (_, i) => i + 1).map(L => <option key={L} value={L}>Lv {L}</option>)}
            </select>
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Bonus buildings' : '加成建築'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Sawmill</label><input type="number" min={0} max={5} value={bonus.saw} onChange={e => setBonus(p => ({ ...p, saw: +e.target.value }))} /></div>
            <div className={s.field}><label>Brickyard</label><input type="number" min={0} max={5} value={bonus.bri} onChange={e => setBonus(p => ({ ...p, bri: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Iron Foundry</label><input type="number" min={0} max={5} value={bonus.fnd} onChange={e => setBonus(p => ({ ...p, fnd: +e.target.value }))} /></div>
            <div className={s.field}><label>Grain Mill</label><input type="number" min={0} max={5} value={bonus.mil} onChange={e => setBonus(p => ({ ...p, mil: +e.target.value }))} /></div>
          </div>
          <div className={s.field}><label>Bakery</label><input type="number" min={0} max={5} value={bonus.bak} onChange={e => setBonus(p => ({ ...p, bak: +e.target.value }))} /></div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Oasis bonuses (%)' : '綠洲加成 (%)'}</h4>
          <p style={{ fontSize: 11, color: 'var(--text-2)', margin: '0 0 8px' }}>
            {lang === 'en' ? 'Per-village cap: 75% non-crop, 150% crop (up to 3 oases at Hero\'s Mansion 20)' : '每村上限：木／土／鐵 75%、糧 150%（英雄宅 20 級最多 3 塊綠洲）'}
          </p>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Wood (max 75)</label><input type="number" min={0} max={75} value={oasis.wood} onChange={e => setOasis(p => ({ ...p, wood: +e.target.value }))} /></div>
            <div className={s.field}><label>Clay (max 75)</label><input type="number" min={0} max={75} value={oasis.clay} onChange={e => setOasis(p => ({ ...p, clay: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Iron (max 75)</label><input type="number" min={0} max={75} value={oasis.iron} onChange={e => setOasis(p => ({ ...p, iron: +e.target.value }))} /></div>
            <div className={s.field}><label>Crop (max 150)</label><input type="number" min={0} max={150} value={oasis.crop} onChange={e => setOasis(p => ({ ...p, crop: +e.target.value }))} /></div>
          </div>

          <label className={s.check}><input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} /> Plus +25% gold</label>
          <div className="mb-3.5">
            <Stepper
              label={lang === 'en' ? 'Egyptian Waterworks level (0 = not Egyptian)' : '埃及供水系統等級（不是埃及填 0）'}
              value={waterworks}
              onChange={setWaterworks}
              min={0}
              max={20}
            />
          </div>
          <PendingRow as="p" className="text-xs text-gray-500" data-testid="cropsim-pending">
            <span>{lang === 'en' ? 'Plus / Waterworks bonus' : 'Plus／供水系統加成'}</span>{' '}
            <PendingVerifyChip kind="cropSim" />
          </PendingRow>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Total /hr' : '總計 /hr'}
          primary={<>{fmtInt(total)}</>}
          secondary={
            lang === 'en'
              ? `Crop ${fmtInt(result.totals.crop)} · other ${fmtInt(nonCrop)}`
              : `糧食 ${fmtInt(result.totals.crop)} · 其餘 ${fmtInt(nonCrop)}`
          }
        >
          <h4>{lang === 'en' ? 'Production breakdown /hr' : '產量分解 /hr'}</h4>
          <table className={s.table}>
            <thead><tr>
              <th>{lang === 'en' ? 'Resource' : '資源'}</th>
              <th>{lang === 'en' ? 'Fields' : '田數'}</th>
              <th>{lang === 'en' ? 'Base' : '基礎'}</th>
              <th>{lang === 'en' ? 'Bonus%' : '加成%'}</th>
              <th>{lang === 'en' ? 'Oasis%' : '綠洲%'}</th>
              <th>{lang === 'en' ? 'Total /hr' : '總計 /hr'}</th>
            </tr></thead>
            <tbody>
              {result.rows.map(r => {
                const labels: Record<string, string> = lang === 'en'
                  ? { wood: '🪵 Wood', clay: '🧱 Clay', iron: '⛏️ Iron', crop: '🌾 Crop' }
                  : { wood: '🪵 木材', clay: '🧱 黏土', iron: '⛏️ 鐵礦', crop: '🌾 糧食' };
                return (
                  <tr key={r.t}>
                    <td>{labels[r.t]}</td>
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

          <div className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? 'Wood + Clay + Iron /hr' : '木 + 土 + 鐵 /hr'}</span><span className={s.value}>{fmtInt(nonCrop)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Crop /hr' : '糧食 /hr'}</span><span className={s.value}>{fmtInt(result.totals.crop)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Total /hr' : '總計 /hr'}</span><span className={`${s.value} ${s.highlight}`}>{fmtInt(total)}</span></div>

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
              ? 'From the small travian guide, Table 1 — NOT Egyptian. Total production of all four resources per hour (x1): Lv 18 fields, all bonus buildings Lv 5, Plus ×1.25 multiplied last. Columns = crop-oasis bonus (150% = three 50% crop oases). * The guide prints 105,000 / 94,500 for these two cells; recomputing every cell with the same formula gives 115,500 / 105,000, so we show the recomputed value. Set layout + crop oasis % above to reproduce any cell.'
              : '出自 small travian guide 表 1，不是埃及。數字是四種資源合計的每小時總產量（x1）：田 18 級、加成建築全 5 級、Plus ×1.25 乘在最後。欄位＝糧綠洲加成（150%＝3 塊 50% 糧綠洲）。* 這兩格原表寫 105,000／94,500，用同一套公式逐格重算應為 115,500／105,000，這裡顯示重算值。在上面選配置、填糧綠洲％就能重現任一格。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}

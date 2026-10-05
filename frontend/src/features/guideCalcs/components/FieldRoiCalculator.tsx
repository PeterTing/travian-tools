import { useState, useMemo } from 'react';
import { fieldRoi, FIELD_COSTS, type ResourceType } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

const TYPE_LABELS: Record<ResourceType, { zh: string; en: string }> = {
  wood: { zh: '🪵 木材', en: '🪵 Wood' },
  clay: { zh: '🧱 黏土', en: '🧱 Clay' },
  iron: { zh: '⛏️ 鐵礦', en: '⛏️ Iron' },
  crop: { zh: '🌾 糧食', en: '🌾 Crop' },
};

const fmt = (n: number) => isFinite(n)
  ? (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1).replace(/\.0$/, ''))
  : '—';

export default function FieldRoiCalculator() {
  const { t, lang } = useLang();
  const [type, setType] = useState<ResourceType>('crop');
  const [level, setLevel] = useState(7);
  const [bonus, setBonus] = useState(0);
  const [oasis, setOasis] = useState(0);
  const [gold, setGold] = useState(true);

  const opts = { goldBonus: gold ? 0.25 : 0, bonusBuildingPct: bonus, oasisPct: oasis };
  const result = useMemo(() => fieldRoi(type, level, opts), [type, level, bonus, oasis, gold]);
  const breakdown = FIELD_COSTS[type][level - 1];

  const compareRows = useMemo(() => {
    const types: ResourceType[] = ['wood', 'clay', 'iron', 'crop'];
    const rows = types.map(t2 => ({ t: t2, r: fieldRoi(t2, level, opts) }));
    const minRoi = Math.min(...rows.map(r => r.r.roiDays));
    return rows.map(r => ({ ...r, best: r.r.roiDays === minRoi }));
  }, [level, bonus, oasis, gold]);

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Field ROI Calculator' : '資源田 ROI 計算器'}</h2>
        <p>{lang === 'en'
          ? 'Days to break even on a single field upgrade. Lower ROI = upgrade first. Lumi convention: L1 compares against zero production; L2+ against previous level. Bonuses stack additively (1 + bonus_building% + oasis% + gold%). Validated against Lumi Table 2 (Wood L7 = 6.46 days exact match).'
          : '升一級資源田，幾天回本。ROI 越短越優先。Lumi 慣例：L1 比對 0 產量、L2+ 比對前一級。加成以加法疊加（1 + 加成建築% + 綠洲% + 金幣%）。已對照 Lumi Table 2 驗證（Wood L7 = 6.46 天完全吻合）。'}</p>
      </div>

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Inputs' : '輸入'}</h4>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Resource type' : '資源類型'}</label>
            <select value={type} onChange={e => setType(e.target.value as ResourceType)}>
              {(['wood', 'clay', 'iron', 'crop'] as ResourceType[]).map(rt => (
                <option key={rt} value={rt}>{t(TYPE_LABELS[rt])}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Target level' : '目標等級'}</label>
            <select value={level} onChange={e => setLevel(+e.target.value)}>
              {Array.from({ length: 20 }, (_, i) => i + 1).map(L => (
                <option key={L} value={L}>Lv {L}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Bonus building % (0–25, crop up to 50)' : '加成建築 %（0–25，糧食 0–50）'}</label>
            <select value={bonus} onChange={e => setBonus(+e.target.value)}>
              <option value={0}>0% (none)</option>
              <option value={0.05}>+5% (Lv 1)</option>
              <option value={0.10}>+10% (Lv 2)</option>
              <option value={0.15}>+15% (Lv 3)</option>
              <option value={0.20}>+20% (Lv 4)</option>
              <option value={0.25}>+25% (Lv 5)</option>
              <option value={0.35}>+35% (crop: Mill 5 + Bakery 2)</option>
              <option value={0.50}>+50% (crop: Mill 5 + Bakery 5)</option>
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Oasis %' : '綠洲 %'}</label>
            <select value={oasis} onChange={e => setOasis(+e.target.value)}>
              <option value={0}>0%</option>
              <option value={0.25}>+25%</option>
              <option value={0.50}>+50%</option>
              <option value={0.75}>+75% (3×25)</option>
              <option value={1.00}>+100% (2×50)</option>
              <option value={1.50}>+150% (3×50, crop only)</option>
            </select>
          </div>

          <label className={s.check}>
            <input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} />
            {lang === 'en' ? 'Plus +25% gold production bonus' : 'Plus +25% 金幣產量加成'}
          </label>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Result' : '結果'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Upgrade cost (total)' : '升級成本（合計）'}</span><span className={s.value}>{fmt(result.cost)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /hr' : '每小時產量增加'}</span><span className={s.value}>+{fmt(result.productionGainPerHour)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /day' : '每天產量增加'}</span><span className={s.value}>+{fmt(result.productionGainPerDay)}</span></div>
          <div className={s.row}><span className={s.label}>ROI</span><span className={`${s.value} ${s.highlight}`}>{result.roiDays.toFixed(2)} {lang === 'en' ? 'days' : '天'}</span></div>

          <div className={s.note}>
            {lang === 'en' ? 'Cost breakdown (W / C / I / Cr): ' : '成本拆解 (木 / 土 / 鐵 / 糧)：'}
            {fmt(breakdown.wood)} / {fmt(breakdown.clay)} / {fmt(breakdown.iron)} / {fmt(breakdown.crop)}
          </div>

          <h4>{lang === 'en' ? 'Compare 4 resources at this level' : '四種資源 ROI 對照（同等級、同參數）'}</h4>
          <table className={s.table}>
            <thead><tr><th>{lang === 'en' ? 'Type' : '類型'}</th><th>{lang === 'en' ? 'Cost' : '成本'}</th><th>Δ /day</th><th>ROI ({lang === 'en' ? 'days' : '天'})</th></tr></thead>
            <tbody>
              {compareRows.map(({ t: t2, r, best }) => (
                <tr key={t2} className={best ? s.tableRowHi : ''}>
                  <td>{t(TYPE_LABELS[t2])}</td>
                  <td>{fmt(r.cost)}</td>
                  <td>{fmt(r.productionGainPerDay)}</td>
                  <td>{r.roiDays.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

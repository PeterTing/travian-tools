import { useState, useMemo } from 'react';
import { fieldRoi, FIELD_COSTS, type ResourceType } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';

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

  const result = useMemo(() => {
    const opts = { goldBonus: gold ? 0.25 : 0, bonusBuildingPct: bonus, oasisPct: oasis };
    return fieldRoi(type, level, opts);
  }, [type, level, bonus, oasis, gold]);
  const breakdown = FIELD_COSTS[type][level - 1];

  const compareRows = useMemo(() => {
    const opts = { goldBonus: gold ? 0.25 : 0, bonusBuildingPct: bonus, oasisPct: oasis };
    const types: ResourceType[] = ['wood', 'clay', 'iron', 'crop'];
    const rows = types.map(t2 => ({ t: t2, r: fieldRoi(t2, level, opts) }));
    const minRoi = Math.min(...rows.map(r => r.r.roiDays));
    return rows.map(r => ({ ...r, best: r.r.roiDays === minRoi }));
  }, [level, bonus, oasis, gold]);

  return (
    <>
      <div className={s.intro}>
        {/* Validation vs Lumi Table 2 (Wood L7 = 6.46d) lives in calculators.regression.test.ts */}
        <h2>{lang === 'en' ? 'Field ROI' : '田地回本'}</h2>
        <p>{lang === 'en'
          ? 'How many days until a field upgrade pays for itself. Fewer days = upgrade that field first. Building, oasis, and Plus bonuses all add together.'
          : '升一級資源田要幾天回本，天數越少越值得先升。加成建築、綠洲與 Plus 金幣加成會一起算進去。'}</p>
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

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Result' : '結果'}
          primary={<>{result.roiDays.toFixed(2)} {lang === 'en' ? 'days' : '天'}</>}
          secondary={
            lang === 'en'
              ? `Cost ${fmt(result.cost)} · +${fmt(result.productionGainPerDay)}/day`
              : `成本 ${fmt(result.cost)} · 每天 +${fmt(result.productionGainPerDay)}`
          }
        >
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Upgrade cost (total)' : '升級成本（合計）'}</span><span className={s.value}>{fmt(result.cost)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /hr' : '每小時產量增加'}</span><span className={s.value}>+{fmt(result.productionGainPerHour)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /day' : '每天產量增加'}</span><span className={s.value}>+{fmt(result.productionGainPerDay)}</span></div>

          <div className={s.note}>
            {lang === 'en' ? 'Cost breakdown (W / C / I / Cr): ' : '成本拆解 (木 / 土 / 鐵 / 糧)：'}
            {fmt(breakdown.wood)} / {fmt(breakdown.clay)} / {fmt(breakdown.iron)} / {fmt(breakdown.crop)}
          </div>

          <h4>{lang === 'en' ? 'Same level, all four resources' : '同等級四種資源比較'}</h4>
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
        </CalcResultPanel>
      </div>
    </>
  );
}

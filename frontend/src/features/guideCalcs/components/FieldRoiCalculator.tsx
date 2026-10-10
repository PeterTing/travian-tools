import { useState, useMemo } from 'react';
import { fieldRoi, FIELD_COSTS, BONUS_BUILDINGS_VERIFIED, type ResourceType } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel, { SummaryPending } from './CalcResultPanel';
import type { PendingKind } from '@/lib/pendingNotes';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { CalcBar } from '@/components/autofill/CalcFrame'

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
  // 資源田 1–20 級花費、時間、產量：官方知識庫；Plus 乘在總產量上：官方 S129（P0-23）。
  // 加成建築（鋸木廠等）的資料哪天又標待驗證，這裡會自動帶回灰標
  const costKinds: PendingKind[] = [];
  // 目標 1 級：增加量 = 1 級 − 0 級，0 級產量官方資料沒有（fieldLevelZero）
  const prodKinds: PendingKind[] = [
    ...(level === 1 ? ['fieldLevelZero' as const] : []),
    ...(bonus > 0 && !BONUS_BUILDINGS_VERIFIED ? ['building' as const] : []),
  ];
  // 一行一個灰標，依數字在這一行出現的順序：先「成本」、再「每天 +」（同一種只列一次）
  const lineKinds: PendingKind[] = [...new Set<PendingKind>([...costKinds, ...prodKinds])];

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
        <h2>{lang === 'en' ? 'Field ROI (normal village)' : '田地回本（一般村）'}</h2>
        <p>{lang === 'en'
          ? 'How many days until a field upgrade pays for itself. Fewer days = upgrade that field first. Building, oasis, and Plus bonuses all add together.'
          : '升一級資源田要幾天回本，天數越少越值得先升。加成建築、綠洲與 Plus 金幣加成會一起算進去。'}</p>
      </div>
      <CalcBar />

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
                <option key={L} value={L}>{lang === 'en' ? `Lv ${L}` : `${L} 級`}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Bonus building % (0–25, crop up to 50)' : '加成建築 %（0–25，糧食 0–50）'}</label>
            <select value={bonus} onChange={e => setBonus(+e.target.value)}>
              <option value={0}>{lang === 'en' ? '0% (none)' : '0%（沒有）'}</option>
              <option value={0.05}>{lang === 'en' ? '+5% (Lv 1)' : '+5%（1 級）'}</option>
              <option value={0.10}>{lang === 'en' ? '+10% (Lv 2)' : '+10%（2 級）'}</option>
              <option value={0.15}>{lang === 'en' ? '+15% (Lv 3)' : '+15%（3 級）'}</option>
              <option value={0.20}>{lang === 'en' ? '+20% (Lv 4)' : '+20%（4 級）'}</option>
              <option value={0.25}>{lang === 'en' ? '+25% (Lv 5)' : '+25%（5 級）'}</option>
              <option value={0.35}>{lang === 'en' ? '+35% (crop: Mill 5 + Bakery 2)' : '+35%（糧：麵粉廠 5＋麵包店 2）'}</option>
              <option value={0.50}>{lang === 'en' ? '+50% (crop: Mill 5 + Bakery 5)' : '+50%（糧：麵粉廠 5＋麵包店 5）'}</option>
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Oasis %' : '綠洲 %'}</label>
            <select value={oasis} onChange={e => setOasis(+e.target.value)}>
              <option value={0}>0%</option>
              <option value={0.25}>+25%</option>
              <option value={0.50}>+50%</option>
              <option value={0.75}>{lang === 'en' ? '+75% (3×25)' : '+75%（3 塊 25%）'}</option>
              <option value={1.00}>{lang === 'en' ? '+100% (2×50)' : '+100%（2 塊 50%）'}</option>
              <option value={1.50}>{lang === 'en' ? '+150% (3×50, crop only)' : '+150%（3 塊 50%，只有糧）'}</option>
            </select>
          </div>

          <label className={s.check}>
            <input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} />
            {lang === 'en' ? 'Plus +25% gold production bonus' : 'Plus 產量 +25%（金幣）'}
          </label>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Result' : '結果'}
          primary={<>{result.roiDays.toFixed(2)} {lang === 'en' ? 'days' : '天'}</>}
          secondary={
            // 回本天數就是這一行兩個數字相除：灰標放這一行（標題不重複放）
            <SummaryPending kinds={lineKinds} testId="field-roi-summary">
              {lang === 'en'
                ? `Cost ${fmt(result.cost)} · +${fmt(result.productionGainPerDay)}/day`
                : `成本 ${fmt(result.cost)} · 每天 +${fmt(result.productionGainPerDay)}`}
            </SummaryPending>
          }
        >
          {/* 明細有用到待驗證資料的數字都跟著灰標（PM 規則）；PendingRow 在沒灰標時跟一般列一樣 */}
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Upgrade cost (total)' : '升級成本（合計）'}{costKinds.length ? <> <PendingVerifyChip kinds={costKinds} /></> : null}</span><span className={s.value}>{fmt(result.cost)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /hr' : '每小時產量增加'}{prodKinds.length ? <> <PendingVerifyChip kinds={prodKinds} /></> : null}</span><span className={s.value}>+{fmt(result.productionGainPerHour)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Production gain /day' : '每天產量增加'}{prodKinds.length ? <> <PendingVerifyChip kinds={prodKinds} /></> : null}</span><span className={s.value}>+{fmt(result.productionGainPerDay)}</span></PendingRow>

          <div className={s.note}>
            {lang === 'en' ? 'Cost breakdown (W / C / I / Cr): ' : '成本拆解 (木 / 土 / 鐵 / 糧)：'}
            {fmt(breakdown.wood)} / {fmt(breakdown.clay)} / {fmt(breakdown.iron)} / {fmt(breakdown.crop)}
          </div>

          <h4>{lang === 'en' ? 'Same level, all four resources' : '同等級四種資源比較'}</h4>
          <table className={`${s.table} ${s.tapRows}`} data-testid="field-roi-compare">
            <thead>
              <PendingRow as="tr" className="h-11" tableColSpan={4}>
                <th>{lang === 'en' ? 'Type' : '類型'}</th>
                {/* 一行一個灰標：成本欄、Δ/day 欄的待驗證資料依欄位順序 */}
                <th>{lang === 'en' ? 'Cost' : '成本'}{lineKinds.length ? <> <PendingVerifyChip kinds={lineKinds} /></> : null}</th>
                <th>Δ /day</th><th>ROI ({lang === 'en' ? 'days' : '天'})</th>
              </PendingRow>
            </thead>
            <tbody>
              {compareRows.map(({ t: t2, r, best }) => (
                <tr key={t2} className={`h-11 ${best ? s.tableRowHi : ''}`}>
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

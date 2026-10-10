import { useState, useMemo } from 'react';
import {
  CROPPER_LAYOUTS, OASIS_TYPES, FIELD_PRODUCTION,
  hmCumulativeCost, type CropperId, type ResourceType,
} from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import { CalcBar } from '@/components/autofill/CalcFrame'

const fmt = (n: number) => isFinite(n)
  ? (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1).replace(/\.0$/, ''))
  : '—';

function verdict(roi: number, lang: 'zh' | 'en') {
  if (roi < 5) return lang === 'en' ? '🟢 Very worth it' : '🟢 非常值得';
  if (roi < 15) return lang === 'en' ? '🟡 Worth it' : '🟡 值得';
  if (roi < 40) return lang === 'en' ? '🟠 Marginal' : '🟠 邊際';
  return lang === 'en' ? '🔴 Not recommended' : '🔴 不建議';
}

export default function OasisRoiCalculator() {
  const { lang, t } = useLang();
  const [cropper, setCropper] = useState<CropperId>('15c');
  const [fieldLv, setFieldLv] = useState(10);
  const [oasisId, setOasisId] = useState('single50_crop');
  const [hm, setHm] = useState(10);
  // 英雄宅現在幾級：只算「從現在升到目標」的增量花費（稽核 2026-10-10：以前用 1 級起的累積花費，回本天數高估）
  const [hmNow, setHmNow] = useState(0);
  // 清綠洲動物的兵損，折成資源（選填）
  const [clearText, setClearText] = useState('');
  const clearCost = Math.max(0, Number(clearText) || 0);
  // 金幣產量加成預設不勾（不是每個人都開，官方 S129）
  const [gold, setGold] = useState(false);
  const from = Math.min(hmNow, hm);
  const hmCost = hmCumulativeCost(hm) - hmCumulativeCost(from);
  const totalCost = hmCost + clearCost;

  const layout = CROPPER_LAYOUTS.find(l => l.id === cropper)!;

  const dailyGain = useMemo(() => {
    const base = FIELD_PRODUCTION[fieldLv];
    const oasis = OASIS_TYPES.find(o => o.id === oasisId);
    if (!base || !oasis) return 0;
    const counts: Record<ResourceType, number> = { wood: layout.wood, clay: layout.clay, iron: layout.iron, crop: layout.crop };
    let total = 0;
    Object.entries(oasis.bonuses).forEach(([k, v]) => {
      total += counts[k as ResourceType] * base * (v ?? 0);
    });
    return total * 24 * (gold ? 1.25 : 1);
  }, [layout, fieldLv, oasisId, gold]);

  const roi = useMemo(() => totalCost / dailyGain, [totalCost, dailyGain]);

  return (
    <>
      <div className={s.intro}>
        {/* HM costs from T4 formulas; see data/travian.ts + regression tests */}
        <h2>{lang === 'en' ? 'Oasis ROI' : '綠洲回本'}</h2>
        <p>{lang === 'en'
          ? "How many days until the Hero's Mansion that captured an oasis pays for itself. Mansion Lv 10 / 15 / 20 can hold 1 / 2 / 3 oases."
          : '算佔領綠洲所需的英雄宅要幾天回本。英雄宅 10／15／20 級分別可佔 1／2／3 塊綠洲。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Inputs' : '輸入'}</h4>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Capital type' : '首都類型'}</label>
            <select value={cropper} onChange={e => setCropper(e.target.value as CropperId)}>
              {CROPPER_LAYOUTS.map(l => (
                <option key={l.id} value={l.id}>{t(l.name)}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Field level (all)' : '田地等級（所有）'}</label>
            <select value={fieldLv} onChange={e => setFieldLv(+e.target.value)}>
              {Array.from({ length: 16 }, (_, i) => i + 5).map(L => (
                <option key={L} value={L}>{lang === 'en' ? `Lv ${L}` : `${L} 級`}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Oasis type' : '綠洲類型'}</label>
            <select value={oasisId} onChange={e => setOasisId(e.target.value)}>
              {OASIS_TYPES.map(o => (
                <option key={o.id} value={o.id}>{t(o.label)}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? "Hero's Mansion target" : '英雄宅目標等級'}</label>
            <select value={hm} data-testid="oasis-hm-target" onChange={e => { const v = +e.target.value; setHm(v); setHmNow(v === 10 ? 0 : v - 5); }}>
              <option value={10}>{lang === 'en' ? 'Lv 10 (+1 oasis)' : '10 級（可佔 1 塊綠洲）'}</option>
              <option value={15}>{lang === 'en' ? 'Lv 15 (+2 oases)' : '15 級（可佔 2 塊綠洲）'}</option>
              <option value={20}>{lang === 'en' ? 'Lv 20 (+3 oases)' : '20 級（可佔 3 塊綠洲）'}</option>
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? "Hero's Mansion now" : '英雄宅現在幾級'}</label>
            <select value={hmNow} data-testid="oasis-hm-now" onChange={e => setHmNow(+e.target.value)}>
              {Array.from({ length: hm }, (_, i) => i).map(L => (
                <option key={L} value={L}>{lang === 'en' ? (L === 0 ? 'Not built' : `Lv ${L}`) : (L === 0 ? '還沒蓋' : `${L} 級`)}</option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Clearing losses (resources, optional)' : '清綠洲動物的兵損（換算資源，選填）'}</label>
            <input type="number" min={0} value={clearText} data-testid="oasis-clear-cost"
                   onChange={e => setClearText(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>

          <label className={s.check}>
            <input type="checkbox" checked={gold} data-testid="oasis-gold" onChange={e => setGold(e.target.checked)} />
            {lang === 'en' ? 'Gold production bonus +25%' : '金幣產量加成 +25%'}
          </label>

          <div className={s.note}>
            {lang === 'en'
              ? 'This is for one oasis. For several, run once each, or set the combined oasis % in Field ROI.'
              : '這裡只算一塊綠洲。若佔多塊，請分開算，或到「資源田與首都規劃」把綠洲％加總。'}
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Result' : '結果'}
          primary={<>{roi.toFixed(2)} {lang === 'en' ? 'days' : '天'}</>}
          secondary={
            // 資源田產量、英雄宅花費：官方知識庫；Plus 乘在總產量上：官方說明頁 S129（P0-23）
            lang === 'en'
              ? `+${fmt(dailyGain)}/day · mansion cost ${fmt(hmCost)}${clearCost > 0 ? ` · clearing ${fmt(clearCost)}` : ''}`
              : `每天 +${fmt(dailyGain)} · 英雄宅成本 ${fmt(hmCost)}${clearCost > 0 ? ` · 清怪 ${fmt(clearCost)}` : ''}`
          }
        >
          <div className={s.row}><span className={s.label}>{lang === 'en' ? `Mansion ${from} → ${hm}` : `英雄宅 ${from} → ${hm} 級`}</span><span className={s.value} data-testid="oasis-hm-cost">{fmt(hmCost)}</span></div>
          {clearCost > 0 && (
            <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Clearing losses' : '清綠洲兵損'}</span><span className={s.value}>{fmt(clearCost)}</span></div>
          )}
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /hr from this oasis' : '此綠洲每小時產量'}</span><span className={s.value}>+{fmt(dailyGain / 24)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /day' : '每天'}</span><span className={s.value}>+{fmt(dailyGain)}</span></div>

          <h4>{lang === 'en' ? 'Each extra oasis slot (from the previous slot)' : '每多一格綠洲（從上一格升上來）'}</h4>
          {/* 每列 44px、垂直置中，點擊範圍不重疊 */}
          <table className={`${s.table} ${s.tapRows}`} data-testid="oasis-hm-compare">
            <thead>
              <tr className="h-11">
                <th>{lang === 'en' ? 'Mansion' : '英雄宅'}</th>
                <th>{lang === 'en' ? 'Cost' : '成本'}</th>
                <th>ROI</th>
                <th>{lang === 'en' ? 'Verdict' : '判斷'}</th>
              </tr>
            </thead>
            <tbody>
              {[10, 15, 20].map(L => {
                // 10 級從 0 開始；15 級從 10 級、20 級從 15 級升上來（增量）
                const c = hmCumulativeCost(L) - hmCumulativeCost(L === 10 ? 0 : L - 5) + clearCost;
                const r = c / dailyGain;
                return (
                  <tr key={L} className={`h-11 ${L === hm ? s.tableRowHi : ''}`}>
                    <td>{lang === 'en' ? `Lv ${L === 10 ? 0 : L - 5} → ${L}` : `${L === 10 ? 0 : L - 5} → ${L} 級`}</td>
                    <td>{fmt(c)}</td>
                    <td>{r.toFixed(2)}</td>
                    <td>{verdict(r, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CalcResultPanel>
      </div>
    </>
  );
}

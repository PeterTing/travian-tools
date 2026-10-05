import { useState, useMemo } from 'react';
import {
  CROPPER_LAYOUTS, OASIS_TYPES, FIELD_PRODUCTION,
  hmCumulativeCost, type CropperId, type ResourceType,
} from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

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
  const [gold, setGold] = useState(true);

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
  }, [cropper, fieldLv, oasisId, gold]);

  const roi = useMemo(() => hmCumulativeCost(hm) / dailyGain, [hm, dailyGain]);

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Oasis ROI Calculator' : '綠洲 ROI 計算器'}</h2>
        <p>{lang === 'en'
          ? "How many days does an oasis pay back the Hero's Mansion that captured it? HM Lv 10/15/20 → 1/2/3 oases. HM cost derived directly from kirilloid T4 source (base [80,120,70,90], k=1.33). Note: Lumi's published ROI table uses older HM costs ~5× higher — modern T4 makes oasis capture much cheaper than Lumi implies."
          : "佔領綠洲所需的英雄宅多少天可回本？HM Lv 10/15/20 各可佔 1/2/3 塊。HM 成本依 kirilloid T4 原始碼（base [80,120,70,90], k=1.33）計算。注意：Lumi 指南內的 ROI 表格用的是舊版 HM 成本（約 5 倍高）；現代 T4 佔綠洲比 Lumi 數字短很多。"}</p>
      </div>

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
                <option key={L} value={L}>Lv {L}</option>
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
            <select value={hm} onChange={e => setHm(+e.target.value)}>
              <option value={10}>Lv 10 (+1 oasis)</option>
              <option value={15}>Lv 15 (+2 oases)</option>
              <option value={20}>Lv 20 (+3 oases)</option>
            </select>
          </div>

          <label className={s.check}>
            <input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} />
            Plus +25% {lang === 'en' ? 'gold' : '金幣'}
          </label>

          <div className={s.note}>
            {lang === 'en'
              ? 'Calculates only the gain from this single oasis. Hold multiple oases? Run this for each, or use the Field-ROI calculator with the combined oasis %.'
              : '只計算此單一綠洲的每日增益。要佔多塊請分別評估，或在「資源田 ROI」裡用綠洲 % 疊加。'}
          </div>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Result' : '結果'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'HM cumulative cost' : '英雄宅累積成本'}</span><span className={s.value}>{fmt(hmCumulativeCost(hm))}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /hr from this oasis' : '此綠洲每小時產量'}</span><span className={s.value}>+{fmt(dailyGain / 24)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /day' : '每天'}</span><span className={s.value}>+{fmt(dailyGain)}</span></div>
          <div className={s.row}><span className={s.label}>ROI</span><span className={`${s.value} ${s.highlight}`}>{roi.toFixed(2)} {lang === 'en' ? 'days' : '天'}</span></div>

          <h4>{lang === 'en' ? 'Compare 3 HM levels' : '比較三種 HM 等級'}</h4>
          <table className={s.table}>
            <thead><tr><th>HM</th><th>{lang === 'en' ? 'Cost' : '成本'}</th><th>ROI</th><th>{lang === 'en' ? 'Verdict' : '判斷'}</th></tr></thead>
            <tbody>
              {[10, 15, 20].map(L => {
                const c = hmCumulativeCost(L);
                const r = c / dailyGain;
                return (
                  <tr key={L} className={L === hm ? s.tableRowHi : ''}>
                    <td>Lv {L}</td>
                    <td>{fmt(c)}</td>
                    <td>{r.toFixed(2)}</td>
                    <td>{verdict(r, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

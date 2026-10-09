import { useState, useMemo } from 'react';
import {
  CROPPER_LAYOUTS, OASIS_TYPES, FIELD_PRODUCTION,
  hmCumulativeCost, type CropperId, type ResourceType,
} from '../data/travian';
import PendingVerifyChip from '@/components/common/PendingVerifyChip';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';

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
  }, [layout, fieldLv, oasisId, gold]);

  const roi = useMemo(() => hmCumulativeCost(hm) / dailyGain, [hm, dailyGain]);

  return (
    <>
      <div className={s.intro}>
        {/* HM costs from T4 formulas; see data/travian.ts + regression tests */}
        <h2>{lang === 'en' ? 'Oasis ROI' : '綠洲回本'}</h2>
        <p>{lang === 'en'
          ? "How many days until the Hero's Mansion that captured an oasis pays for itself. Mansion Lv 10 / 15 / 20 can hold 1 / 2 / 3 oases."
          : '算佔領綠洲所需的英雄宅要幾天回本。英雄宅 10／15／20 級分別可佔 1／2／3 塊綠洲。'}</p>
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
              ? 'This is for one oasis. For several, run once each, or set the combined oasis % in Field ROI.'
              : '這裡只算一塊綠洲。若佔多塊，請分開算，或到「田地回本」把綠洲％加總。'}
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Result' : '結果'}
          primary={<>{roi.toFixed(2)} {lang === 'en' ? 'days' : '天'}</>}
          secondary={
            lang === 'en'
              ? `+${fmt(dailyGain)}/day · mansion cost ${fmt(hmCumulativeCost(hm))}`
              : `每天 +${fmt(dailyGain)} · 英雄宅成本 ${fmt(hmCumulativeCost(hm))}`
          }
        >
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'HM cumulative cost' : '英雄宅累積成本'} <PendingVerifyChip /></span><span className={s.value}>{fmt(hmCumulativeCost(hm))}</span></div>
          <p className="mb-2 text-xs text-gray-500" data-testid="hm-pending-note">
            {lang === 'en'
              ? 'Not yet confirmed in-game (T4 cost 80/120/70/90, ×1.33 per level)'
              : '這個數值還沒在遊戲裡實測確認（英雄宅花費用 T4 數值 80/120/70/90，每級 ×1.33）'}
          </p>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /hr from this oasis' : '此綠洲每小時產量'}</span><span className={s.value}>+{fmt(dailyGain / 24)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Gain /day' : '每天'}</span><span className={s.value}>+{fmt(dailyGain)}</span></div>

          <h4>{lang === 'en' ? 'Compare 3 mansion levels' : '比較三種英雄宅等級'}</h4>
          <table className={s.table}>
            <thead><tr><th>{lang === 'en' ? 'Mansion' : '英雄宅'}</th><th>{lang === 'en' ? 'Cost' : '成本'}</th><th>ROI</th><th>{lang === 'en' ? 'Verdict' : '判斷'}</th></tr></thead>
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
        </CalcResultPanel>
      </div>
    </>
  );
}

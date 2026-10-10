import { useState, useMemo } from 'react';
import { MERCHANTS, merchantCapacity, type TribeId } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel, { SummaryPending } from './CalcResultPanel';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import type { PendingKind } from '@/lib/pendingNotes'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'
import { ingameTribeName } from '@/lib/ingameNames';

const fmtInt = (n: number) => isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
const fmtHr = (h: number) => {
  if (!isFinite(h)) return '—';
  const totalMin = Math.round(h * 60);
  const H = Math.floor(totalMin / 60);
  const M = totalMin % 60;
  return (H ? `${H}h ` : '') + `${M}m`;
};

export default function TraderouteCalculator() {
  const { lang } = useLang();
  // 部族預設跟「已帶入」列的帳號
  const { tribe: accountTribe } = useAutoFill();
  const [tribe, setTribe] = useState<TribeId>(() => (accountTribe && accountTribe in MERCHANTS ? accountTribe as TribeId : 'gauls'));
  const [office, setOffice] = useState(10);
  const [dist, setDist] = useState(30);
  const [surplus, setSurplus] = useState({ wood: 5000, clay: 5000, iron: 5000, crop: 2000 });

  const cap = merchantCapacity(tribe, office);
  const speed = MERCHANTS[tribe].speed;
  const oneWay = dist / speed;
  const roundTrip = oneWay * 2;
  // 待驗證：容量受交易所影響的數字，交易所 > 0 級時改用 merchantTradeOffice（說明多寫「交易所加成」，取代 merchantCapacity）；
  // 速度、單程／往返、部族選單不受交易所影響，一律 merchantCapacity
  const capKind: PendingKind = office > 0 ? 'merchantTradeOffice' : 'merchantCapacity';

  const rows = useMemo(() => {
    const labels: Record<string, string> = lang === 'en'
      ? { wood: '🪵 Wood', clay: '🧱 Clay', iron: '⛏️ Iron', crop: '🌾 Crop' }
      : { wood: '🪵 木材', clay: '🧱 黏土', iron: '⛏️ 鐵礦', crop: '🌾 糧食' };
    return (['wood', 'clay', 'iron', 'crop'] as const).map(t => {
      const sur = Math.max(0, surplus[t]);
      const tripsHr = sur > 0 ? sur / cap : 0;
      const dedicated = tripsHr * roundTrip;
      return { t, label: labels[t], sur, tripsHr, dedicated };
    });
  }, [surplus, cap, roundTrip, lang]);

  const totalDed = rows.reduce((s, r) => s + r.dedicated, 0);
  const totalLabel =
    totalDed <= 1.5 ? `${totalDed.toFixed(1)} 🟢` :
    totalDed <= 3 ? `${totalDed.toFixed(1)} 🟡` :
    `${totalDed.toFixed(1)} 🔴`;

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Trade Route' : '貿易路線'}</h2>
        <p>{lang === 'en'
          ? "How many merchants you need to move a feeder village's hourly surplus. Tribe sets base capacity and speed; each Trade Office level adds +10% capacity (Romans +20%). Within about 60 fields, one or two merchants are often enough."
          : '算支援村每小時多出來的資源，要幾個商人才能搬完。部族決定基礎容量與速度；交易所每級多 10% 容量（羅馬人每級 20%）。大約 60 格以內，通常一到兩個商人就夠。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Setup' : '基本'}</h4>

          <div className={s.field}>
            {/* 選項裡有商人容量和速度：灰標放在欄位名稱旁（不放進 label，免得點名稱變成點灰標） */}
            <PendingRow className="flex min-h-11 items-center gap-1">
              <label htmlFor="traderoute-tribe">{lang === 'en' ? 'Tribe' : '部族'}</label>
              <PendingVerifyChip kind="merchantCapacity" />
            </PendingRow>
            <select id="traderoute-tribe" value={tribe} onChange={e => setTribe(e.target.value as TribeId)}>
              {Object.entries(MERCHANTS).map(([id, m]) => {
                const display = lang === 'en'
                  ? `${id.charAt(0).toUpperCase() + id.slice(1)} (${m.capacity}/${m.speed})`
                  : `${ingameTribeName(id)}（容量 ${m.capacity}、速度 ${m.speed}）`;
                return <option key={id} value={id}>{display}</option>;
              })}
            </select>
          </div>

          <div className="mb-3.5">
            <Stepper label={lang === 'en' ? 'Trade Office level (0–20)' : '交易所等級 (0–20)'} value={office} onChange={setOffice} min={0} max={20} />
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input type="number" min={1} max={500} value={dist} onChange={e => setDist(+e.target.value)} />
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Hourly surplus to ship' : '每小時送出量'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>{lang === 'en' ? 'Wood' : '木材'}</label><input type="number" min={0} value={surplus.wood} onChange={e => setSurplus(p => ({ ...p, wood: +e.target.value }))} /></div>
            <div className={s.field}><label>{lang === 'en' ? 'Clay' : '黏土'}</label><input type="number" min={0} value={surplus.clay} onChange={e => setSurplus(p => ({ ...p, clay: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>{lang === 'en' ? 'Iron' : '鐵礦'}</label><input type="number" min={0} value={surplus.iron} onChange={e => setSurplus(p => ({ ...p, iron: +e.target.value }))} /></div>
            <div className={s.field}><label>{lang === 'en' ? 'Crop' : '糧食'}</label><input type="number" min={0} value={surplus.crop} onChange={e => setSurplus(p => ({ ...p, crop: +e.target.value }))} /></div>
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Merchants needed' : '所需商人'}
          primary={<>{totalLabel}</>}
          secondary={
            // 所需商人、容量、往返都用同一份社群 wiki 的商人容量和速度：只在第二行放一個灰標，標題不重複（PM 去重）
            <SummaryPending kind={capKind} testId="traderoute-summary">
              {lang === 'en'
                ? `Cap ${fmtInt(cap)} · round trip ${fmtHr(roundTrip)}`
                : `容量 ${fmtInt(cap)} · 往返 ${fmtHr(roundTrip)}`}
            </SummaryPending>
          }
        >
          <h4>{lang === 'en' ? 'Merchant specs' : '商人規格'}</h4>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Capacity per merchant (incl. Trade Office)' : '每商人容量（含交易所）'} <PendingVerifyChip kind={capKind} /></span><span className={s.value}>{fmtInt(cap)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Speed' : '速度'} <PendingVerifyChip kind="merchantCapacity" /></span><span className={s.value}>{speed} {lang === 'en' ? 'tiles/hr' : '格/小時'}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way / round trip' : '單程 / 往返'} <PendingVerifyChip kind="merchantCapacity" /></span><span className={s.value}>{fmtHr(oneWay)} / {fmtHr(roundTrip)}</span></PendingRow>

          <h4>{lang === 'en' ? 'Merchants needed (1 hour cycle)' : '所需商人（每小時送完）'}</h4>
          {/* 次數用商人容量、常駐也用往返時間（速度）算：表頭放一個灰標；每列 44px、垂直置中 */}
          <table className={`${s.table} ${s.tapRows}`} data-testid="traderoute-table">
            <thead>
              <PendingRow as="tr" className="h-11" tableColSpan={4}>
                <th>{lang === 'en' ? 'Resource' : '資源'}</th><th>/ hr</th>
                <th>{lang === 'en' ? 'Trips/hr' : '次數'} <PendingVerifyChip kind={capKind} /></th>
                <th>{lang === 'en' ? 'Dedicated' : '常駐'}</th>
              </PendingRow>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.t} className="h-11"><td>{r.label}</td><td>{fmtInt(r.sur)}</td><td>{r.tripsHr.toFixed(2)}</td><td>{r.dedicated.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>

          <PendingRow className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? 'Total merchants' : '總商人'} <PendingVerifyChip kind={capKind} /></span><span className={`${s.value} ${s.highlight}`}>{totalLabel}</span></PendingRow>

          <div className={s.note}>
            {lang === 'en'
              ? 'If you need more merchants than you have, raise the Trade Office or shorten the distance.'
              : '若算出來要的商人比你現有的多，就升交易所或縮短距離。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}

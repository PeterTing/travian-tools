import { useState, useMemo } from 'react';
import { MERCHANTS, merchantCapacity, type TribeId } from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

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
  const [tribe, setTribe] = useState<TribeId>('gauls');
  const [office, setOffice] = useState(10);
  const [dist, setDist] = useState(30);
  const [surplus, setSurplus] = useState({ wood: 5000, clay: 5000, iron: 5000, crop: 2000 });

  const cap = merchantCapacity(tribe, office);
  const speed = MERCHANTS[tribe].speed;
  const oneWay = dist / speed;
  const roundTrip = oneWay * 2;

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

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Setup' : '基本'}</h4>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Tribe' : '部族'}</label>
            <select value={tribe} onChange={e => setTribe(e.target.value as TribeId)}>
              {Object.entries(MERCHANTS).map(([id, m]) => {
                const zhNames: Record<string, string> = {
                  romans: '羅馬人', gauls: '高盧人', teutons: '日耳曼人',
                  egyptians: '埃及人', huns: '匈奴', spartans: '斯巴達人', vikings: '維京人',
                };
                const display = lang === 'en'
                  ? `${id.charAt(0).toUpperCase() + id.slice(1)} (${m.capacity}/${m.speed})`
                  : `${zhNames[id]} (${m.capacity}/${m.speed})`;
                return <option key={id} value={id}>{display}</option>;
              })}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Trade Office level (0–20)' : '交易所等級 (0–20)'}</label>
            <input type="number" min={0} max={20} value={office} onChange={e => setOffice(+e.target.value)} />
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input type="number" min={1} max={500} value={dist} onChange={e => setDist(+e.target.value)} />
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Hourly surplus to ship' : '每小時送出量'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Wood</label><input type="number" min={0} value={surplus.wood} onChange={e => setSurplus(p => ({ ...p, wood: +e.target.value }))} /></div>
            <div className={s.field}><label>Clay</label><input type="number" min={0} value={surplus.clay} onChange={e => setSurplus(p => ({ ...p, clay: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Iron</label><input type="number" min={0} value={surplus.iron} onChange={e => setSurplus(p => ({ ...p, iron: +e.target.value }))} /></div>
            <div className={s.field}><label>Crop</label><input type="number" min={0} value={surplus.crop} onChange={e => setSurplus(p => ({ ...p, crop: +e.target.value }))} /></div>
          </div>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Merchant specs' : '商人規格'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Capacity per merchant (incl. Trade Office)' : '每商人容量（含交易所）'}</span><span className={s.value}>{fmtInt(cap)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Speed' : '速度'}</span><span className={s.value}>{speed} {lang === 'en' ? 'tiles/hr' : '格/小時'}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way / round trip' : '單程 / 往返'}</span><span className={s.value}>{fmtHr(oneWay)} / {fmtHr(roundTrip)}</span></div>

          <h4>{lang === 'en' ? 'Merchants needed (1 hour cycle)' : '所需商人（每小時送完）'}</h4>
          <table className={s.table}>
            <thead><tr><th>{lang === 'en' ? 'Resource' : '資源'}</th><th>/ hr</th><th>{lang === 'en' ? 'Trips/hr' : '次數'}</th><th>{lang === 'en' ? 'Dedicated' : '常駐'}</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.t}><td>{r.label}</td><td>{fmtInt(r.sur)}</td><td>{r.tripsHr.toFixed(2)}</td><td>{r.dedicated.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>

          <div className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? 'Total merchants' : '總商人'}</span><span className={`${s.value} ${s.highlight}`}>{totalLabel}</span></div>

          <div className={s.note}>
            {lang === 'en'
              ? 'If you need more merchants than you have, raise the Trade Office or shorten the distance.'
              : '若算出來要的商人比你現有的多，就升交易所或縮短距離。'}
          </div>
        </div>
      </div>
    </>
  );
}

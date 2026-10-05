import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

interface UnitOpt { id: string; label: { zh: string; en: string }; carry: number; speed: number; cost: number }
const UNITS: UnitOpt[] = [
  { id: 'tt',     label: { zh: 'TT (高盧人, 速 19)',     en: 'TT (Gaul, speed 19)' },     carry: 75, speed: 19, cost: 1090 },
  { id: 'ei',     label: { zh: 'EI (羅馬人, 速 14)',     en: 'EI (Roman, speed 14)' },    carry: 100, speed: 14, cost: 1410 },
  { id: 'steppe', label: { zh: 'Steppe Rider (匈, 速 16)',   en: 'Steppe Rider (Hun, speed 16)' },  carry: 115, speed: 16, cost: 895 },
  { id: 'paladin',label: { zh: 'Paladin (日耳曼人, 速 10)',en: 'Paladin (Teuton, speed 10)' },carry: 110, speed: 10, cost: 1005 },
  { id: 'club',   label: { zh: 'Clubswinger (日耳曼人, 速 7)', en: 'Clubswinger (Teuton, speed 7)' }, carry: 60, speed: 7, cost: 250 },
  { id: 'ec',     label: { zh: 'EC (羅馬人, 速 10)',     en: 'EC (Roman, speed 10)' },    carry: 70, speed: 10, cost: 2170 },
];

export function lumiBracket(pop: number, lang: 'zh' | 'en') {
  if (pop < 150) return { bracket: '< 150', n: 0,
    msg: lang === 'en' ? 'Usually skip' : '通常不值得' };
  if (pop < 400) return { bracket: '150–400', n: 1,
    msg: lang === 'en' ? '1 horse' : '1 馬' };
  if (pop < 550) return { bracket: '400–550', n: 2,
    msg: lang === 'en' ? '2 horses' : '2 馬' };
  return { bracket: '550+', n: 5,
    msg: lang === 'en' ? '3–7 horses (5 default)' : '3–7 馬（預設 5）' };
}

const fmtMin = (m: number) => {
  if (!isFinite(m)) return '—';
  if (m < 1) return `${(m * 60).toFixed(0)} s`;
  if (m < 60) return `${m.toFixed(1)} m`;
  const h = Math.floor(m / 60);
  return `${h}h ${Math.round(m % 60)}m`;
};

export default function FarmingCalculator() {
  const { lang } = useLang();
  const [pop, setPop] = useState(300);
  const [dist, setDist] = useState(10);
  const [unitId, setUnitId] = useState('steppe');
  const [freq, setFreq] = useState(15);
  const [loot, setLoot] = useState(400);

  const unit = UNITS.find(u => u.id === unitId)!;
  const rec = lumiBracket(pop, lang);

  const calc = useMemo(() => {
    const owMin = (dist / unit.speed) * 60;
    const rtMin = owMin * 2;
    const carryCap = rec.n * unit.carry;
    const maxRaidsHr = 60 / Math.max(freq, rtMin);
    const perRaid = Math.min(loot, carryCap);
    const daily = perRaid * maxRaidsHr * 24;
    const troopCost = rec.n * unit.cost;
    const payback = daily > 0 ? troopCost / daily : Infinity;
    return { owMin, carryCap, maxRaidsHr, daily, troopCost, payback };
  }, [pop, dist, unit, rec.n, freq, loot]);

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Farming Calculator' : '農場效率計算器'}</h2>
        <p>{lang === 'en'
          ? "Lumi's troop sizing for inactive farm targets, with daily yield estimate. Pop brackets: <150 skip, 150-400 = 1 horse, 400-550 = 2, 550+ = 3-7 (5 default). Tune per-raid loot from your actual battle reports."
          : 'Lumi 的目標農場兵數法則，含每日收益預估。人口分級：<150 略過、150-400 = 1 馬、400-550 = 2、550+ = 3-7（預設 5）。每次掠奪量請從實際戰報調整。'}</p>
      </div>

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Target & unit' : '目標 & 兵'}</h4>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Target population' : '目標村人口'}</label>
            <input type="number" min={0} max={2000} value={pop} onChange={e => setPop(+e.target.value)} />
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input type="number" min={1} max={50} value={dist} onChange={e => setDist(+e.target.value)} />
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Unit' : '單位'}</label>
            <select value={unitId} onChange={e => setUnitId(e.target.value)}>
              {UNITS.map(u => (
                <option key={u.id} value={u.id}>{lang === 'en' ? u.label.en : u.label.zh} · carry {u.carry}</option>
              ))}
            </select>
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Raid interval (min)' : '派送間隔（分）'}</label>
            <select value={freq} onChange={e => setFreq(+e.target.value)}>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Per-raid loot estimate' : '每次掠奪量估計'}</label>
            <input type="number" min={0} value={loot} onChange={e => setLoot(+e.target.value)} />
          </div>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Lumi recommendation' : 'Lumi 建議'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Pop bracket' : '人口區間'}</span><span className={s.value}>{rec.bracket}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Recommended count' : '建議兵數'}</span><span className={`${s.value} ${s.highlight}`}>{rec.msg}</span></div>

          <h4>{lang === 'en' ? 'Round-trip & haul' : '往返與搬運'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way' : '單程'}</span><span className={s.value}>{fmtMin(calc.owMin)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Carry cap (rec count)' : '搬運上限'}</span><span className={s.value}>{calc.carryCap.toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Max raids /hr' : '每小時最多次數'}</span><span className={s.value}>{calc.maxRaidsHr.toFixed(2)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Daily yield' : '每日預估收益'}</span><span className={`${s.value} ${s.highlight}`}>{Math.round(calc.daily).toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Initial troop cost' : '兵力初始成本'}</span><span className={s.value}>{calc.troopCost.toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Payback' : '回本天數'}</span><span className={s.value}>{isFinite(calc.payback) ? `${calc.payback.toFixed(2)} ${lang === 'en' ? 'days' : '天'}` : '—'}</span></div>

          <div className={s.note}>
            {lang === 'en'
              ? 'Yield = min(per-raid loot, carry cap) × raids/hr × 24. Lumi: probe new farms with 10 horses; once contested, drop to a count that just fills one haul.'
              : '收益 = min(每次掠奪量, 搬運上限) × 每小時次數 × 24。Lumi 提醒：新農場可先用 10 馬探底；一旦被搶就降到剛好搬滿一次的數量。'}
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';

import { unitSpeedValue, type SpeedTribeId } from '@/data/unitSpeeds';

// Speed comes from src/data/unitSpeeds.gen.json (P0-15 phase 1: ts11 in-game help).
// Carry and cost are the old values and have not been rebuilt yet (P0-15 later phases).
interface UnitOpt { id: string; name: { zh: string; en: string }; tribe: SpeedTribeId; feId: string; carry: number; speed: number; cost: number }
const UNIT_DEFS: Omit<UnitOpt, 'speed'>[] = [
  { id: 'tt',     name: { zh: 'TT (高盧人',             en: 'TT (Gaul' },             tribe: 'gauls',   feId: 'theutatesThunder',   carry: 75,  cost: 1090 },
  { id: 'ei',     name: { zh: 'EI (羅馬人',             en: 'EI (Roman' },            tribe: 'romans',  feId: 'equitesImperatoris', carry: 100, cost: 1410 },
  { id: 'steppe', name: { zh: 'Steppe Rider (匈',       en: 'Steppe Rider (Hun' },    tribe: 'huns',    feId: 'steppeRider',        carry: 115, cost: 895 },
  { id: 'paladin',name: { zh: 'Paladin (日耳曼人',      en: 'Paladin (Teuton' },      tribe: 'teutons', feId: 'paladin',            carry: 110, cost: 1005 },
  { id: 'club',   name: { zh: 'Clubswinger (日耳曼人',  en: 'Clubswinger (Teuton' },  tribe: 'teutons', feId: 'maceman',            carry: 60,  cost: 250 },
  { id: 'ec',     name: { zh: 'EC (羅馬人',             en: 'EC (Roman' },            tribe: 'romans',  feId: 'equitesCaesaris',    carry: 70,  cost: 2170 },
];
const UNITS: UnitOpt[] = UNIT_DEFS.map(u => {
  const speed = unitSpeedValue(u.tribe, u.feId);
  if (speed === null) throw new Error(`no speed for ${u.tribe}.${u.feId}`);
  return { ...u, speed };
});
const unitLabel = (u: UnitOpt, lang: 'zh' | 'en') =>
  lang === 'en' ? `${u.name.en}, speed ${u.speed})` : `${u.name.zh}, 速 ${u.speed})`;

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
  }, [dist, unit, rec.n, freq, loot]);

  return (
    <>
      <div className={s.intro}>
        {/* Pop brackets for horse counts — see lumiBracket() + regression tests */}
        <h2>{lang === 'en' ? 'Farming Yield' : '農場收益'}</h2>
        <p>{lang === 'en'
          ? 'Suggests how many horses to send to inactive targets and estimates daily loot. Under 150 pop: skip; 150–400: 1 horse; 400–550: 2; 550+: about 3–7 (default 5). Adjust loot per raid from your reports.'
          : '估算打不活躍村該派幾匹馬、一天大概能搶多少。人口不到 150 略過；150–400 派 1 匹；400–550 派 2 匹；550 以上大約 3–7 匹（預設 5）。每次搶到的量請依戰報調整。'}</p>
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
                <option key={u.id} value={u.id}>{unitLabel(u, lang)} · carry {u.carry}</option>
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

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Daily yield' : '每日收益'}
          primary={<>{Math.round(calc.daily).toLocaleString()}</>}
          secondary={rec.msg}
        >
          <h4>{lang === 'en' ? 'Suggested size' : '建議兵數'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Pop bracket' : '人口區間'}</span><span className={s.value}>{rec.bracket}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Recommended count' : '建議兵數'}</span><span className={s.value}>{rec.msg}</span></div>

          <h4>{lang === 'en' ? 'Round-trip & haul' : '往返與搬運'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way' : '單程'}</span><span className={s.value}>{fmtMin(calc.owMin)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Carry cap (rec count)' : '搬運上限'}</span><span className={s.value}>{calc.carryCap.toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Max raids /hr' : '每小時最多次數'}</span><span className={s.value}>{calc.maxRaidsHr.toFixed(2)}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Daily yield' : '每日預估收益'}</span><span className={`${s.value} ${s.highlight}`}>{Math.round(calc.daily).toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Initial troop cost' : '兵力初始成本'}</span><span className={s.value}>{calc.troopCost.toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Payback' : '回本天數'}</span><span className={s.value}>{isFinite(calc.payback) ? `${calc.payback.toFixed(2)} ${lang === 'en' ? 'days' : '天'}` : '—'}</span></div>

          <div className={s.note}>
            {lang === 'en'
              ? 'Daily yield uses the smaller of loot per raid and carry capacity, times raids per hour. For a new farm, try about 10 horses first; if others contest it, send only enough to fill one haul.'
              : '每日收益取「每次搶到的量」與「搬運上限」較小者，再乘每小時次數。新農場可先派約 10 匹馬探底；若常被搶，就降到剛好搬滿一次即可。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}

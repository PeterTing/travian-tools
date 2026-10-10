import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import Stepper from '@/components/common/Stepper'
import RangeNumberField, { outOfRange } from '@/components/common/RangeNumberField'
import { calculateTravelSeconds } from '@/lib/travianFormulas'
import { speedPendingKinds } from '@/lib/pendingNotes'

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

/** 秒數 → 遊戲裡的「H:MM:SS」 */
const fmtHms = (sec: number) => {
  if (!isFinite(sec)) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const x = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};

/**
 * 農場收益的計算（匯出給測試）：單程時間用全站共用的行軍公式（P0-22）——
 * 前 20 格原速，超過的路段 ×(1＋競技場×0.2＋靴子%)，再乘伺服器速度。
 */
export function farmingCalc(opts: { dist: number; unitSpeed: number; carry: number; cost: number; n: number; freq: number; loot: number; serverSpeed: number; arena: number; boots: number }) {
  const { dist, unitSpeed, carry, cost, n, freq, loot, serverSpeed, arena, boots } = opts;
  const owSec = calculateTravelSeconds({ distance: dist, unitSpeed, serverSpeed, tournamentSquareLevel: arena, heroBonusPercent: boots });
  const rtMin = (owSec * 2) / 60;
  const carryCap = n * carry;
  const maxRaidsHr = 60 / Math.max(freq, rtMin);
  const perRaid = Math.min(loot, carryCap);
  const daily = perRaid * maxRaidsHr * 24;
  const troopCost = n * cost;
  const payback = daily > 0 ? troopCost / daily : Infinity;
  return { owSec, carryCap, maxRaidsHr, daily, troopCost, payback };
}

export default function FarmingCalculator() {
  const { lang } = useLang();
  const [pop, setPop] = useState(300);
  const [dist, setDist] = useState(10);
  const [unitId, setUnitId] = useState('steppe');
  const [freq, setFreq] = useState(15);
  const [loot, setLoot] = useState(400);
  const [arena, setArena] = useState(0);
  const [boots, setBoots] = useState(0);
  const { speed: serverSpeed } = useAutoFill();
  const bootsOk = !outOfRange(boots, 0, 75);
  const speedKinds = speedPendingKinds(arena, bootsOk ? boots : 0);

  const unit = UNITS.find(u => u.id === unitId)!;
  const rec = lumiBracket(pop, lang);

  const calc = useMemo(
    () => farmingCalc({ dist, unitSpeed: unit.speed, carry: unit.carry, cost: unit.cost, n: rec.n, freq, loot, serverSpeed, arena, boots: bootsOk ? boots : 0 }),
    [dist, unit, rec.n, freq, loot, serverSpeed, arena, boots, bootsOk],
  );

  return (
    <>
      <div className={s.intro}>
        {/* Pop brackets for horse counts — see lumiBracket() + regression tests */}
        <h2>{lang === 'en' ? 'Farming Yield' : '農場收益'}</h2>
        <p>{lang === 'en'
          ? 'Suggests how many horses to send to inactive targets and estimates daily loot. Under 150 pop: skip; 150–400: 1 horse; 400–550: 2; 550+: about 3–7 (default 5). Adjust loot per raid from your reports.'
          : '估算打不活躍村該派幾匹馬、一天大概能搶多少。人口不到 150 略過；150–400 派 1 匹；400–550 派 2 匹；550 以上大約 3–7 匹（預設 5）。每次搶到的量請依戰報調整。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Target & unit' : '目標 & 兵'}</h4>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Target population' : '目標村人口'}</label>
            <input type="number" min={0} max={2000} value={pop} onChange={e => setPop(+e.target.value)} />
          </div>
          <div className={s.field}>
            <label>{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input type="number" min={1} max={300} value={dist} onChange={e => setDist(+e.target.value)} />
          </div>
          {/* 競技場、靴子只加快超過 20 格的路段（共用行軍公式，P0-22） */}
          <div className={s.field}>
            <Stepper label={lang === 'en' ? 'Tournament Square level' : '競技場等級'} value={arena} onChange={setArena} min={0} max={20} testId="farming-arena" />
          </div>
          <RangeNumberField
            className={s.field}
            labelClassName=""
            label={lang === 'en' ? 'Hero boots speed bonus (%)' : '英雄靴子速度加成（%）'}
            min={0}
            max={75}
            testId="farming-boots"
            value={boots}
            onChange={setBoots}
          />
          <div className={s.field}>
            {/* 選項裡有攜帶量：灰標放在欄位名稱旁（不放進 label，免得點名稱變成點灰標） */}
            <PendingRow className="flex min-h-11 items-center gap-1">
              <label htmlFor="farming-unit">{lang === 'en' ? 'Unit' : '單位'}</label>
              <PendingVerifyChip kind="unitCarry" />
            </PendingRow>
            <select id="farming-unit" value={unitId} onChange={e => setUnitId(e.target.value)}>
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
          // 摘要一個灰標，依序列出：攜帶量（社群整理）→ 行軍速度（有競技場／靴子才有，P0-22）；不放大數字旁
          titlePending={['unitCarry', ...speedKinds]}
          primary={<>{Math.round(calc.daily).toLocaleString()}</>}
          secondary={rec.msg}
        >
          <h4>{lang === 'en' ? 'Suggested size' : '建議兵數'}</h4>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Pop bracket' : '人口區間'}</span><span className={s.value}>{rec.bracket}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Recommended count' : '建議兵數'}</span><span className={s.value}>{rec.msg}</span></div>

          <h4>{lang === 'en' ? 'Round-trip & haul' : '往返與搬運'}</h4>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way' : '單程'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-one-way">{fmtHms(calc.owSec)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Carry cap (rec count)' : '搬運上限'} <PendingVerifyChip kind="unitCarry" /></span><span className={s.value}>{calc.carryCap.toLocaleString()}</span></PendingRow>
          {/* 每小時次數、每日收益、回本天數都用到單程時間：一列一個灰標，速度種類接在原本的後面（P0-22） */}
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Max raids /hr' : '每小時最多次數'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-raids-hr">{calc.maxRaidsHr.toFixed(2)}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Daily yield' : '每日預估收益'} <PendingVerifyChip kinds={['unitCarry', ...speedKinds]} /></span><span className={`${s.value} ${s.highlight}`}>{Math.round(calc.daily).toLocaleString()}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Initial troop cost' : '兵力初始成本'} <PendingVerifyChip kind="units" /></span><span className={s.value}>{calc.troopCost.toLocaleString()}</span></PendingRow>
          <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Payback' : '回本天數'} <PendingVerifyChip kinds={['units', ...speedKinds]} /></span><span className={s.value}>{isFinite(calc.payback) ? `${calc.payback.toFixed(2)} ${lang === 'en' ? 'days' : '天'}` : '—'}</span></PendingRow>

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

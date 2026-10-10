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
import { speedPendingKinds, type PendingKind } from '@/lib/pendingNotes'
import { totalCarry, missingCarryTribeReason, missingCarryKinds } from '@/lib/carry'

import { getTribe } from '../data/tribes';
import type { TribeId } from '../data/tribes-types';

// 速度、運載量、花費都來自產生檔（P0-18：ts11 遊戲內說明頁；scripts/game_data/gen_game_data.py），這裡不寫數字
// carry：null＝還沒核對（斯巴達、維京；P0-23 PM 決定留空）→ 結果「無法計算」，不當 0
export interface UnitOpt { id: string; tribeId: TribeId; nameZh: string; nameEn: string; tribeZh: string; tribeEn: string; carry: number | null; speed: number; cost: number; verified: boolean }
// 目前 6 種都是 ts11 核對過的兵；斯巴達、維京的兵沒有列在這裡（運載量 null 的路徑由測試 farmingNullCarry 覆蓋）
export const UNIT_PICKS: [string, TribeId, string][] = [
  ['tt', 'gauls', 'theutatesThunder'],
  ['ei', 'romans', 'equitesImperatoris'],
  ['steppe', 'huns', 'steppeRider'],
  ['paladin', 'teutons', 'paladin'],
  ['club', 'teutons', 'maceman'],
  ['ec', 'romans', 'equitesCaesaris'],
];
export function farmUnit([id, tribeId, unitId]: [string, TribeId, string]): UnitOpt {
  const tribe = getTribe(tribeId)!;
  const u = tribe.units.find(x => x.id === unitId);
  if (!u || u.speed === null) throw new Error(`no unit data for ${tribeId}.${unitId}`);
  return {
    id, tribeId, nameZh: u.name.zh, nameEn: u.name.en, tribeZh: tribe.name.zh, tribeEn: tribe.name.en,
    carry: u.carry, speed: u.speed, cost: u.cost.wood + u.cost.clay + u.cost.iron + u.cost.crop, verified: u.statsVerified,
  };
}
export const FARM_UNITS: UnitOpt[] = UNIT_PICKS.map(farmUnit);
const unitLabel = (u: UnitOpt, lang: 'zh' | 'en') =>
  lang === 'en'
    ? `${u.nameEn} (${u.tribeEn}, speed ${u.speed}, carry ${u.carry ?? '—'})`
    : `${u.nameZh}（${u.tribeZh}，速度 ${u.speed}、運載 ${u.carry ?? '—'}）`;

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
export function farmingCalc(opts: { dist: number; unitSpeed: number; carry: number | null; cost: number; n: number; freq: number; loot: number; serverSpeed: number; arena: number; boots: number }) {
  const { dist, unitSpeed, carry, cost, n, freq, loot, serverSpeed, arena, boots } = opts;
  const owSec = calculateTravelSeconds({ distance: dist, unitSpeed, serverSpeed, tournamentSquareLevel: arena, heroBonusPercent: boots });
  const rtMin = (owSec * 2) / 60;
  const maxRaidsHr = 60 / Math.max(freq, rtMin);
  const troopCost = n * cost;
  // 運載量 null（還沒核對）：搬運上限、每日收益、回本都無法計算（null），不當 0、不算部分
  const cap = totalCarry([{ tribe: '', nameZh: '', carry, count: n }]);
  if (!cap.ok) return { owSec, carryCap: null, maxRaidsHr, daily: null, troopCost, payback: null };
  const carryCap = cap.total;
  const perRaid = Math.min(loot, carryCap);
  const daily = perRaid * maxRaidsHr * 24;
  const payback = daily > 0 ? troopCost / daily : Infinity;
  return { owSec, carryCap, maxRaidsHr, daily, troopCost, payback };
}

/** units：預設是 FARM_UNITS（測試可以換成含斯巴達、維京的清單） */
export default function FarmingCalculator({ units = FARM_UNITS }: { units?: UnitOpt[] } = {}) {
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

  const unit = units.find(u => u.id === unitId) ?? units[0]!;
  const carryMissing = unit.carry === null;
  // 兵種數字已在 ts11 核對（P0-18）就不標攜帶量／花費；速度種類接在後面
  const carryKinds: PendingKind[] = unit.verified || carryMissing ? [] : ['unitCarry'];
  const costKinds: PendingKind[] = unit.verified ? [] : ['units'];
  const summaryKinds: PendingKind[] = [...carryKinds, ...speedKinds];
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
      {/* 這頁沒有部族選單：看選的兵是哪一族（P0-17 (k)） */}
      <CalcBar tribe={unit.tribeId} />

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
              {!unit.verified && !carryMissing && <PendingVerifyChip kind="unitCarry" />}
              {carryMissing && <PendingVerifyChip kinds={missingCarryKinds([{ tribe: unit.tribeId }])} />}
            </PendingRow>
            <select id="farming-unit" value={unitId} onChange={e => setUnitId(e.target.value)}>
              {units.map(u => (
                <option key={u.id} value={u.id}>{unitLabel(u, lang)}</option>
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

        {calc.daily === null ? (
          // 運載量還沒核對（斯巴達、維京）：大數字換成同樣大小的灰字「無法計算」，第二行 12px 灰字寫原因＋灰標，不給明細
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Daily yield' : '每日收益'}
            titlePending={speedKinds.length > 0 ? speedKinds : false}
            primary={<span className="text-slate-500" data-testid="calc-unavailable">{lang === 'en' ? 'Cannot calculate' : '無法計算'}</span>}
            secondary={
              <PendingRow as="span" className="inline-flex min-h-11 flex-wrap items-center gap-x-1 text-[12px] text-slate-500" data-testid="calc-unavailable-reason">
                <span>{missingCarryTribeReason(unit.tribeId)}</span>
                <PendingVerifyChip kinds={missingCarryKinds([{ tribe: unit.tribeId }])} />
              </PendingRow>
            }
          />
        ) : (
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Daily yield' : '每日收益'}
            // 摘要一個灰標，依序列出：攜帶量（未核對的兵種才有）→ 行軍速度（有競技場／靴子才有，P0-22）；不放大數字旁
            titlePending={summaryKinds.length > 0 ? summaryKinds : false}
            primary={<>{Math.round(calc.daily).toLocaleString()}</>}
            secondary={rec.msg}
          >
            <h4>{lang === 'en' ? 'Suggested size' : '建議兵數'}</h4>
            <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Pop bracket' : '人口區間'}</span><span className={s.value}>{rec.bracket}</span></div>
            <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Recommended count' : '建議兵數'}</span><span className={s.value}>{rec.msg}</span></div>

            <h4>{lang === 'en' ? 'Round-trip & haul' : '往返與搬運'}</h4>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way' : '單程'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-one-way">{fmtHms(calc.owSec)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Carry cap (rec count)' : '搬運上限'}{carryKinds.length > 0 && <> <PendingVerifyChip kinds={carryKinds} /></>}</span><span className={s.value}>{calc.carryCap?.toLocaleString()}</span></PendingRow>
            {/* 每小時次數、每日收益、回本天數都用到單程時間：一列一個灰標，速度種類接在原本的後面（P0-22） */}
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Max raids /hr' : '每小時最多次數'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-raids-hr">{calc.maxRaidsHr.toFixed(2)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Daily yield' : '每日預估收益'}{summaryKinds.length > 0 && <> <PendingVerifyChip kinds={summaryKinds} /></>}</span><span className={`${s.value} ${s.highlight}`}>{Math.round(calc.daily).toLocaleString()}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Initial troop cost' : '兵力初始成本'}{costKinds.length > 0 && <> <PendingVerifyChip kinds={costKinds} /></>}</span><span className={s.value}>{calc.troopCost.toLocaleString()}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Payback' : '回本天數'}{[...costKinds, ...speedKinds].length > 0 && <> <PendingVerifyChip kinds={[...costKinds, ...speedKinds]} /></>}</span><span className={s.value}>{calc.payback !== null && isFinite(calc.payback) ? `${calc.payback.toFixed(2)} ${lang === 'en' ? 'days' : '天'}` : '—'}</span></PendingRow>

            <div className={s.note}>
              {lang === 'en'
                ? 'Daily yield uses the smaller of loot per raid and carry capacity, times raids per hour. For a new farm, try about 10 horses first; if others contest it, send only enough to fill one haul.'
                : '每日收益取「每次搶到的量」與「搬運上限」較小者，再乘每小時次數。新農場可先派約 10 匹馬探底；若常被搶，就降到剛好搬滿一次即可。'}
            </div>
          </CalcResultPanel>
        )}
      </div>
    </>
  );
}

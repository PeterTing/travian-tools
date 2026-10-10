import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import Stepper from '@/components/common/Stepper'
import RangeNumberField, { outOfRange } from '@/components/common/RangeNumberField'
import NumberInput from '@/components/common/NumberInput'
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

/**
 * 攻略（Lumi/Eggstra/Dave，PeterTing_travian-guide src/data/lumi/farming.ts）的經驗法則：依人口派幾匹馬。
 * 只當「攻略參考」顯示，不拿來算建議兵數（2026-10-10 Peter 回報：每次掠奪量填多少都只建議 1 馬）。
 */
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
 * 農場收益的計算（匯出給測試；2026-10-10 PM＋幕僚長＋設計師重寫）：
 * - 單程時間用全站共用的行軍公式（P0-22）——前 20 格原速，超過的路段 ×(1＋競技場×0.2＋靴子%)，再乘伺服器速度。
 * - 每組兵數 = ⌈每次掠奪量 ÷ 運載量⌉
 * - 需要幾組 = ⌈往返時間 ÷ 派送間隔⌉（往返不超過間隔就 1 組）
 * - 總兵數 = 每組兵數 × 組數
 * - 每次實際帶回 = min(每次掠奪量, 每組兵數 × 運載量)
 * - 每日收益 = 每次實際帶回 × (1440 ÷ 間隔分鐘)
 * 運載量 null（還沒核對）：兵數、收益、回本都無法計算（null），不當 0、不算部分。
 */
export function farmingCalc(opts: { dist: number; unitSpeed: number; carry: number | null; cost: number; freq: number; loot: number; serverSpeed: number; arena: number; boots: number }) {
  const { dist, unitSpeed, carry, cost, freq, serverSpeed, arena, boots } = opts;
  const loot = Number.isFinite(opts.loot) && opts.loot > 0 ? Math.floor(opts.loot) : 0;
  const owSec = calculateTravelSeconds({ distance: dist, unitSpeed, serverSpeed, tournamentSquareLevel: arena, heroBonusPercent: boots });
  const rtSec = owSec * 2;
  const intervalSec = freq * 60;
  const groups = Math.max(1, Math.ceil(rtSec / intervalSec));
  const raidsPerDay = 1440 / freq;
  const cap = totalCarry([{ tribe: '', nameZh: '', carry, count: 1 }]);
  if (!cap.ok || carry === null || carry <= 0) {
    return { owSec, rtSec, groups, raidsPerDay, perGroup: null, totalTroops: null, carryCap: null, perRaid: null, daily: null, troopCost: null, payback: null };
  }
  const perGroup = Math.ceil(loot / carry);
  const totalTroops = perGroup * groups;
  const carryCap = perGroup * carry;
  const perRaid = Math.min(loot, carryCap);
  const daily = perRaid * raidsPerDay;
  const troopCost = totalTroops * cost;
  const payback = daily > 0 ? troopCost / daily : Infinity;
  return { owSec, rtSec, groups, raidsPerDay, perGroup, totalTroops, carryCap, perRaid, daily, troopCost, payback };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** 距離欄：「10」「10.5」→ 數字；空白、0、負數、非數字 → null（不算，不當 0） */
export function parseFarmDistance(text: string): number | null {
  const t = text.replace(/[\uff10-\uff19]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xff10 + 0x30)).replace(/\uff0e/g, '.').trim();
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** units：預設是 FARM_UNITS（測試可以換成含斯巴達、維京的清單） */
export default function FarmingCalculator({ units = FARM_UNITS }: { units?: UnitOpt[] } = {}) {
  const { lang } = useLang();
  // 距離用文字存：清空就是空白，不變成 0；空白或不合格不算（跟座標框同一套）
  const [distText, setDistText] = useState('10');
  const [distTouched, setDistTouched] = useState(false);
  const dist = parseFarmDistance(distText);
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
  // 摘要（組數 × 每組兵數）用到往返時間和運載量
  const summaryKinds: PendingKind[] = [...carryKinds, ...speedKinds];
  // 馬以外（棍棒兵）用「名」
  const noun = lang === 'en' ? '' : unit.id === 'club' ? ' 名' : ' 匹';

  // 距離或掠奪量空白：不算（摘要顯示「—」）
  const inputsReady = dist !== null && Number.isFinite(loot);
  const calc = useMemo(
    () => farmingCalc({ dist: dist ?? 0, unitSpeed: unit.speed, carry: unit.carry, cost: unit.cost, freq, loot, serverSpeed, arena, boots: bootsOk ? boots : 0 }),
    [dist, unit, freq, loot, serverSpeed, arena, boots, bootsOk],
  );
  const distError = dist === null && (distTouched || distText.trim() !== '')
    ? (lang === 'en' ? 'Enter a distance greater than 0' : '請輸入大於 0 的距離')
    : null;

  const composition = calc.perGroup === null || calc.totalTroops === null
    ? ''
    : lang === 'en'
      ? `${calc.groups} groups × ${fmt(calc.perGroup)} = ${fmt(calc.totalTroops)}`
      : `${calc.groups} 組 × ${fmt(calc.perGroup)}${noun} = ${fmt(calc.totalTroops)}${noun}`;
  const guideRef = (lang === 'en'
    ? 'Guide rule of thumb (Lumi): pop 150–400 → 1 horse, 400–550 → 2, 550+ → 3–7. Reference only, not used in the calculation.'
    : '攻略參考（Lumi）：人口 150–400 派 1 匹、400–550 派 2 匹、550 以上 3–7 匹。只供參考，不用在計算。');

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Farming Yield' : '農場收益'}</h2>
        <p>{lang === 'en'
          ? 'Works out how many troops per group from loot per raid and carry, then how many groups to rotate from the round-trip time.'
          : '依每次搶的量和運載量算每組幾匹，再依往返時間算要幾組輪流派'}</p>
        <p className="text-sm text-muted-foreground" data-testid="farming-loot-hint">{lang === 'en'
          ? 'Enter what this farm actually yields per raid.'
          : '每次掠奪量請填該農場實際搶得到的量'}</p>
      </div>
      {/* 這頁沒有部族選單：看選的兵是哪一族（P0-17 (k)） */}
      <CalcBar tribe={unit.tribeId} />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Target & unit' : '目標 & 兵'}</h4>
          <div className={s.field}>
            <label htmlFor="farming-loot">{lang === 'en' ? 'Per-raid loot estimate' : '每次掠奪量估計'}</label>
            <NumberInput id="farming-loot" data-testid="farming-loot" value={loot} onChange={setLoot} />
          </div>
          <div className={s.field}>
            <label htmlFor="farming-dist">{lang === 'en' ? 'Distance (tiles)' : '距離（格）'}</label>
            <input
              id="farming-dist"
              data-testid="farming-dist"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={distText}
              aria-invalid={distError ? true : undefined}
              aria-describedby={distError ? 'farming-dist-err' : undefined}
              onChange={e => setDistText(e.target.value)}
              onBlur={() => setDistTouched(true)}
              className={distError ? 'border-red-600 outline-red-600' : undefined}
            />
            {distError && <p id="farming-dist-err" role="alert" className="mt-1 text-xs text-red-600" data-testid="farming-dist-error">{distError}</p>}
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
            <label htmlFor="farming-freq">{lang === 'en' ? 'Raid interval (min)' : '派送間隔（分）'}</label>
            <select id="farming-freq" value={freq} onChange={e => setFreq(+e.target.value)}>
              <option value={5}>5 min</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
        </div>

        {calc.daily === null ? (
          // 運載量還沒核對（斯巴達、維京）：大數字換成同樣大小的灰字「無法計算」，第二行 12px 灰字寫原因＋灰標，不給明細
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Troops to send' : '派兵組合'}
            titlePending={speedKinds.length > 0 ? speedKinds : false}
            primary={<span className="text-slate-500" data-testid="calc-unavailable">{lang === 'en' ? 'Cannot calculate' : '無法計算'}</span>}
            secondary={
              <PendingRow as="span" className="inline-flex min-h-11 flex-wrap items-center gap-x-1 text-[12px] text-slate-500" data-testid="calc-unavailable-reason">
                <span>{missingCarryTribeReason(unit.tribeId)}</span>
                <PendingVerifyChip kinds={missingCarryKinds([{ tribe: unit.tribeId }])} />
              </PendingRow>
            }
          />
        ) : !inputsReady ? (
          // 距離或每次掠奪量空白：不算，大數字「—」，第二行提示要填什麼（不顯示「× 0 匹」）
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Troops to send' : '派兵組合'}
            primary={<span data-testid="farming-composition">{'—'}</span>}
            secondary={<span data-testid="farming-need-inputs">{lang === 'en' ? 'Enter the distance and loot per raid' : '填好距離和每次掠奪量後顯示'}</span>}
          />
        ) : (
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Troops to send' : '派兵組合'}
            // 摘要一個灰標，依序列出：攜帶量（未核對的兵種才有）→ 行軍速度（有競技場／靴子才有，P0-22）；不放大數字旁
            titlePending={summaryKinds.length > 0 ? summaryKinds : false}
            primary={<span data-testid="farming-composition">{composition}</span>}
            secondary={<span data-testid="farming-daily-summary">{lang === 'en' ? `Daily yield ${fmt(calc.daily)}` : `每日收益 ${fmt(calc.daily)}`}</span>}
          >
            <h4>{lang === 'en' ? 'Troops' : '兵數'}</h4>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Per group' : '每組兵數'}{carryKinds.length > 0 && <> <PendingVerifyChip kinds={carryKinds} /></>}</span><span className={s.value} data-testid="farming-per-group">{fmt(calc.perGroup!)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Groups needed' : '需要幾組'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-groups">{calc.groups}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Total troops' : '總兵數'}{summaryKinds.length > 0 && <> <PendingVerifyChip kinds={summaryKinds} /></>}</span><span className={s.value} data-testid="farming-total">{fmt(calc.totalTroops!)}</span></PendingRow>

            <h4>{lang === 'en' ? 'Round-trip & haul' : '往返與搬運'}</h4>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'One-way' : '單程'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-one-way">{fmtHms(calc.owSec)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Round trip' : '往返'}{speedKinds.length > 0 && <> <PendingVerifyChip kinds={speedKinds} /></>}</span><span className={s.value} data-testid="farming-round-trip">{fmtHms(calc.rtSec)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Hauled per raid' : '每次實際帶回'}{carryKinds.length > 0 && <> <PendingVerifyChip kinds={carryKinds} /></>}</span><span className={s.value} data-testid="farming-per-raid">{fmt(calc.perRaid!)}</span></PendingRow>
            <div className={s.row}><span className={s.label}>{lang === 'en' ? 'Raids per day' : '每天派幾次'}</span><span className={s.value} data-testid="farming-raids-day">{fmt(calc.raidsPerDay)}</span></div>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Daily yield' : '每日預估收益'}{carryKinds.length > 0 && <> <PendingVerifyChip kinds={carryKinds} /></>}</span><span className={`${s.value} ${s.highlight}`} data-testid="farming-daily">{fmt(calc.daily)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Initial troop cost' : '兵力初始成本'}{[...costKinds, ...speedKinds].length > 0 && <> <PendingVerifyChip kinds={[...costKinds, ...speedKinds]} /></>}</span><span className={s.value}>{fmt(calc.troopCost!)}</span></PendingRow>
            <PendingRow className={s.row}><span className={s.label}>{lang === 'en' ? 'Payback' : '回本天數'}{[...costKinds, ...speedKinds].length > 0 && <> <PendingVerifyChip kinds={[...costKinds, ...speedKinds]} /></>}</span><span className={s.value}>{calc.payback !== null && isFinite(calc.payback) ? `${calc.payback.toFixed(2)} ${lang === 'en' ? 'days' : '天'}` : '—'}</span></PendingRow>

            <div className={s.note}>
              {lang === 'en'
                ? 'Each group carries the full raid amount; groups leave one interval apart, so one is always on the way back while the next goes out. Daily yield = hauled per raid × raids per day.'
                : '每組都搬得完每次掠奪量；各組相隔一個間隔出發，回來一組就再派一組。每日收益＝每次實際帶回 × 每天派幾次。'}
            </div>
            <div className={s.note} data-testid="farming-guide-ref">{guideRef}</div>
          </CalcResultPanel>
        )}
      </div>
    </>
  );
}

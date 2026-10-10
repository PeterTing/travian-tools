import { useState, useMemo } from 'react';
import {
  CROPPER_LAYOUTS, FIELD_PRODUCTION,
  fieldTotalCost, fieldBuildTime, formatDuration, bbTotalCost, bbBuildTime,
  type CropperId, type ResourceType,
} from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';
import CalcResultPanel, { SummaryPending } from './CalcResultPanel';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip';
import type { PendingKind } from '@/lib/pendingNotes';
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'
import { ingameBuildingName } from '@/lib/ingameNames';

export type BB = 'sawmill' | 'brickyard' | 'ironFoundry' | 'grainMill' | 'bakery';

// 建築名一律讀遊戲內名稱表
const FIELD_ZH: Record<ResourceType, string> = {
  wood: ingameBuildingName('woodcutter')!, clay: ingameBuildingName('clay_pit')!,
  iron: ingameBuildingName('iron_mine')!, crop: ingameBuildingName('cropland')!,
};
const RES_ZH: Record<ResourceType, string> = { wood: '木材', clay: '黏土', iron: '鐵礦', crop: '糧食' };
const BB_ZH: Record<BB, string> = {
  sawmill: ingameBuildingName('sawmill')!, brickyard: ingameBuildingName('brickyard')!,
  ironFoundry: ingameBuildingName('iron_foundry')!, grainMill: ingameBuildingName('grain_mill')!,
  bakery: ingameBuildingName('bakery')!,
};

export const BB_REQ: Record<BB, { res: ResourceType; field: number; alsoMill?: number }> = {
  sawmill:     { res: 'wood', field: 10 },
  brickyard:   { res: 'clay', field: 10 },
  ironFoundry: { res: 'iron', field: 10 },
  grainMill:   { res: 'crop', field: 5 },
  bakery:      { res: 'crop', field: 10, alsoMill: 5 },
};

export interface Step {
  label: string;
  /** 中文步驟名稱（畫面用） */
  labelZh: string;
  cost: number;
  time: number;
  roi: number;
  kind: 'field' | 'bb';
  type?: ResourceType;  // populated when kind === 'field'
  bb?: BB;              // populated when kind === 'bb'
  from: number;
  to: number;
}

export interface PlanInput {
  cropperId: CropperId;
  isCap: boolean;
  start: Record<ResourceType, number>;
  bonus: Record<BB, number>;
  mb: number;
  gold: boolean;
  oasisPct?: Partial<Record<ResourceType, number>>;
  maxSteps?: number;
}

export interface PlanResult {
  steps: Step[];
  totalCost: number;
  totalTime: number;
}

/**
 * Pure greedy ROI planner. At each of N steps, picks the candidate upgrade
 * (lowest-level field of each resource type, or next bonus-building level
 * whose prerequisites are met) with the shortest ROI (cost / daily delta).
 *
 * Exported for algorithm-correctness tests. The React component wraps this
 * in useMemo with its current input state.
 */
export function planGreedy(input: PlanInput): PlanResult {
  const { cropperId, isCap, start, bonus, mb, gold } = input;
  const MAX = input.maxSteps ?? 20;
  const layout = CROPPER_LAYOUTS.find(l => l.id === cropperId)!;
  const counts: Record<ResourceType, number> = {
    wood: layout.wood, clay: layout.clay, iron: layout.iron, crop: layout.crop,
  };
  const fields: Record<ResourceType, number[]> = {
    wood: Array(counts.wood).fill(start.wood),
    clay: Array(counts.clay).fill(start.clay),
    iron: Array(counts.iron).fill(start.iron),
    crop: Array(counts.crop).fill(start.crop),
  };
  const bb: Record<BB, number> = { ...bonus };
  const maxLv = isCap ? 20 : 10;
  const goldPct = gold ? 0.25 : 0;
  const oasisPct = input.oasisPct ?? {};

  const bonusFor = (t: ResourceType): number =>
    t === 'wood' ? bb.sawmill * 0.05
    : t === 'clay' ? bb.brickyard * 0.05
    : t === 'iron' ? bb.ironFoundry * 0.05
    : (bb.grainMill + bb.bakery) * 0.05;

  const steps: Step[] = [];

  for (let i = 0; i < MAX; i++) {
    const cands: Step[] = [];

    // Field upgrade candidates: lowest field of each type below cap
    (['wood', 'clay', 'iron', 'crop'] as ResourceType[]).forEach(t => {
      let lowestIdx = -1, lowest = Infinity;
      fields[t].forEach((lv, idx) => { if (lv < lowest && lv < maxLv) { lowest = lv; lowestIdx = idx; } });
      if (lowestIdx < 0) return;
      const to = lowest + 1;
      const cost = fieldTotalCost(t, to);
      const baseDelta = (FIELD_PRODUCTION[to] ?? 0) - (FIELD_PRODUCTION[lowest] ?? 0); // 0 級也有 3/小時（P0-18）
      const delta = baseDelta * (1 + bonusFor(t) + goldPct + (oasisPct[t] ?? 0));
      const perDay = delta * 24;
      const roi = perDay > 0 ? cost / perDay : Infinity;
      cands.push({ kind: 'field', type: t, from: lowest, to, cost, roi,
        time: fieldBuildTime(t, to, mb),
        label: `${t[0]!.toUpperCase() + t.slice(1)} #${lowestIdx + 1} → Lv ${to}`,
        labelZh: `${FIELD_ZH[t]} #${lowestIdx + 1} → ${to} 級` });
    });

    // Bonus-building candidates (prerequisites must be met)
    (Object.keys(BB_REQ) as BB[]).forEach(b => {
      const cur = bb[b];
      if (cur >= 5) return;
      const req = BB_REQ[b];
      const minField = Math.min(...fields[req.res]);
      if (minField < req.field) return;
      if (b === 'bakery' && bb.grainMill < (req.alsoMill ?? 0)) return;
      const to = cur + 1;
      const cost = bbTotalCost(b, to);
      const totalProdHr = fields[req.res].reduce((sum, lv) => sum + (FIELD_PRODUCTION[lv] ?? 0), 0);
      const delta = totalProdHr * 0.05;
      const perDay = delta * 24;
      const roi = perDay > 0 ? cost / perDay : Infinity;
      cands.push({ kind: 'bb', bb: b, from: cur, to, cost, roi, time: bbBuildTime(b, to, mb),
        label: `${b[0]!.toUpperCase() + b.slice(1)} → Lv ${to} (+5% ${req.res})`,
        labelZh: `${BB_ZH[b]} → ${to} 級（${RES_ZH[req.res]} +5%）` });
    });

    if (!cands.length) break;
    cands.sort((a, b) => a.roi - b.roi);
    const best = cands[0]!;
    steps.push(best);
    if (best.kind === 'field' && best.type) {
      // apply the upgrade to the lowest field of that type
      let lowestIdx = -1, lowest = Infinity;
      fields[best.type].forEach((lv, idx) => { if (lv < lowest) { lowest = lv; lowestIdx = idx; } });
      if (lowestIdx >= 0) fields[best.type][lowestIdx] = best.to;
    }
    if (best.kind === 'bb' && best.bb) bb[best.bb] = best.to;
  }

  const totalCost = steps.reduce((acc, x) => acc + x.cost, 0);
  const totalTime = steps.reduce((acc, x) => acc + x.time, 0);
  return { steps, totalCost, totalTime };
}

export default function BuildOrderCalculator() {
  const { lang } = useLang();
  const [cropperId, setCropperId] = useState<CropperId>('15c');
  const [isCap, setIsCap] = useState(true);
  const [start, setStart] = useState({ wood: 5, clay: 5, iron: 5, crop: 5 });
  const [bonus, setBonus] = useState({ sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 });
  const [mb, setMb] = useState(10);
  const [gold, setGold] = useState(true);

  const plan = useMemo(
    () => planGreedy({ cropperId, isCap, start, bonus, mb, gold }),
    [cropperId, isCap, start, bonus, mb, gold],
  );
  // 待驗證（一行一個灰標，依序）：資源田 4 級以上（fieldHighLevel）、加成建築（building）、
  // 有勾 Plus 時排序（ROI）用到 Plus 加總算法（plusFormula，跟田地回本同一種算法）
  const planKinds: PendingKind[] = [
    ...(plan.steps.some(x => x.kind === 'field' && x.to >= 4) ? ['fieldHighLevel' as const] : []),
    ...(plan.steps.some(x => x.kind === 'bb') ? ['building' as const] : []),
    ...(gold ? ['plusFormula' as const] : []),
  ];

  return (
    <>
      <div className={s.intro}>
        {/* Greedy ROI planner algorithm — see planGreedy() + algorithm tests */}
        <h2>{lang === 'en' ? 'Build Order' : '建造順序'}</h2>
        <p>{lang === 'en'
          ? 'Suggests the next 20 upgrades from your current village. Capitals can go to field Lv 20; other villages stop at Lv 10. Bonus buildings appear when their requirements are met.'
          : '依目前村莊狀態，建議接下來 20 個最划算的升級。首都資源田可升到 20 級，一般村最高 10 級；加成建築在條件達到後會自動出現。'}</p>
      </div>
      <CalcBar />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Setup' : '基本設定'}</h4>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Layout' : '佈局'}</label>
            <select value={cropperId} onChange={e => setCropperId(e.target.value as CropperId)}>
              {CROPPER_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
            </select>
          </div>

          <label className={s.check}>
            <input type="checkbox" checked={isCap} onChange={e => setIsCap(e.target.checked)} />
            {lang === 'en' ? 'Capital (unlocks Lv 11–20)' : '首都（田可升到 11–20 級）'}
          </label>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Current field levels' : '現況：田地等級'}</h4>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Wood' : FIELD_ZH.wood} value={start.wood} onChange={v => setStart(p => ({ ...p, wood: v }))} min={0} max={20} /></div>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Clay' : FIELD_ZH.clay} value={start.clay} onChange={v => setStart(p => ({ ...p, clay: v }))} min={0} max={20} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Iron' : FIELD_ZH.iron} value={start.iron} onChange={v => setStart(p => ({ ...p, iron: v }))} min={0} max={20} /></div>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Crop' : FIELD_ZH.crop} value={start.crop} onChange={v => setStart(p => ({ ...p, crop: v }))} min={0} max={20} /></div>
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Bonus building levels' : '加成建築等級'}</h4>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Sawmill' : BB_ZH.sawmill} value={bonus.sawmill} onChange={v => setBonus(p => ({ ...p, sawmill: v }))} min={0} max={5} /></div>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Brickyard' : BB_ZH.brickyard} value={bonus.brickyard} onChange={v => setBonus(p => ({ ...p, brickyard: v }))} min={0} max={5} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Iron Foundry' : BB_ZH.ironFoundry} value={bonus.ironFoundry} onChange={v => setBonus(p => ({ ...p, ironFoundry: v }))} min={0} max={5} /></div>
            <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Grain Mill' : BB_ZH.grainMill} value={bonus.grainMill} onChange={v => setBonus(p => ({ ...p, grainMill: v }))} min={0} max={5} /></div>
          </div>
          <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Bakery' : BB_ZH.bakery} value={bonus.bakery} onChange={v => setBonus(p => ({ ...p, bakery: v }))} min={0} max={5} /></div>

          <div className="mb-3.5 min-w-0"><Stepper label={lang === 'en' ? 'Main Building Lv' : '村莊大樓等級'} value={mb} onChange={setMb} min={1} max={20} /></div>
          <label className={s.check}><input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} /> {lang === 'en' ? 'Plus +25% (gold)' : 'Plus 產量 +25%（金幣）'}</label>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Next upgrades' : '接下來升級'}
          primary={<>{formatDuration(plan.totalTime)}</>}
          secondary={
            // 一行一個灰標：資源田升到 4 級以上（花費、時間是公式推算，也涵蓋上面的總時間）、
            // 加成建築（鋸木廠等，數值還沒核對）。總時間用同一份資料，不另外在標題放灰標
            <SummaryPending kinds={planKinds} testId="build-order-summary-cost">
              {lang === 'en'
                ? `20 steps · cost ${plan.totalCost.toLocaleString()}`
                : `20 步 · 成本 ${plan.totalCost.toLocaleString()}`}
            </SummaryPending>
          }
        >
          {planKinds.length ? (
            // 每一步的花費、時間：灰標放在清單標題旁（一個，不放每一列）
            <PendingRow as="h4" className="flex min-h-11 items-center gap-1">
              <span>{lang === 'en' ? 'Next 20 upgrades (lowest ROI first)' : '接下來 20 步（依 ROI 排序）'}</span>
              <PendingVerifyChip kinds={planKinds} />
            </PendingRow>
          ) : (
            <h4>{lang === 'en' ? 'Next 20 upgrades (lowest ROI first)' : '接下來 20 步（依 ROI 排序）'}</h4>
          )}
          <ol className={s.steps}>
            {plan.steps.map((st, i) => (
              <li key={i}>
                <span className={s.stepNum}>#{i + 1}</span>
                <span>{lang === 'en' ? st.label : st.labelZh}</span>
                <span className={s.stepCost}>{st.cost.toLocaleString()}</span>
                <span className={s.stepTime}>{st.time > 0 ? formatDuration(st.time) : '—'}</span>
              </li>
            ))}
          </ol>
          <div className={s.row} style={{ marginTop: 12 }}><span className={s.label}>{lang === 'en' ? '20 steps total cost' : '20 步累積成本'}</span><span className={s.value}>{plan.totalCost.toLocaleString()}</span></div>
          <div className={s.row}><span className={s.label}>{lang === 'en' ? '20 steps total time' : '20 步累積時間'}</span><span className={s.value}>{formatDuration(plan.totalTime)}</span></div>

          <div className={s.note}>
            {lang === 'en'
              ? 'Time uses MB speed-up (0.964^(MB Lv − 1)) but does not model dual queues, Roman-dual, gold instant-5m, or celebration speed-ups. Reality will be a bit faster.'
              : '時間已套用村莊大樓加速（0.964^(MB Lv − 1)），但未計入羅馬人可同時蓋田和建築、金幣 5 分鐘補時、慶典加速。實際略快。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  );
}

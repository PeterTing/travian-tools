import { useState, useMemo } from 'react';
import {
  CROPPER_LAYOUTS, FIELD_PRODUCTION,
  fieldTotalCost, fieldBuildTime, formatDuration, bbTotalCost,
  type CropperId, type ResourceType,
} from '../data/travian';
import { useLang } from '../i18n/LangContext';
import s from './calc.module.css';

export type BB = 'sawmill' | 'brickyard' | 'ironFoundry' | 'grainMill' | 'bakery';

export const BB_REQ: Record<BB, { res: ResourceType; field: number; alsoMill?: number }> = {
  sawmill:     { res: 'wood', field: 10 },
  brickyard:   { res: 'clay', field: 10 },
  ironFoundry: { res: 'iron', field: 10 },
  grainMill:   { res: 'crop', field: 5 },
  bakery:      { res: 'crop', field: 10, alsoMill: 5 },
};

export interface Step {
  label: string;
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
      const baseDelta = (FIELD_PRODUCTION[to] ?? 0) - (to === 1 ? 0 : (FIELD_PRODUCTION[lowest] ?? 0));
      const delta = baseDelta * (1 + bonusFor(t) + goldPct + (oasisPct[t] ?? 0));
      const perDay = delta * 24;
      const roi = perDay > 0 ? cost / perDay : Infinity;
      cands.push({ kind: 'field', type: t, from: lowest, to, cost, roi,
        time: fieldBuildTime(t, to, mb),
        label: `${t[0]!.toUpperCase() + t.slice(1)} #${lowestIdx + 1} → Lv ${to}` });
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
      cands.push({ kind: 'bb', bb: b, from: cur, to, cost, roi, time: 0,
        label: `${b[0]!.toUpperCase() + b.slice(1)} → Lv ${to} (+5% ${req.res})` });
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

  return (
    <>
      <div className={s.intro}>
        {/* Greedy ROI planner algorithm — see planGreedy() + algorithm tests */}
        <h2>{lang === 'en' ? 'Build Order' : '建造順序'}</h2>
        <p>{lang === 'en'
          ? 'Suggests the next 20 upgrades from your current village. Capitals can go to field Lv 20; other villages stop at Lv 10. Bonus buildings appear when their requirements are met.'
          : '依目前村莊狀態，建議接下來 20 個最划算的升級。首都資源田可升到 20 級，一般村最高 10 級；加成建築在條件達到後會自動出現。'}</p>
      </div>

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
            {lang === 'en' ? 'Capital (unlocks Lv 11–20)' : '首都（解鎖 Lv 11–20）'}
          </label>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Current field levels' : '現況：田地等級'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Wood</label><input type="number" min={0} max={20} value={start.wood} onChange={e => setStart(p => ({ ...p, wood: +e.target.value }))} /></div>
            <div className={s.field}><label>Clay</label><input type="number" min={0} max={20} value={start.clay} onChange={e => setStart(p => ({ ...p, clay: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Iron</label><input type="number" min={0} max={20} value={start.iron} onChange={e => setStart(p => ({ ...p, iron: +e.target.value }))} /></div>
            <div className={s.field}><label>Crop</label><input type="number" min={0} max={20} value={start.crop} onChange={e => setStart(p => ({ ...p, crop: +e.target.value }))} /></div>
          </div>

          <h4 style={{ marginTop: 16 }}>{lang === 'en' ? 'Bonus building levels' : '加成建築等級'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Sawmill</label><input type="number" min={0} max={5} value={bonus.sawmill} onChange={e => setBonus(p => ({ ...p, sawmill: +e.target.value }))} /></div>
            <div className={s.field}><label>Brickyard</label><input type="number" min={0} max={5} value={bonus.brickyard} onChange={e => setBonus(p => ({ ...p, brickyard: +e.target.value }))} /></div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}><label>Iron Foundry</label><input type="number" min={0} max={5} value={bonus.ironFoundry} onChange={e => setBonus(p => ({ ...p, ironFoundry: +e.target.value }))} /></div>
            <div className={s.field}><label>Grain Mill</label><input type="number" min={0} max={5} value={bonus.grainMill} onChange={e => setBonus(p => ({ ...p, grainMill: +e.target.value }))} /></div>
          </div>
          <div className={s.field}><label>Bakery</label><input type="number" min={0} max={5} value={bonus.bakery} onChange={e => setBonus(p => ({ ...p, bakery: +e.target.value }))} /></div>

          <div className={s.field}><label>Main Building Lv</label><input type="number" min={1} max={20} value={mb} onChange={e => setMb(+e.target.value)} /></div>
          <label className={s.check}><input type="checkbox" checked={gold} onChange={e => setGold(e.target.checked)} /> Plus +25% gold</label>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Next 20 upgrades (lowest ROI first)' : '接下來 20 步（依 ROI 排序）'}</h4>
          <ol className={s.steps}>
            {plan.steps.map((st, i) => (
              <li key={i}>
                <span className={s.stepNum}>#{i + 1}</span>
                <span>{st.label}</span>
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
              : '時間已套用村莊大樓加速（0.964^(MB Lv − 1)），但未計入單/雙佇列、羅馬人雙隊、金幣 5 分鐘補時、慶典加速。實際略快。'}
          </div>
        </div>
      </div>
    </>
  );
}

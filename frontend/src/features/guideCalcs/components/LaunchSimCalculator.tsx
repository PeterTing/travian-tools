import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import { common, STRATEGY_LIST, STRATEGIES } from '../data/build-order';
import { TRIBE_SETTLER_COST } from '../data/build-order/tribe-cost';
import type { StrategyId, BuildStep } from '../data/build-order';
import type { TribeId } from '../data/travian';
import { TRIBES } from '../data/tribes/index';
import s from './calc.module.css';

const TRIBE_ORDER: TribeId[] = ['romans', 'teutons', 'gauls', 'egyptians', 'huns', 'vikings', 'spartans'];

interface Milestone {
  label: string;
  labelZh: string;
  step: number;
  cumulativeCost: number;
  cumulativeHours: number;
}

/**
 * Walk the full build order (common + branchSteps) and return an array of
 * milestones: each Party N, each settler-training step, and the final step.
 * Each milestone shows cumulative cost + cumulative hours at production rate.
 *
 * Time-per-step = step.cost / prodPerHour. Steps with cost=null (task rows)
 * take 0 time.
 */
export function simulate(
  strategyId: StrategyId,
  prodPerHour: number,
  _settlerTotalCost: number,
): { totalHours: number; milestones: Milestone[]; allSteps: BuildStep[] } {
  const strategy = STRATEGIES[strategyId];
  const allSteps = [...common, ...strategy.branchSteps];
  const milestones: Milestone[] = [];
  let cumCost = 0;
  let cumHours = 0;
  for (const step of allSteps) {
    const c = step.cost ?? 0;
    cumCost += c;
    cumHours += c / prodPerHour;
    const name = step.building.en;
    const nameZh = step.building.zh;
    const isParty = name.startsWith('Party');
    const isSettler = /Train \d+ settler/i.test(name);
    const isFinal = step.step === allSteps[allSteps.length - 1]!.step;
    if (isParty || isSettler || isFinal) {
      milestones.push({
        label: name,
        labelZh: nameZh,
        step: step.step,
        cumulativeCost: cumCost,
        cumulativeHours: cumHours,
      });
    }
  }
  return {
    totalHours: cumHours,
    milestones,
    allSteps,
  };
}

export default function LaunchSimCalculator() {
  const { lang } = useLang();
  const [strategyId, setStrategyId] = useState<StrategyId>('4p-sim');
  const [tribe, setTribe] = useState<TribeId>('romans');
  const [prodPerHour, setProdPerHour] = useState<number>(2000);

  const settlerCost = TRIBE_SETTLER_COST[tribe].total * 3;

  const result = useMemo(
    () => simulate(strategyId, prodPerHour, settlerCost),
    [strategyId, prodPerHour, settlerCost]
  );

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Launching Simulator (V1)' : '開局模擬器 (V1)'}</h2>
        <p>
          {lang === 'en'
            ? 'Estimate time-to-settle given your production rate and chosen strategy. Walks through the full build order (common 40 + branch steps) and sums cost / rate per step. Milestones (Parties + Settler training + final step) show cumulative time.'
            : '依照你的產量和選擇的風格，估算結帳時間。走完完整 build order（共通 40 + 分支步驟），依 成本 / 產量 算出每一步耗時。里程碑（每場 Party + 訓練 Settler + 最後一步）顯示累計時間。'}
        </p>
      </div>

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{lang === 'en' ? 'Inputs' : '輸入'}</h4>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Strategy' : '策略'}</label>
            <select value={strategyId} onChange={(e) => setStrategyId(e.target.value as StrategyId)}>
              {STRATEGY_LIST.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>{lang === 'en' ? 'Tribe (settler cost)' : '族群（影響 Settler 成本）'}</label>
            <select value={tribe} onChange={(e) => setTribe(e.target.value as TribeId)}>
              {TRIBE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {TRIBES[id].icon} {TRIBES[id].name[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>
              {lang === 'en' ? 'Production + farming (res/hr)' : '產量 + Farming（res/hr）'}
            </label>
            <input
              type="number"
              min={100}
              step={100}
              value={prodPerHour}
              onChange={(e) => setProdPerHour(Math.max(100, Number(e.target.value) || 100))}
            />
          </div>

          <div className={s.note}>
            {lang === 'en'
              ? 'V1 does NOT model task rewards (which return ~15-25% of spend) or CP pacing. Actual settle is typically 10-25% FASTER than shown. Assumes 1x server speed.'
              : 'V1 未納入任務獎勵（可回收 15-25% 成本）或 CP 調整，實際結帳通常比這裡顯示快 10-25%。假設 1x 伺服器速度。'}
          </div>
        </div>

        <div className={s.output}>
          <h4>{lang === 'en' ? 'Estimated settle time' : '預估結帳時間'}</h4>
          <div className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Total hours' : '總時數'}</span>
            <span className={`${s.value} ${s.highlight}`}>
              {result.totalHours.toFixed(1)} h
            </span>
          </div>
          <div className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Server day' : '伺服器天'}</span>
            <span className={s.value}>
              {lang === 'en' ? 'Day ' : '第 '}
              {(result.totalHours / 24).toFixed(1)}
              {lang === 'en' ? '' : ' 天'}
            </span>
          </div>
          <div className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Settler cost (3x)' : 'Settler 成本（3 名）'}</span>
            <span className={s.value}>{settlerCost.toLocaleString()}</span>
          </div>

          <h4>{lang === 'en' ? 'Milestones' : '里程碑'}</h4>
          <table className={s.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>{lang === 'en' ? 'Milestone' : '里程碑'}</th>
                <th>{lang === 'en' ? 'Cum. cost' : '累計成本'}</th>
                <th>{lang === 'en' ? 'Cum. hours' : '累計時數'}</th>
                <th>{lang === 'en' ? 'Day' : '天'}</th>
              </tr>
            </thead>
            <tbody>
              {result.milestones.map((m) => (
                <tr key={m.step}>
                  <td>{m.step}</td>
                  <td>{lang === 'en' ? m.label : m.labelZh}</td>
                  <td>{m.cumulativeCost.toLocaleString()}</td>
                  <td>{m.cumulativeHours.toFixed(1)}</td>
                  <td>{(m.cumulativeHours / 24).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

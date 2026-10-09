import { useState, useMemo } from 'react';
import { useLang } from '../i18n/LangContext';
import { common, STRATEGY_LIST, STRATEGIES } from '../data/build-order';
import { TRIBE_SETTLER_COST } from '../data/build-order/tribe-cost';
import type { StrategyId, BuildStep } from '../data/build-order';
import type { TribeId } from '../data/travian';
import { TRIBES } from '../data/tribes/index';
import s from './calc.module.css';
import CalcResultPanel from './CalcResultPanel';

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
  settlerTotalCost: number = 0,
): { totalHours: number; milestones: Milestone[]; allSteps: BuildStep[] } {
  void settlerTotalCost; // reserved for future settler-cost milestones; kept for call-site compat
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
        <h2>{lang === 'en' ? 'Launch Simulator' : '出兵模擬'}</h2>
        <p>
          {lang === 'en'
            ? 'Estimate how long until you can settle, based on production and opening style. Shows milestones for parties, settler training, and the final step.'
            : '依產量與開局風格，估算多久可以結帳開新村。會標出派對、訓練拓荒者與最後一步等里程碑時間。'}
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
              ? 'Task rewards and culture-point timing are not included, so real settle is often a bit faster. Assumes 1× server speed. A party (small celebration) only gives this village\'s daily CP — about a dozen CP early on, capped at 500 on x1 — so check the CP countdown in the Culture Points calculator before planning on parties.'
              : '尚未計入任務獎勵與文明點節奏，實際結帳通常會再快一些。數字以 1 倍速伺服器為準。派對（小慶典）拿到的 CP＝本村每日 CP 產量，開局只有十幾點、x1 上限 500，不是固定 500；開村時間請到「CP 與開村」計算器看開村倒數。'}
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Estimated settle time' : '預估結帳時間'}
          primary={<>{result.totalHours.toFixed(1)} h</>}
          secondary={
            lang === 'en'
              ? `Day ${(result.totalHours / 24).toFixed(1)} · settlers ${settlerCost.toLocaleString()}`
              : `第 ${(result.totalHours / 24).toFixed(1)} 天 · 拓荒者 ${settlerCost.toLocaleString()}`
          }
        >
          <div className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Total hours' : '總時數'}</span>
            <span className={s.value}>{result.totalHours.toFixed(1)} h</span>
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
            <span className={s.label}>{lang === 'en' ? 'Settler cost (3x)' : '拓荒者成本（3 名）'}</span>
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
        </CalcResultPanel>
      </div>
    </>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useLang } from '../i18n/LangContext';
import { common, STRATEGY_LIST, STRATEGIES } from '../data/build-order';
import { TRIBE_SETTLER_COST } from '../data/build-order/tribe-cost';
import type { StrategyId, BuildStep } from '../data/build-order';
import type { TribeId } from '../data/travian';
import { TRIBES } from '../data/tribes/index';
import s from './calc.module.css';
import CalcResultPanel, { SummaryPending } from './CalcResultPanel';
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { LAUNCH_SIM_ESTIMATE_ONLY } from '@/lib/pendingNotes'

import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { CalcBar } from '@/components/autofill/CalcFrame'

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
  // 產量 0 會算出 NaN／無限大、負數會算出負時間（稽核 2026-10-10）：呼叫端要先擋
  if (!Number.isFinite(prodPerHour) || prodPerHour <= 0) {
    throw new RangeError('prodPerHour must be > 0');
  }
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
  // 部族預設跟「已帶入」列（目前村莊的部族；沒有帳號才用羅馬）
  const { tribe: accountTribe } = useAutoFill();
  const [tribe, setTribe] = useState<TribeId>(() => (accountTribe && accountTribe in TRIBES ? accountTribe as TribeId : 'romans'));
  // 換村莊（征服保留部族的世界，村莊可以是不同部族）或帳號晚點載入：使用者還沒自己選過就跟著（P0-25）
  const [tribeTouched, setTribeTouched] = useState(false);
  useEffect(() => {
    if (!tribeTouched && accountTribe && accountTribe in TRIBES) setTribe(accountTribe as TribeId);
  }, [accountTribe, tribeTouched]);
  // 產量用文字存：空白、0、負數都不偷偷改成 100，而是在欄位下方寫原因、不出結果
  const [prodText, setProdText] = useState<string>('2000');
  const prodPerHour = Number(prodText);
  const prodError = prodText.trim() === '' || !Number.isFinite(prodPerHour) || prodPerHour <= 0
    ? (lang === 'en' ? 'Enter a production above 0' : '請填大於 0 的產量')
    : null;

  const settlerCost = TRIBE_SETTLER_COST[tribe].total * 3;

  const result = useMemo(
    () => (prodError ? null : simulate(strategyId, prodPerHour, settlerCost)),
    [strategyId, prodPerHour, settlerCost, prodError]
  );

  return (
    <>
      <div className={s.intro}>
        <h2>{lang === 'en' ? 'Opening timeline' : '開局時間表'}</h2>
        <p>
          {lang === 'en'
            ? 'Estimate how long until you can settle, based on production and opening style. Shows milestones for parties, settler training, and the final step.'
            : '依產量與開局風格，估算多久可以結帳開新村。會標出派對、訓練開拓者與最後一步等里程碑時間。'}
        </p>
      </div>
      <CalcBar tribe={tribe} />

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
            <label>{lang === 'en' ? 'Tribe (settler cost reference only)' : '部族（只影響下面的開拓者成本參考）'}</label>
            <select value={tribe} onChange={(e) => { setTribe(e.target.value as TribeId); setTribeTouched(true); }}>
              {TRIBE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {TRIBES[id].icon} {TRIBES[id].name[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label>
              {lang === 'en' ? 'Production + farming (res/hr)' : '每小時產量＋掠奪收入（四種資源合計／小時）'}
            </label>
            <input
              type="number"
              min={1}
              step={100}
              value={prodText}
              aria-invalid={prodError ? true : undefined}
              data-testid="launch-prod"
              onChange={(e) => setProdText(e.target.value)}
            />
            {prodError && (
              <p role="alert" className="mt-1 text-xs text-red-600" data-testid="launch-prod-error">{prodError}</p>
            )}
          </div>

          <div className={s.note}>
            {lang === 'en'
              ? 'Task rewards and culture-point timing are not included, so real settle is often a bit faster. Assumes 1× server speed. A party (small celebration) only gives this village\'s daily CP — about a dozen CP early on, capped at 500 on x1 — so check the CP countdown in the Culture Points calculator before planning on parties.'
              : '還沒計入任務獎勵與 CP 節奏，實際結帳通常會再快一些。數字以 1 倍速伺服器為準。派對（小慶典）拿到的 CP＝本村每日 CP 產量，開局只有十幾點、x1 上限 500，不是固定 500；開村時間請到「CP 與開村」計算器看開村倒數。'}
          </div>
        </div>

        {result ? (
        <CalcResultPanel
          lang={lang}
          title={lang === 'en' ? 'Estimated settle time' : '預估結帳時間'}
          primary={<>{result.totalHours.toFixed(1)} h</>}
          secondary={
            // 一行一個灰標，依數字出現順序：「第 X 天」＝試算表每一步花費加總÷產量（launchSim）、
            // 「開拓者」花費（社群整理的兵種數字，units）。上面的時數用同一份資料，標題不另外放
            // 開拓者花費沒有用在計算裡，摘要不放（P0-17 (b)）；明細最後一列仍列出，給玩家參考
            // PM 2026-10-11：模型估算，不放灰標（LAUNCH_SIM_ESTIMATE_ONLY），下面一行 12px 灰字說明
            <>
              <SummaryPending kinds={LAUNCH_SIM_ESTIMATE_ONLY ? [] : ['launchSim']} testId="launch-sim-summary-settlers">
                {lang === 'en'
                  ? `Day ${(result.totalHours / 24).toFixed(1)}`
                  : `第 ${(result.totalHours / 24).toFixed(1)} 天`}
              </SummaryPending>
              {LAUNCH_SIM_ESTIMATE_ONLY && (
                <span className="block text-xs text-gray-500" data-testid="launch-sim-estimate-note">
                  {lang === 'en'
                    ? 'Model estimate; real results vary with quests, adventures and how you play.'
                    : '依模型估算，實際會因任務、冒險和操作不同'}
                </span>
              )}
            </>
          }
        >
          <PendingRow className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Total hours' : '總時數'}{!LAUNCH_SIM_ESTIMATE_ONLY && <> <PendingVerifyChip kind="launchSim" /></>}</span>
            <span className={s.value}>{result.totalHours.toFixed(1)} h</span>
          </PendingRow>
          <PendingRow className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Server day' : '伺服器天'}{!LAUNCH_SIM_ESTIMATE_ONLY && <> <PendingVerifyChip kind="launchSim" /></>}</span>
            <span className={s.value}>
              {lang === 'en' ? 'Day ' : '第 '}
              {(result.totalHours / 24).toFixed(1)}
              {lang === 'en' ? '' : ' 天'}
            </span>
          </PendingRow>
          <PendingRow className={s.row}>
            <span className={s.label}>{lang === 'en' ? 'Settler cost (3x, reference only)' : '開拓者成本（3 名，參考，不算在時間裡）'}{!TRIBE_SETTLER_COST[tribe].verified && <> <PendingVerifyChip kind="units" /></>}</span>
            <span className={s.value}>{settlerCost.toLocaleString()}</span>
          </PendingRow>

          <h4>{lang === 'en' ? 'Milestones' : '里程碑'}</h4>
          {/* 累計成本、時數、天都是試算表每一步的加總：表頭一個灰標；每列 44px、垂直置中 */}
          <table className={`${s.table} ${s.tapRows}`} data-testid="launch-sim-milestones">
            <thead>
              <PendingRow as="tr" className="h-11" tableColSpan={5}>
                <th>#</th>
                <th>{lang === 'en' ? 'Milestone' : '里程碑'}</th>
                <th>{lang === 'en' ? 'Cum. cost' : '累計成本'}{!LAUNCH_SIM_ESTIMATE_ONLY && <> <PendingVerifyChip kind="launchSim" /></>}</th>
                <th>{lang === 'en' ? 'Cum. hours' : '累計時數'}</th>
                <th>{lang === 'en' ? 'Day' : '天'}</th>
              </PendingRow>
            </thead>
            <tbody>
              {result.milestones.map((m) => (
                <tr key={m.step} className="h-11">
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
        ) : (
          <CalcResultPanel
            lang={lang}
            title={lang === 'en' ? 'Estimated settle time' : '預估結帳時間'}
            primary={<>—</>}
          />
        )}
      </div>
    </>
  );
}

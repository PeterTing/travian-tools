import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { accountPlayerLabel, accountWorldLabel } from '@/lib/accountDisplay'
import {
  FALLBACK_TRIBE,
  OPENING_TRIBES,
  defaultOpenSection,
  formatAmount,
  remainingSteps,
  resolveStep,
  type ResolvedStep,
} from '@/lib/openingChecklist'
import { openingChecklistApi } from '@/services/openingChecklistApi'
import type { TroopTribe } from '@/types/game'
import type {
  OpeningChecklistData,
  OpeningSection,
  OpeningStrategyId,
  OpeningTaskTable,
} from '@/types/openingChecklist'

const STRATEGY_IDS: OpeningStrategyId[] = ['4p-farm', '3p-sim']

/**
 * 攻略 › 起手式（P0-10，線框稿 v0.4「起手式清單」）。
 * 兩套攻略（4P 農開／3P 兵開）跟部族篩選放在最上面同一排；部族只換跟部族有關的欄位。
 * 依任務等級分段，預設只展開第一個還有沒勾的段落；進度按帳號 × 世界 × 攻略存在後端。
 * 「參考」（任務獎勵、派對與文明點時間）放在清單下面，預設收起來。
 */
export default function OpeningChecklistPage() {
  const { t } = useTranslation()
  const { accounts, currentAccount, loading: accountsLoading } = useCurrentAccount()
  const accountId = currentAccount?.account_id ?? null

  const [data, setData] = useState<OpeningChecklistData | null>(null)
  const [dataError, setDataError] = useState(false)
  const [strategyId, setStrategyId] = useState<OpeningStrategyId>('4p-farm')
  const [tribe, setTribe] = useState<TroopTribe>(currentAccount?.tribe ?? FALLBACK_TRIBE)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [progressLoaded, setProgressLoaded] = useState(false)
  const [saveError, setSaveError] = useState(false)
  // null＝照預設（第一個還有沒勾的段落）；使用者自己點過就照他的
  const [openSections, setOpenSections] = useState<Set<string> | null>(null)
  const [referenceOpen, setReferenceOpen] = useState(false)
  const progressKey = useRef('')

  useEffect(() => {
    let stale = false
    openingChecklistApi
      .getChecklist()
      .then((d) => {
        if (!stale) setData(d)
      })
      .catch((error) => {
        console.error('Failed to load opening checklist:', error)
        if (!stale) setDataError(true)
      })
    return () => {
      stale = true
    }
  }, [])

  // 部族篩選預設跟著帳號走；換帳號就換回那個帳號的部族
  useEffect(() => {
    setTribe(currentAccount?.tribe ?? FALLBACK_TRIBE)
  }, [currentAccount?.account_id, currentAccount?.tribe])

  // 換帳號（＝換帳號＋世界）或換攻略：讀那個組合自己的進度
  useEffect(() => {
    setChecked(new Set())
    setProgressLoaded(false)
    setOpenSections(null)
    setSaveError(false)
    if (!accountId) return
    const key = `${accountId}/${strategyId}`
    progressKey.current = key
    openingChecklistApi
      .getProgress(accountId, strategyId)
      .then((p) => {
        if (progressKey.current !== key) return
        setChecked(new Set(p.checked_step_ids))
        setProgressLoaded(true)
      })
      .catch((error) => {
        console.error('Failed to load opening progress:', error)
        if (progressKey.current === key) setSaveError(true)
      })
  }, [accountId, strategyId])

  const strategy = data?.strategies.find((s) => s.id === strategyId) ?? null
  const defaultOpen = useMemo(
    () => (strategy && (progressLoaded || !accountId) ? defaultOpenSection(strategy.sections, checked) : null),
    // 預設只在讀進度時決定一次；勾選時不要自己跳到下一段
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strategy, progressLoaded, accountId]
  )
  const isOpen = (sectionId: string) =>
    openSections ? openSections.has(sectionId) : sectionId === defaultOpen

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev ?? (defaultOpen ? [defaultOpen] : []))
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const toggleStep = useCallback(
    (stepId: string) => {
      if (!accountId || !progressLoaded) return
      const key = `${accountId}/${strategyId}`
      const nextChecked = !checked.has(stepId)
      setSaveError(false)
      setChecked((prev) => {
        const next = new Set(prev)
        if (nextChecked) next.add(stepId)
        else next.delete(stepId)
        return next
      })
      openingChecklistApi
        .setStep(accountId, strategyId, stepId, nextChecked)
        .then((p) => {
          if (progressKey.current === key) setChecked(new Set(p.checked_step_ids))
        })
        .catch((error) => {
          console.error('Failed to save opening progress:', error)
          if (progressKey.current !== key) return
          setSaveError(true)
          // 沒存到：畫面退回原本的狀態
          setChecked((prev) => {
            const next = new Set(prev)
            if (nextChecked) next.delete(stepId)
            else next.add(stepId)
            return next
          })
        })
    },
    [accountId, strategyId, checked, progressLoaded]
  )

  if (dataError) {
    return (
      <PageShell>
        <p className="text-sm text-red-700">{t('opening.loadError')}</p>
      </PageShell>
    )
  }
  if (!data || !strategy || (accountsLoading && accounts.length === 0)) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </PageShell>
    )
  }

  const total = strategy.total_steps
  const done = checked.size
  const canCheck = !!accountId && progressLoaded

  return (
    <PageShell>
      {/* 攻略切換和部族篩選在同一排（設計＋PM：必須在最上面） */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="radiogroup"
          aria-label={t('opening.strategyLabel')}
          className="inline-flex rounded-full border border-border bg-muted p-0.5"
        >
          {STRATEGY_IDS.map((id) => {
            const s = data.strategies.find((x) => x.id === id)
            const on = id === strategyId
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setStrategyId(id)}
                className={`min-h-[36px] rounded-full px-4 text-sm font-medium transition-colors ${
                  on ? 'bg-white text-orange-600 shadow-sm ring-1 ring-orange-300' : 'text-muted-foreground'
                }`}
              >
                {s?.name ?? id}
              </button>
            )
          })}
        </div>
        <label className="ml-auto inline-flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">{t('opening.tribeLabel')}</span>
          <select
            value={tribe}
            onChange={(e) => setTribe(e.target.value as TroopTribe)}
            className="min-h-[36px] rounded-full border border-border bg-white px-3 text-sm"
          >
            {OPENING_TRIBES.map((tr) => (
              <option key={tr} value={tr}>
                {t(`tribes.${tr}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 進度 */}
      <div className="mt-3 rounded-lg border border-border bg-white p-3">
        {currentAccount ? (
          <p className="text-sm font-semibold">
            {t('opening.progressOf', {
              name: `${accountPlayerLabel(currentAccount, t('accountSwitcher.unnamedPlayer'))} · ${accountWorldLabel(currentAccount)}`,
            })}
          </p>
        ) : (
          <p className="text-sm">
            {t('opening.noAccount')}{' '}
            <Link to={ROUTES.GAME_ACCOUNTS_NEW} className="font-medium text-orange-600 underline">
              {t('opening.addAccount')}
            </Link>
          </p>
        )}
        <div
          className="mt-2 h-1.5 rounded-full bg-border"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={t('opening.progressLabel')}
        >
          <div
            className="h-1.5 rounded-full bg-orange-500 transition-all"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('opening.progressCount', { done, total })}</p>
        {saveError && (
          <p role="alert" className="mt-1 text-xs text-red-700">
            {t('opening.saveError')}
          </p>
        )}
      </div>

      {/* 步驟（依任務等級分段） */}
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
        {strategy.sections.map((section) => (
          <ChecklistSection
            key={`${strategyId}-${section.id}`}
            section={section}
            tribe={tribe}
            checked={checked}
            open={isOpen(section.id)}
            canCheck={canCheck}
            onToggleSection={() => toggleSection(section.id)}
            onToggleStep={toggleStep}
          />
        ))}
      </div>

      {/* 參考：預設收起來，不跟步驟搶第一屏 */}
      <ReferenceBlock data={data} open={referenceOpen} onToggle={() => setReferenceOpen((v) => !v)} />
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-4 pb-16 sm:px-4">
      <h1 className="mb-3 text-lg font-bold">{t('opening.title')}</h1>
      {children}
    </div>
  )
}

interface ChecklistSectionProps {
  section: OpeningSection
  tribe: TroopTribe
  checked: ReadonlySet<string>
  open: boolean
  canCheck: boolean
  onToggleSection: () => void
  onToggleStep: (stepId: string) => void
}

function ChecklistSection({
  section,
  tribe,
  checked,
  open,
  canCheck,
  onToggleSection,
  onToggleStep,
}: ChecklistSectionProps) {
  const { t } = useTranslation()
  const remaining = remainingSteps(section, checked)
  const total = section.steps.length
  const contentId = `opening-section-${section.id}`
  return (
    <section className="border-b border-border last:border-b-0">
      <h2>
        <button
          type="button"
          onClick={onToggleSection}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center gap-2 px-3 py-3 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <span className="flex-1">
            <span className="block text-sm font-semibold">{section.title}</span>
            {!open && (
              <span className="block text-xs text-muted-foreground">
                {remaining > 0 ? t('opening.remaining', { count: remaining }) : t('opening.sectionDone')}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {remaining === 0 && <Check className="h-3.5 w-3.5 text-green-600" aria-hidden />}
            {t('opening.sectionCount', { done: total - remaining, total })}
          </span>
        </button>
      </h2>
      {open && (
        <div id={contentId}>
          {section.intro && (
            <p className="mx-3 mb-2 whitespace-pre-line rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {section.intro.zh}
            </p>
          )}
          <ul>
            {section.steps.map((step) => (
              <StepRow
                key={step.id}
                step={resolveStep(step, tribe)}
                checked={checked.has(step.id)}
                disabled={!canCheck}
                onToggle={() => onToggleStep(step.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function StepRow({
  step,
  checked,
  disabled,
  onToggle,
}: {
  step: ResolvedStep
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const title = [step.building, step.target].filter(Boolean).join(' ')
  const details: string[] = []
  if (step.missing) {
    details.push(t(step.missing === 'settler_cost' ? 'opening.missingSettler' : 'opening.missingFarmUnit'))
  } else if (step.cost != null && step.cost > 0) {
    details.push(t('opening.cost', { value: formatAmount(step.cost) }))
  }
  if (step.reward_res != null) {
    details.push(
      t('opening.reward', { res: formatAmount(step.reward_res), exp: formatAmount(step.reward_exp ?? 0) })
    )
  }
  if (step.cp) details.push(t('opening.cp', { value: formatAmount(step.cp) }))
  if (step.pop) details.push(t('opening.pop', { value: formatAmount(step.pop) }))
  if (step.res_per_cp != null) details.push(t('opening.resPerCp', { value: formatAmount(Math.round(step.res_per_cp)) }))

  return (
    <li className="border-t border-border first:border-t-0">
      <label className={`flex gap-3 px-3 py-2.5 ${disabled ? '' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          aria-label={t('opening.checkStep', { name: title })}
          className="mt-0.5 h-5 w-5 shrink-0 accent-orange-500"
        />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm ${checked ? 'text-muted-foreground line-through' : 'font-medium'}`}>
            {checked ? <s>{title}</s> : title}
          </span>
          {details.length > 0 && (
            <span className={`block text-xs text-muted-foreground ${checked ? 'opacity-70' : ''}`}>
              {details.join(' · ')}
            </span>
          )}
          {step.skip && !checked && (
            <span className="mt-0.5 block text-xs text-amber-700">{t('opening.skipForTribe')}</span>
          )}
          {step.why && step.why.zh.trim() !== '' && (
            <span className="mt-1 block whitespace-pre-line text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{t('opening.why')}</span>
              {step.why.zh}
            </span>
          )}
        </span>
      </label>
    </li>
  )
}

function ReferenceBlock({
  data,
  open,
  onToggle,
}: {
  data: OpeningChecklistData
  open: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation()
  const [tableIndex, setTableIndex] = useState(0)
  const party = data.reference.party_cp
  const table: OpeningTaskTable | undefined = data.reference.tasks[tableIndex]
  return (
    <section className="mt-6 rounded-lg border border-border bg-white">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls="opening-reference"
          className="flex w-full items-center gap-2 px-3 py-3 text-left"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          <span className="flex-1 text-sm font-semibold">{t('opening.reference')}</span>
          <span className="text-xs text-muted-foreground">{t('opening.referenceHint')}</span>
        </button>
      </h2>
      {open && (
        <div id="opening-reference" className="space-y-5 border-t border-border px-3 py-3">
          <div>
            <h3 className="text-sm font-semibold">{t('opening.partyTitle')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('opening.partyNote', {
                production: formatAmount(party.example_inputs.production_per_hour),
                farming: formatAmount(party.example_inputs.farming_per_hour),
                cp: formatAmount(party.example_inputs.cp_to_go),
              })}
            </p>
            {/* 手機也放得下：三欄，每格上面是 Excel 的標籤、下面是數字 */}
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium">{t('opening.colResources')}</th>
                    <th className="py-1.5 pr-2 font-medium">{t('opening.colCp')}</th>
                    <th className="py-1.5 text-right font-medium">{t('opening.colTime')}</th>
                  </tr>
                </thead>
                {party.phases.map((phase) => (
                  <tbody key={phase.title}>
                    <tr>
                      <th colSpan={3} className="bg-muted px-1 py-1 text-left font-semibold">
                        {phase.title}
                      </th>
                    </tr>
                    {phase.rows.map((row, i) => (
                      <tr key={i} className="border-b border-border align-top last:border-b-0">
                        <td className="py-1.5 pr-2">
                          <span className="block text-muted-foreground">{row.res_label}</span>
                          <span className="block tabular-nums">
                            {row.resources != null ? formatAmount(row.resources) : '—'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-2">
                          <span className="block text-muted-foreground">{row.cp_label}</span>
                          <span className="block tabular-nums">
                            {row.cp_value != null ? formatAmount(row.cp_value) : '—'}
                          </span>
                        </td>
                        <td className="py-1.5 text-right">
                          <span className="block tabular-nums text-muted-foreground">
                            {row.hours ? t('opening.hoursValue', { value: formatAmount(row.hours) }) : '—'}
                          </span>
                          <span className="block tabular-nums">
                            {row.cp_left == null
                              ? ''
                              : row.cp_left <= 0
                                ? t('opening.cpReached') // 不顯示負數；Excel 的數字本身不改
                                : t('opening.cpLeftValue', { value: formatAmount(row.cp_left) })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t('opening.tasksTitle')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('opening.tasksNote', { level: data.source.hero_level })}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5" role="tablist" aria-label={t('opening.tasksTitle')}>
              {data.reference.tasks.map((tb, i) => (
                <button
                  key={tb.title}
                  type="button"
                  role="tab"
                  aria-selected={i === tableIndex}
                  onClick={() => setTableIndex(i)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    i === tableIndex
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {tb.title}
                </button>
              ))}
            </div>
            {table && (
              <div className="mt-2 overflow-x-auto" role="tabpanel">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-1.5 pr-2 font-medium">{t('opening.colTask')}</th>
                      <th className="py-1.5 pr-2 text-right font-medium">{t('opening.colTier')}</th>
                      <th className="py-1.5 pr-2 font-medium">{t('opening.colTarget')}</th>
                      <th className="py-1.5 pr-2 text-right font-medium">{t('opening.colRewardRes')}</th>
                      <th className="py-1.5 text-right font-medium">{t('opening.colRewardExp')}</th>
                    </tr>
                  </thead>
                  {table.groups.map((group) => (
                    <tbody key={group.title}>
                      <tr>
                        <th colSpan={5} className="bg-muted px-1 py-1 text-left font-semibold">
                          {group.title}
                        </th>
                      </tr>
                      {group.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="py-1.5 pr-2">{row.task}</td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">{row.tier}</td>
                          <td className="py-1.5 pr-2">{row.target}</td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">
                            {row.reward_res != null ? formatAmount(row.reward_res) : ''}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {row.reward_exp != null ? formatAmount(row.reward_exp) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

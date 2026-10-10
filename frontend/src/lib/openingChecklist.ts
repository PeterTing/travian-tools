import type { TroopTribe } from '@/types/game'
import type {
  OpeningSection,
  OpeningStep,
  OpeningStepTribeOverride,
} from '@/types/openingChecklist'

export const OPENING_TRIBES: TroopTribe[] = [
  'romans',
  'gauls',
  'teutons',
  'egyptians',
  'huns',
  'vikings',
  'spartans',
]

/** 帳號沒填部族時的預設（線框稿的範例是高盧） */
export const FALLBACK_TRIBE: TroopTribe = 'gauls'

export interface ResolvedStep extends OpeningStep {
  /** Excel 沒有這個部族的資料（維京、斯巴達的開拓者花費、打野兵） */
  missing?: OpeningStepTribeOverride['missing']
}

/**
 * 把跟部族有關的欄位（開拓者花費、打野兵）套上去；步驟本身不變。
 */
export function resolveStep(step: OpeningStep, tribe: TroopTribe): ResolvedStep {
  const override = step.by_tribe?.[tribe]
  if (!override) return step
  const { missing, ...fields } = override
  const resolved: ResolvedStep = { ...step, ...fields }
  if (missing) resolved.missing = missing
  return resolved
}

/** 這一段還沒勾的步數 */
export function remainingSteps(section: OpeningSection, checked: ReadonlySet<string>): number {
  return section.steps.filter((s) => !checked.has(s.id)).length
}

export interface ProgressCounts {
  requiredDone: number
  requiredTotal: number
  optionalDone: number
  optionalTotal: number
}

/** 主進度只算必做的步驟；選做段落（便宜的文明點建築）另外算 */
export function progressCounts(
  sections: OpeningSection[],
  checked: ReadonlySet<string>
): ProgressCounts {
  const counts: ProgressCounts = { requiredDone: 0, requiredTotal: 0, optionalDone: 0, optionalTotal: 0 }
  for (const section of sections) {
    for (const step of section.steps) {
      const done = checked.has(step.id)
      if (section.optional) {
        counts.optionalTotal += 1
        if (done) counts.optionalDone += 1
      } else {
        counts.requiredTotal += 1
        if (done) counts.requiredDone += 1
      }
    }
  }
  return counts
}

/** 預設只展開第一個還有沒勾的段落；全部做完就都收起來 */
export function defaultOpenSection(
  sections: OpeningSection[],
  checked: ReadonlySet<string>
): string | null {
  return sections.find((s) => remainingSteps(s, checked) > 0)?.id ?? null
}

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** 1234.5 → 1,234.5；負數用「−」 */
export function formatAmount(value: number): string {
  const text = numberFormat.format(Math.abs(value))
  return value < 0 ? `−${text}` : text
}

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
  /** Excel 沒有這個部族的資料（維京、斯巴達的拓荒者花費、打野兵） */
  missing?: OpeningStepTribeOverride['missing']
}

/**
 * 把跟部族有關的欄位（拓荒者花費、打野兵）套上去；步驟本身不變。
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

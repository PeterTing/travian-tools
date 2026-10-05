/**
 * 開局攻略清單（P0-10）的資料型別。
 * 內容是 backend/data/static/opening_checklist.json（scripts/convert_opening_checklist.py 從 Peter 的 Excel 轉出）。
 */
import type { TroopTribe as TribeType } from './game'

export type OpeningStrategyId = '4p-farm' | '3p-sim'

export interface OpeningAdvice {
  zh: string
  en: string
  /** 翻譯工作表的儲存格，或 manual（人工翻譯） */
  source: string
}

/** 跟部族有關的欄位（拓荒者花費、打野兵）；missing＝Excel 沒有這個部族的資料 */
export interface OpeningStepTribeOverride {
  building?: string
  building_en?: string
  target?: string | null
  target_en?: string | null
  cost?: number | null
  cp?: number | null
  pop?: number | null
  skip?: boolean
  missing?: 'settler_cost' | 'farm_unit'
}

export type OpeningStepKind =
  | 'build'
  | 'task'
  | 'party'
  | 'settlers'
  | 'farm_units'
  | 'farm_unit_only'
  | 'research'
  | 'note'

export interface OpeningStep {
  id: string
  row: number
  kind: OpeningStepKind
  building: string
  building_en: string
  target: string | null
  target_en: string | null
  tier: number | null
  cost: number | null
  reward_res: number | null
  reward_exp: number | null
  cp: number | null
  pop: number | null
  res_per_cp?: number | null
  count?: number
  /** 這個部族不用做這一步（例如只有帝國騎兵才要的倉庫 5） */
  skip?: boolean
  why: OpeningAdvice | null
  by_tribe?: Partial<Record<TribeType, OpeningStepTribeOverride>>
}

export interface OpeningSection {
  id: string
  title: string
  tier: number | null
  intro: OpeningAdvice | null
  steps: OpeningStep[]
}

export interface OpeningStrategy {
  id: OpeningStrategyId
  name: string
  sheet: string
  parties: number
  total_steps: number
  sections: OpeningSection[]
}

export interface OpeningTaskRow {
  task: string
  tier: number
  target: string
  reward_res: number | null
  reward_exp: number | null
}

export interface OpeningTaskTable {
  title: string
  groups: { title: string; rows: OpeningTaskRow[] }[]
}

export interface OpeningPartyRow {
  res_label: string
  resources: number | null
  cp_label: string
  cp_value: number | null
  hours: number | null
  cp_left: number | null
}

export interface OpeningChecklistData {
  version: number
  source: { file: string; sha256: string; hero_level: number; sheets: Record<string, string> }
  tribe_data: {
    settler_cost: Partial<Record<TribeType, number | null>>
    farm_unit: Partial<Record<TribeType, { en: string; zh: string; cost: number } | null>>
  }
  strategies: OpeningStrategy[]
  reference: {
    tasks: OpeningTaskTable[]
    party_cp: {
      example_inputs: { production_per_hour: number; farming_per_hour: number; cp_to_go: number }
      phases: { title: string; rows: OpeningPartyRow[] }[]
    }
  }
}

export interface OpeningProgress {
  account_id: string
  world_id: string
  strategy: OpeningStrategyId
  checked_step_ids: string[]
  checked_count: number
  total_steps: number
}

import api from './api'

// ============ Types ============

/** 神器（官方 S102）：大型（帳號）1.5×、獨特 2×、小型（村莊）2× */
export type ArtifactBonus = 'none' | 'account_1_5x' | 'unique_2x' | 'village_2x'

export interface PathCalculatorRequest {
  start_x: number
  start_y: number
  target_x: number
  target_y: number
  unit_speed: number
  tournament_square_level?: number
  hero_bonus?: number
  artifact_bonus?: ArtifactBonus
  server_speed?: number
}

export interface PathCalculatorResponse {
  distance: number
  travel_time_seconds: number
  travel_time_formatted: string
  arrival_speed: number
}

export interface InterceptionRequest {
  attacker_x: number
  attacker_y: number
  defender_x: number
  defender_y: number
  attack_arrival_time: string
  attacker_speed: number
  catcher_x: number
  catcher_y: number
  catcher_speed: number
  server_speed?: number
  catcher_ts_level?: number
  /** 攔截者英雄靴子 %（只算超過 20 格，跟競技場相加；P0-21） */
  catcher_hero_bonus?: number
  /** 攻擊方競技場等級（回程用；P0-21） */
  attacker_ts_level?: number
  /** 攻擊方英雄靴子 %（回程用；P0-21） */
  attacker_hero_bonus?: number
}

export interface InterceptionResponse {
  attacker_return_time: string
  send_time: string
  /** 跟攻擊到達那天比差幾天：1 = 明天、-1 = 前一天 */
  return_day_offset?: number
  send_day_offset?: number
  travel_time_formatted: string
  distance_to_attacker: number
}

export interface CulturePointsRequest {
  current_culture_points?: number
  cp_production_per_day?: number
  current_villages?: number
}

export interface CulturePointsVillage {
  village_number: number
  cp_required: number
  cp_remaining: number
  days_until: number | null
  date: string | null
}

export interface CulturePointsResponse {
  villages: CulturePointsVillage[]
}

export interface TechnologyRequest {
  tribe: string
  research_levels?: number[]
}

export interface TroopTechRow {
  troop_name: string
  /** 遊戲內中文名稱（P0-18） */
  troop_name_zh?: string
  troop_id: string
  attack_values: number[]
  defense_infantry_values: number[]
  defense_cavalry_values: number[]
}

export interface TechnologyResponse {
  tribe: string
  levels: number[]
  troops: TroopTechRow[]
}

export interface NpcCalculatorRequest {
  wood: number
  clay: number
  iron: number
  crop: number
  desired_ratios: Record<string, number>
  warehouse_capacity?: number | null
  granary_capacity?: number | null
}

export interface NpcCalculatorResponse {
  total_resources: number
  result: Record<string, number>
  difference: Record<string, number>
  unallocated?: number
  warehouse_capacity?: number | null
  granary_capacity?: number | null
}

export interface SaveTroopsRequest {
  /** 躲兵用不到村莊座標，可省略 */
  village_x?: number
  village_y?: number
  unit_speed: number
  offline_hours: number
  server_speed?: number
  tournament_square_level?: number
  /** 英雄靴子 %（P0-21） */
  hero_bonus?: number
}

export interface SaveTroopsResponse {
  ideal_distance: number
  send_time_formatted: string
  return_time_formatted: string
  /** 地圖上最遠能走多遠（約 282.84 格） */
  max_map_distance?: number
  exceeds_map?: boolean
}

export interface PathSpeedTsRequest {
  attacker_x: number
  attacker_y: number
  target_x: number
  target_y: number
  travel_time_seconds: number
  server_speed?: number
  /** 攻擊方英雄靴子 %（P0-21） */
  hero_bonus?: number
  artifact_bonus?: ArtifactBonus
  /** 容許誤差（秒），預設 30 */
  tolerance_seconds?: number
}

export interface SpeedTsMatch {
  unit_speed: number
  possible_units: string[]
  /** 中文名（含部族），跟 possible_units 同順序（P0-17 (h)） */
  possible_units_zh?: string[]
  tournament_square_level: number
  calculated_travel_time_seconds: number
  calculated_travel_time_formatted: string
}

export interface PathSpeedTsResponse {
  distance: number
  possible_matches: SpeedTsMatch[]
  /** 速度還沒有第一手出處（待驗證）、沒有列入比對的兵種（P0-15） */
  unverified_units?: string[]
  /** 距離 ≤ 20 格：競技場不影響（S71），每個速度只回一筆 */
  ts_irrelevant?: boolean
}

// ============ Village Builder ============

export interface OasisConfig {
  crop_bonus: number
  wood_bonus: number
  clay_bonus: number
  iron_bonus: number
}

export interface VillageBuilderRequest {
  cropper_type: '15c' | '9c' | '7c' | '6c' | '4446' | '3347'
  oases: OasisConfig[]
  tribe_egyptian: boolean
  gold_plus: boolean
  target_field_level: number
}

export interface BuildStep {
  step: number
  action: 'upgrade_field' | 'upgrade_bonus_building' | 'note'
  target: string
  from_level: number | null
  to_level: number | null
  reason: string | null
}

export interface VillageBuilderResponse {
  cropper_type: string
  tribe_egyptian: boolean
  gold_plus: boolean
  target_field_level: number
  total_steps: number
  build_sequence: BuildStep[]
  estimated_days: number
}

// ============ Crop Scouter ============

export interface AttackerProfile {
  /** 前端給每個攻擊者的穩定 id，後端原樣回傳（兩個攻擊者同名也對得回去，P0-17 (i)） */
  attacker_id?: string
  village_label: string
  x: number
  y: number
  unit_speed: number
  ts_level: number
  /** 英雄靴子 %（P0-21） */
  hero_bonus?: number
  allow_ts_adjustment: boolean
}

export interface TsOptimizerRequest {
  target_x: number
  target_y: number
  target_arrival: string // ISO 8601
  attackers: AttackerProfile[]
  wave_spacing_seconds?: number
  server_speed?: number
}

export interface TsOptimizerResult {
  attacker_id?: string | null
  village_label: string
  recommended_ts_level: number
  /** 目前競技場來不及，要升到 recommended_ts_level */
  ts_level_changed?: boolean
  /** 升到 20 級也來不及 */
  unreachable?: boolean
  send_time: string
  /** 這一波實際抵達時間（目標 + 波次 × 間距） */
  arrival_time?: string
  wave?: number
  travel_time_formatted: string
  distance: number
}

export interface TsOptimizerResponse {
  target_arrival: string
  results: TsOptimizerResult[]
  warnings: string[]
}

// ============ API Client ============

export const advancedCalculatorApi = {
  calculatePath: async (request: PathCalculatorRequest): Promise<PathCalculatorResponse> => {
    const response = await api.post('/advanced-calculator/path', request)
    return response.data
  },

  calculateInterception: async (request: InterceptionRequest): Promise<InterceptionResponse> => {
    const response = await api.post('/advanced-calculator/interception', request)
    return response.data
  },

  calculateCulturePoints: async (
    request: CulturePointsRequest
  ): Promise<CulturePointsResponse> => {
    const response = await api.post('/advanced-calculator/culture-points', request)
    return response.data
  },

  calculateTechnology: async (request: TechnologyRequest): Promise<TechnologyResponse> => {
    const response = await api.post('/advanced-calculator/technology', request)
    return response.data
  },

  calculateNpc: async (request: NpcCalculatorRequest): Promise<NpcCalculatorResponse> => {
    const response = await api.post('/advanced-calculator/npc', request)
    return response.data
  },

  calculateSaveTroops: async (request: SaveTroopsRequest): Promise<SaveTroopsResponse> => {
    const response = await api.post('/advanced-calculator/save-troops', request)
    return response.data
  },

  calculatePathSpeedTs: async (
    request: PathSpeedTsRequest
  ): Promise<PathSpeedTsResponse> => {
    const response = await api.post('/advanced-calculator/path-speed-ts', request)
    return response.data
  },

  calculateVillageBuilder: async (
    request: VillageBuilderRequest
  ): Promise<VillageBuilderResponse> => {
    const response = await api.post('/advanced-calculator/village-builder', request)
    return response.data
  },

  calculateTsOptimizer: async (
    request: TsOptimizerRequest
  ): Promise<TsOptimizerResponse> => {
    const response = await api.post('/advanced-calculator/ts-optimizer', request)
    return response.data
  },
}

export default advancedCalculatorApi

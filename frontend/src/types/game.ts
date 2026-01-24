// ============ 認證類型 ============

export interface UserRegisterRequest {
  username: string
  email: string
  password: string
}

export interface UserLoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface UserResponse {
  user_id: string
  username: string
  email: string
}

export interface MessageResponse {
  message: string
}

// ============ 建築類型 ============

export type BuildingCategory =
  | 'infrastructure'
  | 'military'
  | 'resource'
  | 'defense'
  | 'special'

export interface BuildingListItem {
  building_id: string
  name_zh: string
  name_en: string
  category: BuildingCategory
  max_level: number
  tribe_specific: string | null
}

export interface BuildingListResponse {
  total: number
  buildings: BuildingListItem[]
}

export interface BuildingLevel {
  level: number
  cost_wood: number
  cost_clay: number
  cost_iron: number
  cost_crop: number
  total_cost: number
  build_time_base: number
  population: number
  culture_points: number
  effect_value: number | null
  effect_description: string | null
}

export interface BuildingPrerequisite {
  building_id: string
  level: number
}

export interface BuildingDetail {
  building_id: string
  name_zh: string
  name_en: string
  category: BuildingCategory
  max_level: number
  description_zh: string | null
  description_en: string | null
  tribe_specific: string | null
  prerequisites: BuildingPrerequisite[]
  levels: BuildingLevel[]
}

// ============ 兵種類型 ============

export type TroopTribe =
  | 'romans'
  | 'gauls'
  | 'teutons'
  | 'huns'
  | 'egyptians'
  | 'vikings'
  | 'spartans'

export type TroopCategory =
  | 'infantry'
  | 'cavalry'
  | 'siege'
  | 'scout'
  | 'special'
  | 'settler'

export interface TroopListItem {
  troop_id: string
  name_zh: string
  name_en: string
  tribe: TroopTribe
  category: TroopCategory
  attack: number
  defense_infantry: number
  defense_cavalry: number
  speed: number
  crop_consumption: number
}

export interface TroopListResponse {
  total: number
  troops: TroopListItem[]
}

export interface TroopDetail {
  troop_id: string
  name_zh: string
  name_en: string
  tribe: TroopTribe
  category: TroopCategory
  attack: number
  defense_infantry: number
  defense_cavalry: number
  speed: number
  carry_capacity: number
  cost_wood: number
  cost_clay: number
  cost_iron: number
  cost_crop: number
  total_cost: number
  crop_consumption: number
  training_time_base: number
  training_building: string
  academy_level_required: number
  description_zh: string | null
  description_en: string | null
  attack_per_crop: number
  defense_infantry_per_crop: number
  defense_cavalry_per_crop: number
  attack_per_cost: number
}

export interface TroopCompareItem {
  troop_id: string
  name_zh: string
  name_en: string
  tribe: TroopTribe
  category: TroopCategory
  attack: number
  defense_infantry: number
  defense_cavalry: number
  speed: number
  total_cost: number
  crop_consumption: number
  attack_per_crop: number
  defense_infantry_per_crop: number
  attack_per_cost: number
}

export interface TroopCompareResponse {
  troops: TroopCompareItem[]
  comparison_summary: {
    best_attack: string
    best_defense: string
    best_speed: string
    best_attack_efficiency: string
  }
}

// ============ 資源田類型 ============

export type ResourceType = 'wood' | 'clay' | 'iron' | 'crop'

export interface ResourceFieldListItem {
  resource_type: ResourceType
  name_zh: string
  name_en: string
  max_level: number
  max_level_capital: number
}

export interface ResourceFieldListResponse {
  total: number
  resource_fields: ResourceFieldListItem[]
}

export interface ResourceFieldLevel {
  level: number
  production_per_hour: number
  cost_wood: number
  cost_clay: number
  cost_iron: number
  cost_crop: number
  total_cost: number
  build_time_base: number
  population: number
  culture_points: number
}

export interface ResourceFieldDetail {
  resource_type: ResourceType
  name_zh: string
  name_en: string
  max_level: number
  max_level_capital: number
  levels: ResourceFieldLevel[]
}

export interface ResourceLevelResponse {
  resource_type: ResourceType
  name_zh: string
  name_en: string
  level: number
  production_per_hour: number
  cost_wood: number
  cost_clay: number
  cost_iron: number
  cost_crop: number
  total_cost: number
  build_time_base: number
  population: number
  culture_points: number
  roi_hours: number | null
}

// ============ 計算器類型 ============

export interface BuildingUpgradeRequest {
  building_id: string
  from_level: number
  to_level: number
  main_building_level?: number
  server_speed?: number
}

export interface BuildingUpgradeResponse {
  building_id: string
  building_name_zh: string
  building_name_en: string
  from_level: number
  to_level: number
  cost: {
    wood: number
    clay: number
    iron: number
    crop: number
  }
  total_cost: number
  build_time_base: number
  build_time_actual: number
  build_time_formatted: string
  population_increase: number
  culture_points: number
  culture_points_per_day: number
  main_building_level: number
  server_speed: number
}

export interface ResourceRoiRequest {
  resource_type: string
  current_level: number
  oasis_bonus?: number
  building_bonus?: number
}

export interface ResourceRoiResponse {
  resource_type: ResourceType
  current_level: number
  target_level: number
  next_level: number
  upgrade_cost: number
  total_cost: number
  current_production: number
  next_production: number
  production_increase: number
  roi_hours: number
  roi_formatted: string
}

export interface BatchRoiRequest {
  resource_fields: Array<{ resource_type: string; current_level: number }>
  oasis_bonus?: Record<string, number>
}

export interface BatchRoiResponse {
  results: ResourceRoiResponse[]
  recommended_order: string[]
}

export interface BattleUnit {
  troop_id: string
  count: number
}

export interface BattleSimulateRequest {
  attacker_troops: BattleUnit[]
  defender_troops?: BattleUnit[]
  wall_level?: number
  defender_tribe?: string
}

export interface BattleSimulateResponse {
  result: 'attacker_wins' | 'defender_wins' | 'draw'
  attacker_losses: Record<string, number>
  defender_losses: Record<string, number>
  attacker_survival_rate: number
  defender_survival_rate: number
  resources_plundered: Record<string, number> | null
}

export interface CropBalanceRequest {
  buildings: Array<{ building_id: string; level: number }>
  troops?: BattleUnit[]
  crop_fields_production?: number
  oasis_bonus?: number
}

export interface CropBalanceResponse {
  population_consumption: number
  troop_consumption: number
  total_consumption: number
  crop_production: number
  balance: number
  status: 'surplus' | 'balanced' | 'deficit' | 'critical'
  warning_message: string | null
  suggestions: string[]
}

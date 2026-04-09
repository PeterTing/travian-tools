import api from './api'

// ============ Types ============

export interface PathCalculatorRequest {
  start_x: number
  start_y: number
  target_x: number
  target_y: number
  unit_speed: number
  tournament_square_level?: number
  hero_bonus?: number
  artifact_bonus?: string
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
}

export interface InterceptionResponse {
  attacker_return_time: string
  send_time: string
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
}

export interface NpcCalculatorResponse {
  total_resources: number
  result: Record<string, number>
  difference: Record<string, number>
}

export interface SaveTroopsRequest {
  village_x: number
  village_y: number
  unit_speed: number
  offline_hours: number
  server_speed?: number
  tournament_square_level?: number
}

export interface SaveTroopsResponse {
  ideal_distance: number
  send_time_formatted: string
  return_time_formatted: string
}

export interface PathSpeedTsRequest {
  attacker_x: number
  attacker_y: number
  target_x: number
  target_y: number
  travel_time_seconds: number
  server_speed?: number
}

export interface SpeedTsMatch {
  unit_speed: number
  possible_units: string[]
  tournament_square_level: number
  calculated_travel_time_seconds: number
  calculated_travel_time_formatted: string
}

export interface PathSpeedTsResponse {
  distance: number
  possible_matches: SpeedTsMatch[]
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
}

export default advancedCalculatorApi

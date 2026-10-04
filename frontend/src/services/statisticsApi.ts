import api from './api'

export interface ServerDayStats {
  total_players: number
  active_players: number
  new_players: number
  deleted_players: number
  villages_settled: number
  villages_destroyed: number
  conquests: number
  total_population: number
}

export interface ServerOverview {
  server_url: string
  data_status: string
  today: ServerDayStats
  yesterday: ServerDayStats | null
}

export interface PlayerRankingItem {
  rank: number
  player_id: number
  player_name: string
  alliance_name: string | null
  population: number
  population_diff: number
  villages: number
  villages_diff: number
  conquests: number
  conquests_diff: number
}

export interface AllianceRankingItem {
  rank: number
  alliance_id: number
  alliance_name: string
  member_count: number
  member_diff: number
  population: number
  population_diff: number
  population_per_member: number
  conquests: number
  conquests_diff: number
}

export interface ConquestItem {
  village_id: number
  village_name: string
  x: number
  y: number
  old_player_name: string
  old_alliance_name: string | null
  new_player_name: string
  new_alliance_name: string | null
  detected_at: string
}

export interface NameChangeItem {
  player_id: number
  old_name: string
  new_name: string
  game_day: number | null
  detected_at: string
}

export interface InactiveVillage {
  village_id: number
  village_name: string
  x: number
  y: number
  player_name: string
  alliance_name: string | null
  population: number
  population_diff_7d: number
  player_villages: number
}

export interface PaginatedResponse<T = Record<string, unknown>> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export const statisticsApi = {
  async getServerOverview(serverUrl: string): Promise<ServerOverview | null> {
    const response = await api.get<ServerOverview | null>('/statistics/server-overview', {
      params: { server_url: serverUrl },
    })
    return response.data
  },

  async getPlayerRanking(params: {
    server_url: string
    sort_by?: string
    order?: string
    page?: number
    page_size?: number
    search?: string
  }): Promise<PaginatedResponse<PlayerRankingItem>> {
    const response = await api.get<PaginatedResponse<PlayerRankingItem>>(
      '/statistics/players/ranking',
      { params },
    )
    return response.data
  },

  async getAllianceRanking(params: {
    server_url: string
    sort_by?: string
    order?: string
    page?: number
    page_size?: number
    search?: string
  }): Promise<PaginatedResponse<AllianceRankingItem>> {
    const response = await api.get<PaginatedResponse<AllianceRankingItem>>(
      '/statistics/alliances/ranking',
      { params },
    )
    return response.data
  },

  async getConquests(params: {
    server_url: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<ConquestItem>> {
    const response = await api.get<PaginatedResponse<ConquestItem>>(
      '/statistics/conquests',
      { params },
    )
    return response.data
  },

  async getNameChanges(params: {
    server_url: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<NameChangeItem>> {
    const response = await api.get<PaginatedResponse<NameChangeItem>>(
      '/statistics/name-changes',
      { params },
    )
    return response.data
  },

  async searchInactives(params: {
    server_url: string
    center_x?: number
    center_y?: number
    radius?: number
    max_population_change?: number
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<InactiveVillage>> {
    const response = await api.get<PaginatedResponse<InactiveVillage>>(
      '/statistics/search/inactives',
      { params },
    )
    return response.data
  },

  async uploadSnapshot(
    serverUrl: string,
    file: File,
  ): Promise<{ success: boolean; message: string }> {
    const form = new FormData()
    form.append('server_url', serverUrl)
    form.append('file', file)
    const response = await api.post<{ success: boolean; message: string }>(
      '/statistics/snapshot/upload',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },
}

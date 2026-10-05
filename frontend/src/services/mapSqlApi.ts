import api from './api'

export interface MapVillage {
  x: number
  y: number
  field_type: number
  village_id: number | null
  village_name: string | null
  player_id: number | null
  player_name: string | null
  alliance_id: number | null
  alliance_name: string | null
  population: number
  is_capital: boolean
}

export interface MapPlayer {
  player_id: number
  player_name: string
  alliance_id: number | null
  alliance_name: string | null
  villages: MapVillage[]
  total_population: number
  village_count: number
}

export interface MapAlliance {
  alliance_id: number
  alliance_name: string
  members: MapPlayer[]
  total_population: number
  member_count: number
}

export interface MapParseResponse {
  villages: MapVillage[]
  players: MapPlayer[]
  alliances: MapAlliance[]
  total_villages: number
  total_players: number
  total_alliances: number
}

export interface MapSaveResponse {
  success: boolean
  message: string
  villages_saved: number
  players_found: number
  alliances_found: number
}

export const mapSqlApi = {
  /**
   * 解析 map.sql 內容（不儲存）
   */
  parse: async (sqlContent: string): Promise<MapParseResponse> => {
    const response = await api.post<MapParseResponse>('/map-sql/parse', {
      sql_content: sqlContent,
    })
    return response.data
  },

  /**
   * 手動上傳 map.sql（純文字或 .gz）並儲存到帳號
   */
  upload: async (accountId: string, file: File): Promise<MapSaveResponse> => {
    const form = new FormData()
    form.append('account_id', accountId)
    form.append('file', file)
    const response = await api.post<MapSaveResponse>('/map-sql/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * 解析並儲存 map.sql 到資料庫
   */
  save: async (accountId: string, sqlContent: string): Promise<MapSaveResponse> => {
    const response = await api.post<MapSaveResponse>('/map-sql/save', {
      account_id: accountId,
      sql_content: sqlContent,
    })
    return response.data
  },

  /**
   * 搜尋玩家
   */
  searchPlayer: async (
    sqlContent: string,
    playerName: string
  ): Promise<MapPlayer[]> => {
    const response = await api.post<MapPlayer[]>(
      `/map-sql/search/player?player_name=${encodeURIComponent(playerName)}`,
      { sql_content: sqlContent }
    )
    return response.data
  },

  /**
   * 搜尋聯盟
   */
  searchAlliance: async (
    sqlContent: string,
    allianceName: string
  ): Promise<MapAlliance[]> => {
    const response = await api.post<MapAlliance[]>(
      `/map-sql/search/alliance?alliance_name=${encodeURIComponent(allianceName)}`,
      { sql_content: sqlContent }
    )
    return response.data
  },

  /**
   * 搜尋範圍內村莊
   */
  searchVillagesInRange: async (
    sqlContent: string,
    centerX: number,
    centerY: number,
    radius: number
  ): Promise<MapVillage[]> => {
    const response = await api.post<MapVillage[]>(
      `/map-sql/search/villages-in-range?center_x=${centerX}&center_y=${centerY}&radius=${radius}`,
      { sql_content: sqlContent }
    )
    return response.data
  },
}

export default mapSqlApi

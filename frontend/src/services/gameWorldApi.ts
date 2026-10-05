import api from './api'
import type { GameWorld, GameWorldListResponse, GameWorldUpdate } from '@/types/game'

/** 遊戲世界（新增遊戲帳號時自動建立）；目前只能手動改伺服器的 UTC 時差 */
export const gameWorldApi = {
  getAll: async (): Promise<GameWorldListResponse> => {
    const response = await api.get<GameWorldListResponse>('/game-worlds')
    return response.data
  },

  update: async (worldId: string, data: GameWorldUpdate): Promise<GameWorld> => {
    const response = await api.patch<GameWorld>(`/game-worlds/${worldId}`, data)
    return response.data
  },
}

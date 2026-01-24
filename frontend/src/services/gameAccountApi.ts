import api from './api'
import type {
  GameAccount,
  GameAccountCreate,
  GameAccountListResponse,
  GameAccountUpdate,
} from '@/types/game'

export const gameAccountApi = {
  /**
   * 建立遊戲帳號
   */
  create: async (data: GameAccountCreate): Promise<GameAccount> => {
    const response = await api.post<GameAccount>('/game-accounts', data)
    return response.data
  },

  /**
   * 取得遊戲帳號列表
   */
  getAll: async (includeInactive = false): Promise<GameAccountListResponse> => {
    const response = await api.get<GameAccountListResponse>('/game-accounts', {
      params: { include_inactive: includeInactive },
    })
    return response.data
  },

  /**
   * 取得單一遊戲帳號
   */
  getById: async (accountId: string): Promise<GameAccount> => {
    const response = await api.get<GameAccount>(`/game-accounts/${accountId}`)
    return response.data
  },

  /**
   * 更新遊戲帳號
   */
  update: async (
    accountId: string,
    data: GameAccountUpdate
  ): Promise<GameAccount> => {
    const response = await api.put<GameAccount>(
      `/game-accounts/${accountId}`,
      data
    )
    return response.data
  },

  /**
   * 刪除遊戲帳號
   */
  delete: async (accountId: string): Promise<void> => {
    await api.delete(`/game-accounts/${accountId}`)
  },
}

export default gameAccountApi

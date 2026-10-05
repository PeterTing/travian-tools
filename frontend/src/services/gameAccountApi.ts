import api from './api'
import { resendAccountsToExtension } from './extensionBridge'
import type {
  GameAccount,
  GameAccountCreate,
  GameAccountListResponse,
  GameAccountUpdate,
} from '@/types/game'

/** 帳號清單變了（新增、修改、刪除）就把「存到」的選項重新交給擴充；失敗不影響操作 */
function notifyExtension(): void {
  resendAccountsToExtension().catch(() => undefined)
}

export const gameAccountApi = {
  /**
   * 建立遊戲帳號
   */
  create: async (data: GameAccountCreate): Promise<GameAccount> => {
    const response = await api.post<GameAccount>('/game-accounts', data)
    // 帳號清單變了：擴充「存到」的選項也要更新
    notifyExtension()
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
    notifyExtension()
    return response.data
  },

  /**
   * 刪除遊戲帳號
   */
  delete: async (accountId: string): Promise<void> => {
    await api.delete(`/game-accounts/${accountId}`)
    notifyExtension()
  },
}

export default gameAccountApi

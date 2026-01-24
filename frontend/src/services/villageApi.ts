import api from './api'
import type {
  Village,
  VillageCreate,
  VillageDetail,
  VillageListResponse,
  VillageUpdate,
} from '@/types/game'

export const villageApi = {
  /**
   * 取得村莊列表
   */
  async getAll(accountId?: string): Promise<VillageListResponse> {
    const params = accountId ? { account_id: accountId } : {}
    const response = await api.get<VillageListResponse>('/villages', { params })
    return response.data
  },

  /**
   * 取得村莊詳情
   */
  async getById(villageId: string): Promise<VillageDetail> {
    const response = await api.get<VillageDetail>(`/villages/${villageId}`)
    return response.data
  },

  /**
   * 建立村莊
   */
  async create(data: VillageCreate): Promise<Village> {
    const response = await api.post<Village>('/villages', data)
    return response.data
  },

  /**
   * 更新村莊
   */
  async update(villageId: string, data: VillageUpdate): Promise<Village> {
    const response = await api.put<Village>(`/villages/${villageId}`, data)
    return response.data
  },

  /**
   * 刪除村莊
   */
  async delete(villageId: string): Promise<void> {
    await api.delete(`/villages/${villageId}`)
  },
}

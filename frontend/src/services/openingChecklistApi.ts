import api from './api'
import type { OpeningChecklistData, OpeningProgress, OpeningStrategyId } from '@/types/openingChecklist'

/** 開局攻略清單（P0-10）：內容是靜態資料；進度按帳號 × 世界 × 攻略存在後端 */
export const openingChecklistApi = {
  getChecklist: async (): Promise<OpeningChecklistData> => {
    const response = await api.get<OpeningChecklistData>('/opening-checklist')
    return response.data
  },

  getProgress: async (accountId: string, strategy: OpeningStrategyId): Promise<OpeningProgress> => {
    const response = await api.get<OpeningProgress>(`/opening-checklist/progress/${accountId}/${strategy}`)
    return response.data
  },

  /** 勾選或取消一步；同樣的值送幾次結果都一樣 */
  setStep: async (
    accountId: string,
    strategy: OpeningStrategyId,
    stepId: string,
    checked: boolean
  ): Promise<OpeningProgress> => {
    const response = await api.put<OpeningProgress>(
      `/opening-checklist/progress/${accountId}/${strategy}/${stepId}`,
      { checked }
    )
    return response.data
  },
}

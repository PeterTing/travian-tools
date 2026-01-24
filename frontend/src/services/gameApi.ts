import api from './api'
import type {
  BuildingListResponse,
  BuildingDetail,
  TroopListResponse,
  TroopDetail,
  TroopCompareResponse,
  ResourceFieldListResponse,
  ResourceFieldDetail,
  ResourceLevelResponse,
  BuildingUpgradeRequest,
  BuildingUpgradeResponse,
  ResourceRoiRequest,
  ResourceRoiResponse,
  BattleSimulateRequest,
  BattleSimulateResponse,
  CropBalanceRequest,
  CropBalanceResponse,
  BuildingCategory,
  TroopTribe,
  TroopCategory,
  ResourceType,
} from '@/types/game'

// ============ 建築 API ============

export const buildingsApi = {
  // 取得所有建築列表
  getBuildings: async (params?: {
    category?: BuildingCategory
    search?: string
  }): Promise<BuildingListResponse> => {
    const response = await api.get('/buildings', { params })
    return response.data
  },

  // 取得單一建築詳情
  getBuilding: async (buildingId: string): Promise<BuildingDetail> => {
    const response = await api.get(`/buildings/${buildingId}`)
    return response.data
  },

  // 取得建築特定等級
  getBuildingLevel: async (
    buildingId: string,
    level: number
  ): Promise<BuildingDetail> => {
    const response = await api.get(`/buildings/${buildingId}/levels/${level}`)
    return response.data
  },

  // 計算升級成本
  getUpgradeCost: async (
    buildingId: string,
    fromLevel: number,
    toLevel: number
  ): Promise<{
    building_id: string
    from_level: number
    to_level: number
    cost: { wood: number; clay: number; iron: number; crop: number }
    total_cost: number
  }> => {
    const response = await api.get(`/buildings/${buildingId}/upgrade-cost`, {
      params: { from_level: fromLevel, to_level: toLevel },
    })
    return response.data
  },
}

// ============ 兵種 API ============

export const troopsApi = {
  // 取得所有兵種列表
  getTroops: async (params?: {
    tribe?: TroopTribe
    category?: TroopCategory
    search?: string
  }): Promise<TroopListResponse> => {
    const response = await api.get('/troops', { params })
    return response.data
  },

  // 取得特定種族兵種
  getTroopsByTribe: async (
    tribe: TroopTribe,
    category?: TroopCategory
  ): Promise<TroopListResponse> => {
    const response = await api.get(`/troops/${tribe}`, {
      params: category ? { category } : undefined,
    })
    return response.data
  },

  // 取得單一兵種詳情
  getTroop: async (tribe: TroopTribe, troopId: string): Promise<TroopDetail> => {
    const response = await api.get(`/troops/${tribe}/${troopId}`)
    return response.data
  },

  // 兵種比較
  compareTroops: async (troopIds: string[]): Promise<TroopCompareResponse> => {
    const response = await api.get('/troops/compare', {
      params: { troop_ids: troopIds.join(',') },
    })
    return response.data
  },
}

// ============ 資源田 API ============

export const resourcesApi = {
  // 取得所有資源田類型
  getResources: async (): Promise<ResourceFieldListResponse> => {
    const response = await api.get('/resources')
    return response.data
  },

  // 取得特定資源田詳情
  getResourceField: async (
    resourceType: ResourceType
  ): Promise<ResourceFieldDetail> => {
    const response = await api.get(`/resources/${resourceType}`)
    return response.data
  },

  // 取得資源田特定等級
  getResourceLevel: async (
    resourceType: ResourceType,
    level: number
  ): Promise<ResourceLevelResponse> => {
    const response = await api.get(`/resources/${resourceType}/levels/${level}`)
    return response.data
  },

  // 計算升級成本
  getUpgradeCost: async (
    resourceType: ResourceType,
    fromLevel: number,
    toLevel: number
  ): Promise<{
    resource_type: ResourceType
    from_level: number
    to_level: number
    cost: { wood: number; clay: number; iron: number; crop: number }
    total_cost: number
    total_build_time: number
    production_increase: number
  }> => {
    const response = await api.get(`/resources/${resourceType}/upgrade-cost`, {
      params: { from_level: fromLevel, to_level: toLevel },
    })
    return response.data
  },

  // 取得 ROI 數據
  getRoi: async (
    resourceType: ResourceType,
    maxLevel?: number
  ): Promise<
    Array<{
      from_level: number
      to_level: number
      roi_hours: number
      upgrade_cost: number
      production_increase: number
    }>
  > => {
    const response = await api.get(`/resources/${resourceType}/roi`, {
      params: maxLevel ? { max_level: maxLevel } : undefined,
    })
    return response.data
  },
}

// ============ 計算器 API ============

export const calculatorApi = {
  // 建築升級計算
  calculateBuildingUpgrade: async (
    request: BuildingUpgradeRequest
  ): Promise<BuildingUpgradeResponse> => {
    const response = await api.post('/calculator/building/upgrade', request)
    return response.data
  },

  // 資源田 ROI 計算
  calculateResourceRoi: async (
    request: ResourceRoiRequest
  ): Promise<ResourceRoiResponse> => {
    const response = await api.post('/calculator/resource/roi', request)
    return response.data
  },

  // 批量 ROI 計算
  calculateBatchRoi: async (
    resourceFields: Array<{ resource_type: string; current_level: number }>,
    oasisBonus?: Record<string, number>
  ): Promise<{
    results: ResourceRoiResponse[]
    recommended_order: string[]
  }> => {
    const response = await api.post('/calculator/resource/roi/batch', {
      resource_fields: resourceFields,
      oasis_bonus: oasisBonus || {},
    })
    return response.data
  },

  // 戰鬥模擬
  simulateBattle: async (
    request: BattleSimulateRequest
  ): Promise<BattleSimulateResponse> => {
    const response = await api.post('/calculator/battle/simulate', request)
    return response.data
  },

  // 糧食平衡計算
  calculateCropBalance: async (
    request: CropBalanceRequest
  ): Promise<CropBalanceResponse> => {
    const response = await api.post('/calculator/crop/balance', request)
    return response.data
  },
}

export default {
  buildings: buildingsApi,
  troops: troopsApi,
  resources: resourcesApi,
  calculator: calculatorApi,
}

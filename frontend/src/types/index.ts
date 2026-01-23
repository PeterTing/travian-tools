/**
 * 共用類型定義
 */

// API Response 類型
export interface ApiResponse<T> {
  data: T
  message?: string
}

// 分頁類型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 部落類型
export type TribeName = 'romans' | 'gauls' | 'teutons' | 'huns' | 'egyptians'

// 資源類型
export interface Resources {
  wood: number
  clay: number
  iron: number
  crop: number
}

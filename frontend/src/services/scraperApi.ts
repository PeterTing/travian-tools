/**
 * 即時資料抓取 API 服務
 *
 * 直接從 Travian 遊戲頁面抓取資料
 * 使用 nodriver (Chrome automation) 在 Docker 容器內執行
 */

import { api } from './api';

// ============ 類型定義 ============

export interface Coordinates {
  x: number;
  y: number;
}

export interface VillageListItem {
  village_id: string;
  name: string;
  coordinates: Coordinates;
  is_capital: boolean;
  has_attack: boolean;
}

export interface VillageListResponse {
  success: boolean;
  total: number;
  attacked_count: number;
  villages: VillageListItem[];
}

export interface ResourceProduction {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface Resources {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  free_crop: number;
  warehouse_capacity: number;
  granary_capacity: number;
  production: ResourceProduction;
}

export interface BuildingQueueItem {
  name: string;
  level: number;
  finish_time: string;
  countdown_seconds: number;
}

export interface TroopInfo {
  unit_id: number;
  name: string;
  count: number;
}

export interface TroopMovement {
  type: 'outgoing' | 'outgoing_attack' | 'outgoing_raid' | 'returning' | 'incoming_attack' | 'incoming_reinforcement' | 'reinforcing_others' | 'in_oasis' | 'unknown';
  description: string;
  arrival_time: string;
  countdown_seconds: number;
  troops: TroopInfo[];
}

export interface VillageDetail {
  village_id: string;
  name: string;
  coordinates: Coordinates;
  is_capital: boolean;
  has_incoming_attack: boolean;
  attack_count: number;
  resources: Resources;
  building_queue: BuildingQueueItem[];
  troops_home: TroopInfo[];
  troop_movements: TroopMovement[];
}

export interface VillageDetailResponse {
  success: boolean;
  village: VillageDetail;
}

export interface VillageSummary {
  village_id: string;
  name: string;
  resources: {
    wood: number;
    clay: number;
    iron: number;
    crop: number;
    warehouse_capacity: number;
    granary_capacity: number;
  };
  building_queue: Array<{
    name: string;
    level: number;
    countdown_seconds: number;
  }>;
  troops_home_count: number;
  troop_movements_count: number;
  attack_count: number;
}

export interface VillagesSummaryResponse {
  success: boolean;
  total_villages: number;
  attacked_villages: number;
  villages: VillageListItem[];
  first_village_detail: VillageSummary | null;
}

// ============ 同步 API 類型 ============

export interface SyncAllRequest {
  server_url: string;
  account_id?: string;
}

export interface SyncAllResponse {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
}

export interface SyncStatusResponse {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  total_villages: number;
  synced_villages: number;
  current_village: string | null;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface CompletionEvent {
  event_id: string;
  type: 'building' | 'troop_training';
  description: string;
  completion_time: string;
  is_processed: boolean;
}

export interface CachedVillage {
  village_id: string;
  travian_village_id: string;
  name: string;
  coordinates: Coordinates;
  is_capital: boolean;
  has_incoming_attack: boolean;
  attack_count: number;
  resources: {
    wood: number;
    clay: number;
    iron: number;
    crop: number;
  };
  production: {
    wood: number;
    clay: number;
    iron: number;
    crop: number;
  };
  warehouse_capacity: number;
  granary_capacity: number;
  last_updated: string | null;
  completion_events: CompletionEvent[];
}

export interface CachedDataResponse {
  success: boolean;
  last_synced: string | null;
  next_sync: string | null;
  villages: CachedVillage[];
}

// ============ API 函數 ============

/**
 * 即時取得村莊列表
 */
export async function getVillageList(serverUrl: string): Promise<VillageListResponse> {
  const response = await api.get<VillageListResponse>('/scraper/villages', {
    params: { server_url: serverUrl },
  });
  return response.data;
}

/**
 * 即時取得村莊詳情
 */
export async function getVillageDetail(
  serverUrl: string,
  villageId: string
): Promise<VillageDetailResponse> {
  const response = await api.get<VillageDetailResponse>(`/scraper/villages/${villageId}`, {
    params: { server_url: serverUrl },
  });
  return response.data;
}

/**
 * 即時取得所有村莊摘要
 */
export async function getVillagesSummary(serverUrl: string): Promise<VillagesSummaryResponse> {
  const response = await api.get<VillagesSummaryResponse>('/scraper/summary', {
    params: { server_url: serverUrl },
  });
  return response.data;
}

// ============ 同步 API 函數 ============

/**
 * 啟動背景同步所有村莊
 */
export async function syncAllVillages(request: SyncAllRequest): Promise<SyncAllResponse> {
  const response = await api.post<SyncAllResponse>('/scraper/sync-all', request);
  return response.data;
}

/**
 * 取得同步任務狀態
 */
export async function getSyncStatus(taskId: string): Promise<SyncStatusResponse> {
  const response = await api.get<SyncStatusResponse>(`/scraper/sync-status/${taskId}`);
  return response.data;
}

/**
 * 取得快取的村莊資料
 */
export async function getCachedData(serverUrl: string, accountId?: string): Promise<CachedDataResponse> {
  const response = await api.get<CachedDataResponse>('/scraper/cached-data', {
    params: { server_url: serverUrl, account_id: accountId },
  });
  return response.data;
}

// ============ 統計同步 API ============

export interface SyncStatsResponse {
  success: boolean;
  total_villages: number;
  message: string;
}

/**
 * 透過 sync-stats 端點同步村莊資料（較新的同步方式）
 * 如果端點不存在，呼叫方應 fallback 到 syncAllVillages
 */
export async function syncViaStatistics(serverUrl: string): Promise<SyncStatsResponse> {
  const response = await api.post<SyncStatsResponse>('/scraper/sync-stats', {
    server_url: serverUrl,
  });
  return response.data;
}

// ============ 輔助函數 ============

/**
 * 格式化倒數時間
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '已完成';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化資源數量
 */
export function formatResourceAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

/**
 * 計算資源百分比
 */
export function calculateResourcePercentage(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

/**
 * 取得部隊移動類型的顯示文字
 */
export function getMovementTypeLabel(type: TroopMovement['type']): string {
  const labels: Record<TroopMovement['type'], string> = {
    outgoing: '外出中',
    outgoing_attack: '攻擊中',
    outgoing_raid: '搶奪中',
    returning: '返回中',
    incoming_attack: '被攻擊',
    incoming_reinforcement: '支援來襲',
    reinforcing_others: '增援他村',
    in_oasis: '在綠洲',
    unknown: '移動中',
  };
  return labels[type] || type;
}

/**
 * 取得部隊移動類型的樣式類別
 */
export function getMovementTypeColor(type: TroopMovement['type']): string {
  const colors: Record<TroopMovement['type'], string> = {
    outgoing: 'text-blue-500',
    outgoing_attack: 'text-orange-500',
    outgoing_raid: 'text-yellow-500',
    returning: 'text-blue-500',
    incoming_attack: 'text-red-500',
    incoming_reinforcement: 'text-green-500',
    reinforcing_others: 'text-cyan-500',
    in_oasis: 'text-emerald-500',
    unknown: 'text-gray-500',
  };
  return colors[type] || 'text-gray-500';
}

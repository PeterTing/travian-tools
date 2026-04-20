/**
 * 動態資源計算 Hook
 *
 * 根據生產率動態計算資源量，每秒更新一次
 * 避免在同步之間顯示過時的資源數據
 */

import { useState, useEffect, useCallback } from 'react';

interface ResourceData {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

interface ProductionData {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

interface VillageResourceInfo {
  resources: ResourceData;
  production: ProductionData;
  warehouse_capacity: number;
  granary_capacity: number;
  last_updated: string | null;
}

interface DynamicResources {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  elapsedSeconds: number;
}

/**
 * 計算當前資源量
 *
 * @param baseResources - 上次同步的資源量
 * @param production - 每小時生產率
 * @param elapsedSeconds - 距離上次同步的秒數
 * @param warehouseCapacity - 倉庫容量
 * @param granaryCapacity - 穀倉容量
 */
function calculateCurrentResources(
  baseResources: ResourceData,
  production: ProductionData,
  elapsedSeconds: number,
  warehouseCapacity: number,
  granaryCapacity: number
): ResourceData {
  // 生產率是每小時，轉換為每秒
  const productionPerSecond = {
    wood: production.wood / 3600,
    clay: production.clay / 3600,
    iron: production.iron / 3600,
    crop: production.crop / 3600,
  };

  // 計算增加的資源量
  const produced = {
    wood: productionPerSecond.wood * elapsedSeconds,
    clay: productionPerSecond.clay * elapsedSeconds,
    iron: productionPerSecond.iron * elapsedSeconds,
    crop: productionPerSecond.crop * elapsedSeconds,
  };

  // 計算當前資源量，不超過容量上限，四捨五入到整數
  return {
    wood: Math.round(Math.min(
      Math.max(0, baseResources.wood + produced.wood),
      warehouseCapacity
    )),
    clay: Math.round(Math.min(
      Math.max(0, baseResources.clay + produced.clay),
      warehouseCapacity
    )),
    iron: Math.round(Math.min(
      Math.max(0, baseResources.iron + produced.iron),
      warehouseCapacity
    )),
    crop: Math.round(Math.min(
      Math.max(0, baseResources.crop + produced.crop),
      granaryCapacity
    )),
  };
}

/**
 * 動態資源計算 Hook
 *
 * @param village - 村莊資源資訊
 * @param updateInterval - 更新間隔（毫秒），預設 1000ms
 */
export function useDynamicResources(
  village: VillageResourceInfo | null,
  updateInterval: number = 1000
): DynamicResources | null {
  const [dynamicResources, setDynamicResources] = useState<DynamicResources | null>(null);

  const updateResources = useCallback(() => {
    if (!village || !village.last_updated) {
      setDynamicResources(null);
      return;
    }

    const lastUpdated = new Date(village.last_updated);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

    // 避免負數（可能因為時區問題）
    const safeElapsedSeconds = Math.max(0, elapsedSeconds);

    const currentResources = calculateCurrentResources(
      village.resources,
      village.production,
      safeElapsedSeconds,
      village.warehouse_capacity,
      village.granary_capacity
    );

    setDynamicResources({
      ...currentResources,
      elapsedSeconds: safeElapsedSeconds,
    });
  }, [village]);

  // 初始計算
  useEffect(() => {
    updateResources();
  }, [updateResources]);

  // 定時更新
  useEffect(() => {
    if (!village || !village.last_updated) {
      return;
    }

    const timer = setInterval(updateResources, updateInterval);

    return () => clearInterval(timer);
  }, [village, updateInterval, updateResources]);

  return dynamicResources;
}

/**
 * 格式化經過時間
 * @param seconds - 經過的秒數
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒前`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}分鐘前`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}小時${remainingMinutes}分鐘前`
      : `${hours}小時前`;
  }

  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

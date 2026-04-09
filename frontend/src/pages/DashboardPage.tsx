/**
 * 村莊管理儀表板頁面
 *
 * 顯示所有村莊的資源、建築佇列、部隊狀態和攻擊警報
 * 支援背景同步和快取資料
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Building2, RefreshCw, Sword, Wheat, Loader2, Clock, CheckCircle2, UserPlus } from 'lucide-react';
import { useDynamicResources, formatElapsedTime } from '@/hooks/useDynamicResources';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getVillageDetail,
  VillageDetail,
  formatCountdown,
  formatResourceAmount,
  calculateResourcePercentage,
  getMovementTypeLabel,
  getMovementTypeColor,
  // 同步 API
  syncAllVillages,
  getSyncStatus,
  getCachedData,
  CachedVillage,
  SyncStatusResponse,
} from '@/services/scraperApi';

// 預設伺服器 URL（之後可以從設定中讀取）
const DEFAULT_SERVER_URL = 'https://nys.x1.asia.travian.com';

// 同步輪詢間隔（毫秒）
const SYNC_POLL_INTERVAL = 2000;

export default function DashboardPage() {
  const [serverUrl] = useState(DEFAULT_SERVER_URL);
  const [villages, setVillages] = useState<CachedVillage[]>([]);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [selectedVillageDetail, setSelectedVillageDetail] = useState<VillageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [nextSync, setNextSync] = useState<string | null>(null);

  // 同步狀態
  const [syncTaskId, setSyncTaskId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 取得選中的村莊（從快取資料）
  const selectedVillage = villages.find((v) => v.village_id === selectedVillageId);

  // 將選中的村莊轉換為動態資源計算所需的格式
  const selectedVillageForDynamic = useMemo(() => {
    if (!selectedVillage) return null;
    return {
      resources: selectedVillage.resources,
      production: selectedVillage.production,
      warehouse_capacity: selectedVillage.warehouse_capacity,
      granary_capacity: selectedVillage.granary_capacity,
      last_updated: selectedVillage.last_updated,
    };
  }, [selectedVillage]);

  // 使用動態資源計算
  const dynamicResources = useDynamicResources(selectedVillageForDynamic);

  // 切換村莊時清除部隊詳情，強制重新載入
  useEffect(() => {
    setSelectedVillageDetail(null);
  }, [selectedVillageId]);

  // 啟動同步（或恢復進行中的同步）
  const startSync = useCallback(async (isInitialCheck = false) => {
    if (isSyncing && !isInitialCheck) return;

    try {
      const response = await syncAllVillages({ server_url: serverUrl });
      setSyncTaskId(response.task_id);

      // 如果是進行中的任務，立即取得最新狀態
      if (response.status === 'in_progress') {
        setIsSyncing(true);
        // 立即輪詢一次取得最新進度
        const status = await getSyncStatus(response.task_id);
        setSyncStatus(status);
      } else {
        // 新任務
        setIsSyncing(true);
        setError(null);
        setSyncStatus({
          task_id: response.task_id,
          status: 'pending',
          total_villages: 0,
          synced_villages: 0,
          current_village: null,
          progress_percent: 0,
          started_at: null,
          completed_at: null,
          error_message: null,
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setNoAccount(true);
      } else if (!isInitialCheck) {
        setError(err instanceof Error ? err.message : '啟動同步失敗');
      }
      setIsSyncing(false);
    }
  }, [serverUrl, isSyncing]);

  // 載入快取資料
  const loadCachedData = useCallback(async (autoSync = true) => {
    setLoading(true);
    setError(null);
    setNoAccount(false);
    try {
      const response = await getCachedData(serverUrl);
      setVillages(response.villages);
      setLastSynced(response.last_synced);
      setNextSync(response.next_sync);

      // 自動選擇第一個村莊
      if (response.villages.length > 0 && !selectedVillageId) {
        setSelectedVillageId(response.villages[0].village_id);
      }
    } catch (err: unknown) {
      // 檢查是否為「找不到遊戲帳號」(404)
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        setNoAccount(true);
        return;
      }
      // 如果沒有快取資料，自動啟動同步
      if (autoSync) {
        startSync();
      } else {
        setError(err instanceof Error ? err.message : '載入資料失敗');
      }
    } finally {
      setLoading(false);
    }
  }, [serverUrl, selectedVillageId, startSync]);

  // 輪詢同步狀態
  const pollSyncStatus = useCallback(async () => {
    if (!syncTaskId) return;

    try {
      const status = await getSyncStatus(syncTaskId);
      setSyncStatus(status);

      if (status.status === 'completed') {
        // 同步完成，載入快取資料
        setIsSyncing(false);
        setSyncTaskId(null);
        await loadCachedData(false);
      } else if (status.status === 'failed') {
        // 同步失敗
        setError(status.error_message || '同步失敗');
        setIsSyncing(false);
        setSyncTaskId(null);
      }
    } catch (err) {
      console.error('取得同步狀態失敗:', err);
    }
  }, [syncTaskId, loadCachedData]);

  // 載入村莊詳情（即時抓取，用於部隊等動態資料）
  const loadVillageDetail = useCallback(async (travianVillageId: string) => {
    setDetailLoading(true);
    try {
      const response = await getVillageDetail(serverUrl, travianVillageId);
      setSelectedVillageDetail(response.village);
    } catch (err) {
      console.error('載入村莊詳情失敗:', err);
      setSelectedVillageDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, [serverUrl]);

  // 初始載入：只載入快取資料，不自動啟動同步
  // 後端 ARQ worker 會自動每 10 分鐘同步一次
  // 用戶可以點擊「重新同步」按鈕手動觸發同步
  useEffect(() => {
    const initializeData = async () => {
      // 只載入快取資料，不自動啟動同步
      await loadCachedData(false);
    };
    initializeData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 設定同步輪詢
  useEffect(() => {
    if (syncTaskId && isSyncing) {
      pollIntervalRef.current = setInterval(pollSyncStatus, SYNC_POLL_INTERVAL);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [syncTaskId, isSyncing, pollSyncStatus]);

  // 計算被攻擊的村莊數量
  const attackedCount = villages.filter((v) => v.has_incoming_attack).length;

  // 格式化時間
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return null;
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString();
    } catch {
      return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 標題和重新整理按鈕 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">村莊儀表板</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {lastSynced && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                上次同步: {formatSyncTime(lastSynced)}
              </span>
            )}
            {nextSync && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                下次同步: {formatSyncTime(nextSync)}
              </span>
            )}
          </div>
        </div>
        <Button onClick={() => startSync()} disabled={isSyncing || loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? '同步中...' : '重新同步'}
        </Button>
      </div>

      {/* 同步進度 */}
      {isSyncing && syncStatus && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                正在同步: {syncStatus.current_village || '準備中...'}
              </span>
              <span className="text-sm text-muted-foreground">
                {syncStatus.synced_villages} / {syncStatus.total_villages} 村莊
              </span>
            </div>
            <Progress value={syncStatus.progress_percent} />
          </CardContent>
        </Card>
      )}

      {/* 未建立遊戲帳號提示 */}
      {noAccount && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">尚未建立遊戲帳號</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              要使用儀表板，請先建立一個遊戲帳號並設定你的 Travian 伺服器網址。
              建立帳號後即可同步村莊資料。
            </p>
            <Link to="/game-accounts">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                前往建立遊戲帳號
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* 錯誤提示 */}
      {error && !noAccount && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>錯誤</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 攻擊警報 */}
      {attackedCount > 0 && (
        <Alert variant="destructive">
          <Sword className="h-4 w-4" />
          <AlertTitle>攻擊警報!</AlertTitle>
          <AlertDescription>
            有 {attackedCount} 個村莊正在被攻擊！
            {villages
              .filter((v) => v.has_incoming_attack)
              .map((v) => (
                <Badge key={v.village_id} variant="destructive" className="ml-2">
                  {v.name}
                </Badge>
              ))}
          </AlertDescription>
        </Alert>
      )}

      {/* 載入中 */}
      {loading && !villages.length && !isSyncing && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">載入資料中...</span>
        </div>
      )}

      {/* 主要內容 */}
      {villages.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 村莊列表側邊欄 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>村莊列表</CardTitle>
              <CardDescription>共 {villages.length} 個村莊</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {villages.map((village) => (
                <Button
                  key={village.village_id}
                  variant={selectedVillageId === village.village_id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedVillageId(village.village_id)}
                >
                  {village.has_incoming_attack && (
                    <Sword className="mr-2 h-4 w-4 text-red-500" />
                  )}
                  {village.is_capital && (
                    <span className="mr-2">👑</span>
                  )}
                  <span className="truncate">{village.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ({village.coordinates.x}|{village.coordinates.y})
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* 村莊詳情 */}
          <div className="lg:col-span-3 space-y-6">
            {selectedVillage ? (
              <>
                {/* 村莊標題 */}
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{selectedVillage.name}</h2>
                  {selectedVillage.is_capital && <Badge>主城</Badge>}
                  {selectedVillage.has_incoming_attack && (
                    <Badge variant="destructive">
                      <Sword className="mr-1 h-3 w-3" />
                      {selectedVillage.attack_count} 波攻擊
                    </Badge>
                  )}
                  <span className="text-muted-foreground">
                    ({selectedVillage.coordinates.x}|{selectedVillage.coordinates.y})
                  </span>
                  {selectedVillage.last_updated && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      更新於 {formatSyncTime(selectedVillage.last_updated)}
                    </span>
                  )}
                </div>

                <Tabs
                  defaultValue="resources"
                  onValueChange={(value) => {
                    // 切換到部隊 tab 時自動載入
                    if (value === 'troops' && selectedVillage.travian_village_id && !selectedVillageDetail && !detailLoading) {
                      loadVillageDetail(selectedVillage.travian_village_id);
                    }
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="resources">
                      <Wheat className="mr-2 h-4 w-4" />
                      資源
                    </TabsTrigger>
                    <TabsTrigger value="buildings">
                      <Building2 className="mr-2 h-4 w-4" />
                      建築佇列
                    </TabsTrigger>
                    <TabsTrigger value="troops">
                      <Sword className="mr-2 h-4 w-4" />
                      部隊
                    </TabsTrigger>
                  </TabsList>

                  {/* 資源分頁 */}
                  <TabsContent value="resources" className="space-y-4">
                    {/* 動態資源更新提示 */}
                    {dynamicResources && (
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>資源即時計算中</span>
                        <span className="text-primary">
                          (更新於 {formatElapsedTime(dynamicResources.elapsedSeconds)})
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ResourceCard
                        name="木材"
                        icon="🪵"
                        current={dynamicResources?.wood ?? selectedVillage.resources.wood}
                        max={selectedVillage.warehouse_capacity}
                        production={selectedVillage.production.wood}
                      />
                      <ResourceCard
                        name="磚塊"
                        icon="🧱"
                        current={dynamicResources?.clay ?? selectedVillage.resources.clay}
                        max={selectedVillage.warehouse_capacity}
                        production={selectedVillage.production.clay}
                      />
                      <ResourceCard
                        name="鐵礦"
                        icon="⚙️"
                        current={dynamicResources?.iron ?? selectedVillage.resources.iron}
                        max={selectedVillage.warehouse_capacity}
                        production={selectedVillage.production.iron}
                      />
                      <ResourceCard
                        name="糧食"
                        icon="🌾"
                        current={dynamicResources?.crop ?? selectedVillage.resources.crop}
                        max={selectedVillage.granary_capacity}
                        production={selectedVillage.production.crop}
                        isCrop
                      />
                    </div>

                    {/* 倉庫/穀倉容量 */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">倉庫容量</div>
                          <div className="text-xl font-bold">
                            {formatResourceAmount(selectedVillage.warehouse_capacity)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">穀倉容量</div>
                          <div className="text-xl font-bold">
                            {formatResourceAmount(selectedVillage.granary_capacity)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* 建築佇列分頁 */}
                  <TabsContent value="buildings" className="space-y-4">
                    {selectedVillage.completion_events.length > 0 ? (
                      <div className="space-y-2">
                        {selectedVillage.completion_events
                          .filter((e) => e.type === 'building')
                          .map((event) => (
                            <Card key={event.event_id}>
                              <CardContent className="flex items-center justify-between py-3">
                                <div>
                                  <div className="font-medium">{event.description}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">
                                    完成於 {new Date(event.completion_time).toLocaleString()}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        沒有正在建造的建築
                      </div>
                    )}
                  </TabsContent>

                  {/* 部隊分頁 */}
                  <TabsContent value="troops" className="space-y-4">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">載入部隊資訊...</span>
                      </div>
                    ) : selectedVillageDetail ? (
                      <>
                        {/* 駐守部隊 */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">駐守部隊</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {selectedVillageDetail.troops_home.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedVillageDetail.troops_home.map((troop, index) => (
                                  <Badge key={index} variant="secondary">
                                    {troop.name}: {troop.count}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">沒有駐守部隊</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* 部隊移動 */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">部隊移動</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {selectedVillageDetail.troop_movements.length > 0 ? (
                              <div className="space-y-3">
                                {selectedVillageDetail.troop_movements.map((movement, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 border rounded-lg"
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={getMovementTypeColor(movement.type)}>
                                          {getMovementTypeLabel(movement.type)}
                                        </span>
                                        <span className="text-sm">{movement.description}</span>
                                      </div>
                                      {movement.troops.length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                          {movement.troops.map((t, i) => (
                                            <Badge key={i} variant="outline" className="text-xs">
                                              {t.name}: {t.count}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono">
                                        {formatCountdown(movement.countdown_seconds)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {movement.arrival_time}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">沒有部隊移動</div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (selectedVillage.travian_village_id) {
                              loadVillageDetail(selectedVillage.travian_village_id);
                            }
                          }}
                        >
                          載入部隊資訊
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                選擇一個村莊查看詳情
              </div>
            )}
          </div>
        </div>
      )}

      {/* 沒有資料且不在同步中（有帳號但還沒同步過） */}
      {villages.length === 0 && !isSyncing && !loading && !noAccount && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">尚無村莊資料</p>
          <Button onClick={() => startSync()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            開始同步
          </Button>
        </div>
      )}
    </div>
  );
}

// 資源卡片元件
function ResourceCard({
  name,
  icon,
  current,
  max,
  production,
  isCrop = false,
}: {
  name: string;
  icon: string;
  current: number;
  max: number;
  production: number;
  isCrop?: boolean;
}) {
  const percentage = calculateResourcePercentage(current, max);
  const isOverflow = percentage >= 95;
  const isLowCrop = isCrop && production < 0;

  return (
    <Card className={isOverflow ? 'border-yellow-500' : isLowCrop ? 'border-red-500' : ''}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <span className="text-sm text-muted-foreground">{name}</span>
        </div>
        <div className="text-xl font-bold">{formatResourceAmount(current)}</div>
        <Progress value={percentage} className="my-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className={production >= 0 ? 'text-green-500' : 'text-red-500'}>
            {production >= 0 ? '+' : ''}{production}/h
          </span>
          <span>{percentage}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 村莊管理頁面（統一儀表板）
 *
 * 取代舊的 VillagesPage 和 DashboardPage，
 * 以表格形式顯示所有村莊的資源、部隊、文化點等資訊
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  RefreshCw,
  Sword,
  Loader2,
  Clock,
  CheckCircle2,
  UserPlus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  syncAllVillages,
  getSyncStatus,
  getCachedData,
  type CachedVillage,
  type SyncStatusResponse,
} from '@/services/scraperApi'
import { syncViaStatistics } from '@/services/scraperApi'

const DEFAULT_SERVER_URL = 'https://nys.x1.asia.travian.com'
const SYNC_POLL_INTERVAL = 2000

export default function VillagesPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL)
  const [inputUrl, setInputUrl] = useState(DEFAULT_SERVER_URL)
  const [villages, setVillages] = useState<CachedVillage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noAccount, setNoAccount] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [nextSync, setNextSync] = useState<string | null>(null)

  // Sync state
  const [syncTaskId, setSyncTaskId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return null
    try {
      return new Date(isoString).toLocaleTimeString()
    } catch {
      return null
    }
  }

  // Try sync-stats first, fall back to sync-all
  const startSync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    setError(null)

    // Attempt the new sync-stats endpoint first
    try {
      const result = await syncViaStatistics(serverUrl)
      // sync-stats is a synchronous operation; on success, just reload cached data
      if (result.success) {
        setIsSyncing(false)
        loadCachedData(false)
        return
      }
    } catch {
      // sync-stats not available, fall through to sync-all
    }

    // Fall back to sync-all (async task-based)
    try {
      const response = await syncAllVillages({ server_url: serverUrl })
      setSyncTaskId(response.task_id)

      if (response.status === 'in_progress') {
        const status = await getSyncStatus(response.task_id)
        setSyncStatus(status)
      } else {
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
        })
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { detail?: string } }
      }
      if (axiosErr?.response?.status === 404) {
        setNoAccount(true)
      } else if (axiosErr?.response?.status === 503) {
        setError('同步服務尚未啟動。請確認 Redis 和 ARQ Worker 正在運行。')
      } else {
        const detail = axiosErr?.response?.data?.detail
        setError(
          detail || (err instanceof Error ? err.message : '啟動同步失敗')
        )
      }
      setIsSyncing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl, isSyncing])

  // Load cached data
  const loadCachedData = useCallback(
    async (autoSync: boolean) => {
      setLoading(true)
      setError(null)
      setNoAccount(false)
      try {
        const response = await getCachedData(serverUrl)
        setVillages(response.villages)
        setLastSynced(response.last_synced)
        setNextSync(response.next_sync)
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } }
        if (axiosErr?.response?.status === 404) {
          setNoAccount(true)
          return
        }
        if (autoSync) {
          startSync()
        } else {
          setError(err instanceof Error ? err.message : '載入資料失敗')
        }
      } finally {
        setLoading(false)
      }
    },
    [serverUrl, startSync]
  )

  // Poll sync status
  const pollSyncStatus = useCallback(async () => {
    if (!syncTaskId) return

    try {
      const status = await getSyncStatus(syncTaskId)
      setSyncStatus(status)

      if (status.status === 'completed') {
        setIsSyncing(false)
        setSyncTaskId(null)
        await loadCachedData(false)
      } else if (status.status === 'failed') {
        setError(status.error_message || '同步失敗')
        setIsSyncing(false)
        setSyncTaskId(null)
      }
    } catch (err) {
      console.error('取得同步狀態失敗:', err)
    }
  }, [syncTaskId, loadCachedData])

  // Initial load
  useEffect(() => {
    loadCachedData(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl])

  // Set up sync polling
  useEffect(() => {
    if (syncTaskId && isSyncing) {
      pollIntervalRef.current = setInterval(pollSyncStatus, SYNC_POLL_INTERVAL)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [syncTaskId, isSyncing, pollSyncStatus])

  const handleSearch = () => {
    setServerUrl(inputUrl)
  }

  const attackedVillages = villages.filter((v) => v.has_incoming_attack)
  const attackedCount = attackedVillages.length

  // Compute total troops per village from cached data (sum based on available info)
  const getTotalTroopCount = (_village: CachedVillage): string => {
    // CachedVillage doesn't have troop data in the overview, show '-'
    // The troop count would come from a detail view
    return '-'
  }

  // Compute culture points per day — not available in cached data
  const getCulturePointsPerDay = (_village: CachedVillage): string => {
    return '-'
  }

  // Format merchant info — not available in cached data
  const getMerchantInfo = (_village: CachedVillage): string => {
    return '-'
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">村莊管理</h1>
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

      {/* Server URL input + sync button */}
      <div className="flex gap-2">
        <Input
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="伺服器 URL"
          className="max-w-lg"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} variant="outline">
          查詢
        </Button>
        <Button onClick={() => startSync()} disabled={isSyncing || loading}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
          />
          {isSyncing ? '同步中...' : '同步'}
        </Button>
      </div>

      {/* Sync progress */}
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

      {/* No account state */}
      {noAccount && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">尚未建立遊戲帳號</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              要使用村莊管理，請先建立一個遊戲帳號並設定你的 Travian
              伺服器網址。建立帳號後即可同步村莊資料。
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

      {/* Error */}
      {error && !noAccount && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>錯誤</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Attack alert */}
      {attackedCount > 0 && (
        <Alert variant="destructive">
          <Sword className="h-4 w-4" />
          <AlertTitle>攻擊警報!</AlertTitle>
          <AlertDescription>
            {attackedCount} 個村莊正在被攻擊！
            {attackedVillages.map((v) => (
              <Badge key={v.village_id} variant="destructive" className="ml-2">
                {v.name}
              </Badge>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading */}
      {loading && villages.length === 0 && !isSyncing && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">載入資料中...</span>
        </div>
      )}

      {/* Village table */}
      {villages.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">名稱</TableHead>
                  <TableHead className="w-[100px]">座標</TableHead>
                  <TableHead>資源 (木/磚/鐵/糧)</TableHead>
                  <TableHead className="w-[80px] text-right">倉庫</TableHead>
                  <TableHead className="w-[80px] text-right">穀倉</TableHead>
                  <TableHead className="w-[80px] text-right">部隊總數</TableHead>
                  <TableHead className="w-[80px] text-right">文化點/日</TableHead>
                  <TableHead className="w-[80px] text-right">商人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {villages.map((village) => (
                  <TableRow key={village.village_id}>
                    {/* Name */}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {village.has_incoming_attack && (
                          <Sword className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        {village.is_capital && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1 flex-shrink-0"
                          >
                            主城
                          </Badge>
                        )}
                        <span className="truncate">{village.name}</span>
                      </div>
                    </TableCell>

                    {/* Coordinates */}
                    <TableCell className="text-muted-foreground">
                      ({village.coordinates.x},{village.coordinates.y})
                    </TableCell>

                    {/* Resources */}
                    <TableCell>
                      <div className="flex gap-3 text-sm tabular-nums">
                        <span>{village.resources.wood.toLocaleString()}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{village.resources.clay.toLocaleString()}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{village.resources.iron.toLocaleString()}</span>
                        <span className="text-muted-foreground">/</span>
                        <span>{village.resources.crop.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                        <span
                          className={
                            village.production.wood >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {village.production.wood >= 0 ? '+' : ''}
                          {village.production.wood.toLocaleString()}/h
                        </span>
                        <span
                          className={
                            village.production.clay >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {village.production.clay >= 0 ? '+' : ''}
                          {village.production.clay.toLocaleString()}/h
                        </span>
                        <span
                          className={
                            village.production.iron >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {village.production.iron >= 0 ? '+' : ''}
                          {village.production.iron.toLocaleString()}/h
                        </span>
                        <span
                          className={
                            village.production.crop >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {village.production.crop >= 0 ? '+' : ''}
                          {village.production.crop.toLocaleString()}/h
                        </span>
                      </div>
                    </TableCell>

                    {/* Warehouse */}
                    <TableCell className="text-right tabular-nums">
                      {village.warehouse_capacity.toLocaleString()}
                    </TableCell>

                    {/* Granary */}
                    <TableCell className="text-right tabular-nums">
                      {village.granary_capacity.toLocaleString()}
                    </TableCell>

                    {/* Troops */}
                    <TableCell className="text-right tabular-nums">
                      {getTotalTroopCount(village)}
                    </TableCell>

                    {/* Culture points */}
                    <TableCell className="text-right tabular-nums">
                      {getCulturePointsPerDay(village)}
                    </TableCell>

                    {/* Merchants */}
                    <TableCell className="text-right tabular-nums">
                      {getMerchantInfo(village)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No data and not syncing */}
      {villages.length === 0 && !isSyncing && !loading && !noAccount && !error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">尚無村莊資料</p>
          <Button onClick={() => startSync()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            開始同步
          </Button>
        </div>
      )}
    </div>
  )
}

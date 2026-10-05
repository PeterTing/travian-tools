import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { villageApi } from '@/services/villageApi'
import { syncApi, type SyncLog, type SyncStats } from '@/services/syncApi'
import type { VillageDetail } from '@/types/game'
import VillageForm from './VillageForm'

export default function VillageDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { villageId } = useParams<{ villageId: string }>()

  const [village, setVillage] = useState<VillageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<SyncLog | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)
  // 編輯、刪除從列表移到這裡（列表照線框只放名稱、座標、人口、糧）
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { reload: reloadAccounts } = useCurrentAccount()

  const loadVillage = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await villageApi.getById(id)
      setVillage(data)

      // 載入同步狀態
      try {
        const [lastSyncData, statsData] = await Promise.all([
          syncApi.getLastSync({ village_id: id }),
          syncApi.getStats(data.account_id),
        ])
        setLastSync(lastSyncData)
        setSyncStats(statsData)
      } catch {
        // 同步狀態載入失敗不影響主要功能
      }
    } catch {
      setError(t('villages.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  const handleRefreshSync = async () => {
    if (!villageId) return
    setSyncLoading(true)
    try {
      const [lastSyncData, statsData] = await Promise.all([
        syncApi.getLastSync({ village_id: villageId }),
        village ? syncApi.getStats(village.account_id) : Promise.resolve(null),
      ])
      setLastSync(lastSyncData)
      if (statsData) setSyncStats(statsData)
    } finally {
      setSyncLoading(false)
    }
  }

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('sync.statusSuccess')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('sync.statusFailed')}</Badge>
      case 'in_progress':
        return <Badge variant="secondary">{t('sync.statusInProgress')}</Badge>
      default:
        return <Badge variant="outline">{t('sync.statusPending')}</Badge>
    }
  }

  useEffect(() => {
    if (villageId) {
      loadVillage(villageId)
    }
  }, [villageId, loadVillage])

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case 'capital':
        return 'bg-yellow-100 text-yellow-800'
      case 'hammer':
        return 'bg-red-100 text-red-800'
      case 'anvil':
        return 'bg-blue-100 text-blue-800'
      case 'resource':
        return 'bg-green-100 text-green-800'
      case 'ww':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDelete = async () => {
    if (!village) return
    try {
      await villageApi.delete(village.village_id)
      // 頂部切換清單裡的「N 村」也要跟著變
      void reloadAccounts()
      navigate('/villages')
    } catch (deleteError) {
      console.error('Failed to delete village:', deleteError)
    } finally {
      setConfirmDelete(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !village) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-destructive mb-4">{error || t('villages.notFound')}</p>
            <Button onClick={() => navigate('/villages')}>
              {t('villages.backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <VillageForm
          accountId={village.account_id}
          village={village}
          onSuccess={() => {
            setEditing(false)
            void loadVillage(village.village_id)
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {village.name || t('villages.unnamed')}
          </h1>
          <p className="text-muted-foreground">
            ({village.coordinate_x ?? '?'}, {village.coordinate_y ?? '?'})
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/villages')}>
            {t('villages.backToList')}
          </Button>
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t('villages.edit')}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            {t('villages.delete')}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('villages.deleteVillage')}</AlertDialogTitle>
            <AlertDialogDescription>{t('villages.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('villages.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('villages.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 同步狀態 */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{t('sync.title')}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSync}
            disabled={syncLoading}
          >
            {syncLoading ? t('common.loading') : t('sync.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold">{syncStats?.total_syncs ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t('sync.totalSyncs')}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold text-green-600">{syncStats?.successful_syncs ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t('sync.successfulSyncs')}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold text-red-600">{syncStats?.failed_syncs ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t('sync.failedSyncs')}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xl font-bold">{syncStats?.items_synced_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">{t('sync.itemsToday')}</p>
            </div>
          </div>
          {lastSync && (
            <div className="mt-4 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('sync.lastSync')}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(lastSync.started_at).toLocaleString()}
                  </p>
                </div>
                {getSyncStatusBadge(lastSync.status)}
              </div>
              {lastSync.message && (
                <p className="text-xs text-muted-foreground mt-2">{lastSync.message}</p>
              )}
              {lastSync.error_details && (
                <p className="text-xs text-destructive mt-2">{lastSync.error_details}</p>
              )}
            </div>
          )}
          {!lastSync && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {t('sync.noSyncYet')}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基本資訊 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('villages.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('villages.population')}:</span>
                <span className="font-medium">{village.population}</span>
              </div>
              {village.village_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('villages.type')}:</span>
                  <span className="font-medium">{village.village_type}</span>
                </div>
              )}
              {village.role && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('villages.role')}:</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${getRoleBadgeColor(village.role)}`}>
                    {t(`villages.roles.${village.role}`)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('villages.isCapital')}:</span>
                <span className="font-medium">
                  {village.is_capital ? t('common.yes') : t('common.no')}
                </span>
              </div>
              {village.last_updated && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('villages.lastUpdated')}:</span>
                  <span className="font-medium">
                    {new Date(village.last_updated).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 統計摘要 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('villages.summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{village.buildings.length}</p>
                <p className="text-sm text-muted-foreground">{t('villages.buildings')}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{village.troops.length}</p>
                <p className="text-sm text-muted-foreground">{t('villages.troopTypes')}</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg col-span-2">
                <p className="text-2xl font-bold">
                  {village.troops.reduce((sum, t) => sum + t.count, 0)}
                </p>
                <p className="text-sm text-muted-foreground">{t('villages.totalTroops')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 建築列表 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('villages.buildings')}</CardTitle>
          <CardDescription>{t('villages.buildingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {village.buildings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('villages.noBuildings')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('villages.position')}</TableHead>
                  <TableHead>{t('villages.buildingId')}</TableHead>
                  <TableHead>{t('villages.level')}</TableHead>
                  <TableHead>{t('villages.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {village.buildings
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map((building) => (
                    <TableRow key={building.instance_id}>
                      <TableCell>{building.position ?? '-'}</TableCell>
                      <TableCell>{t(`buildingNames.${building.building_id}`, { defaultValue: building.building_id })}</TableCell>
                      <TableCell>{building.current_level}</TableCell>
                      <TableCell>
                        {building.is_upgrading ? (
                          <span className="text-orange-600">{t('villages.upgrading')}</span>
                        ) : (
                          <span className="text-green-600">{t('villages.ready')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 村莊內部隊 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('villages.troopsInVillage')}</CardTitle>
          <CardDescription>{t('villages.troopsInVillageDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {village.troops.filter(t => t.location === 'home').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('villages.noTroopsInVillage')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('villages.troopId')}</TableHead>
                  <TableHead>{t('villages.count')}</TableHead>
                  <TableHead>{t('villages.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {village.troops
                  .filter(troop => troop.location === 'home')
                  .map((troop) => (
                    <TableRow key={troop.instance_id}>
                      <TableCell>{t(`troopNames.${troop.troop_id}`, { defaultValue: troop.troop_id })}</TableCell>
                      <TableCell>{troop.count}</TableCell>
                      <TableCell>
                        {troop.is_training ? (
                          <span className="text-orange-600">{t('villages.training')}</span>
                        ) : (
                          <span className="text-green-600">{t('villages.ready')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 全部部隊（含外派） */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('villages.totalTroopsTitle')}</CardTitle>
          <CardDescription>{t('villages.totalTroopsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {village.troops.filter(t => t.location === 'total').length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('villages.noTotalTroops')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('villages.troopId')}</TableHead>
                  <TableHead>{t('villages.count')}</TableHead>
                  <TableHead>{t('villages.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {village.troops
                  .filter(troop => troop.location === 'total')
                  .map((troop) => (
                    <TableRow key={troop.instance_id}>
                      <TableCell>{t(`troopNames.${troop.troop_id}`, { defaultValue: troop.troop_id })}</TableCell>
                      <TableCell>{troop.count}</TableCell>
                      <TableCell>
                        {troop.is_training ? (
                          <span className="text-orange-600">{t('villages.training')}</span>
                        ) : (
                          <span className="text-green-600">{t('villages.ready')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

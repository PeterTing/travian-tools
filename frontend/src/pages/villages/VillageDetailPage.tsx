import { useState, useEffect } from 'react'
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
import { useAuth } from '@/contexts/AuthContext'
import { villageApi } from '@/services/villageApi'
import type { VillageDetail } from '@/types/game'

export default function VillageDetailPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { villageId } = useParams<{ villageId: string }>()

  const [village, setVillage] = useState<VillageDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login')
      return
    }
    if (villageId) {
      loadVillage(villageId)
    }
  }, [isAuthenticated, navigate, villageId])

  const loadVillage = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await villageApi.getById(id)
      setVillage(data)
    } catch (err) {
      setError(t('villages.loadError'))
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {village.name || t('villages.unnamed')}
          </h1>
          <p className="text-muted-foreground">
            ({village.coordinate_x ?? '?'}, {village.coordinate_y ?? '?'})
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/villages')}>
          {t('villages.backToList')}
        </Button>
      </div>

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
                      <TableCell>{building.building_id}</TableCell>
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

      {/* 部隊列表 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('villages.troops')}</CardTitle>
          <CardDescription>{t('villages.troopsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {village.troops.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('villages.noTroops')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('villages.troopId')}</TableHead>
                  <TableHead>{t('villages.count')}</TableHead>
                  <TableHead>{t('villages.location')}</TableHead>
                  <TableHead>{t('villages.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {village.troops.map((troop) => (
                  <TableRow key={troop.instance_id}>
                    <TableCell>{troop.troop_id}</TableCell>
                    <TableCell>{troop.count}</TableCell>
                    <TableCell>{troop.location}</TableCell>
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

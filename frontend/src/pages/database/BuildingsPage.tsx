import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { buildingsApi } from '@/services/gameApi'
import type { BuildingListItem, BuildingDetail, BuildingCategory } from '@/types/game'
import BuildingVerifyMark, { BuildingVerifyLegend } from '@/components/common/BuildingVerifyMark'
import { buildingRowLabel } from '@/lib/buildingVerify'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { isBuildingEffectVerified } from '@/data/gameData'

const CATEGORY_VALUES: (BuildingCategory | 'all')[] = [
  'all',
  'infrastructure',
  'military',
  'resource',
  'defense',
  'special',
]

export default function BuildingsPage() {
  const { t, i18n } = useTranslation()
  const [allBuildings, setAllBuildings] = useState<BuildingListItem[]>([])
  const [buildings, setBuildings] = useState<BuildingListItem[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<BuildingCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  const isZh = i18n.language.startsWith('zh')

  // 初始載入所有建築（用於前置需求名稱查詢）
  useEffect(() => {
    const fetchAllBuildings = async () => {
      try {
        const response = await buildingsApi.getBuildings({})
        setAllBuildings(response.buildings)
      } catch {
        // 忽略錯誤，前置需求會顯示 ID
      }
    }
    fetchAllBuildings()
  }, [])

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setLoading(true)
        setError(null)
        const params: { category?: BuildingCategory; search?: string } = {}
        if (category !== 'all') params.category = category
        if (search) params.search = search
        const response = await buildingsApi.getBuildings(params)
        setBuildings(response.buildings)
      } catch {
        setError('Failed to load buildings')
      } finally {
        setLoading(false)
      }
    }

    fetchBuildings()
  }, [category, search])

  const handleSelectBuilding = async (buildingId: string) => {
    try {
      const detail = await buildingsApi.getBuilding(buildingId)
      setSelectedBuilding(detail)
    } catch {
      setError('Failed to load building details')
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {t('database.buildings.title')}
      </h1>
      <BuildingVerifyLegend />

      {/* 篩選器 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {CATEGORY_VALUES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat === 'all'
                ? t('database.buildings.allCategories')
                : t(`categories.${cat}`)}
            </Button>
          ))}
        </div>
        <input
          type="text"
          placeholder={t('database.buildings.searchPlaceholder')}
          className="px-4 py-2 border rounded-md bg-background"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <p className="text-center py-8">{t('common.loading')}</p>}
      {error && <p className="text-center py-8 text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 建築列表 */}
        <div className="md:col-span-1 border rounded-lg p-4 max-h-[600px] overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">
            {t('database.buildings.list')} ({buildings.length})
          </h2>
          <div className="space-y-2" role="list">
            {buildings.map((building) => (
              <div
                key={building.building_id}
                role="listitem"
                aria-label={buildingRowLabel(isZh ? building.name_zh : building.name_en, building.building_id, t('common.effectPending'))}
                data-testid="building-list-row"
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedBuilding?.building_id === building.building_id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelectBuilding(building.building_id)}
              >
                {/* 名稱這一行至少 44px、垂直置中：灰標的 44px 點擊範圍不會蓋到下一行（點下一行是選這棟建築） */}
                <p className="flex min-h-11 flex-wrap items-center font-medium" data-testid="building-list-name">
                  {isZh ? building.name_zh : building.name_en}
                  <BuildingVerifyMark buildingId={building.building_id} variant="list" onDark={selectedBuilding?.building_id === building.building_id} />
                </p>
                <p className="text-sm opacity-70">
                  {t('common.level')}1-{building.max_level} {t('common.separator')} {t(`categories.${building.category}`)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 建築詳情 */}
        <div className="md:col-span-2 border rounded-lg p-4">
          {selectedBuilding ? (
            <>
              <h2 className="text-2xl font-bold mb-2" data-testid="building-detail-name">
                {isZh ? selectedBuilding.name_zh : selectedBuilding.name_en}
                <BuildingVerifyMark buildingId={selectedBuilding.building_id} />
              </h2>
              <p className="text-muted-foreground mb-4">
                {isZh
                  ? selectedBuilding.description_zh
                  : selectedBuilding.description_en}
              </p>

              {/* 前置需求 */}
              {selectedBuilding.prerequisites.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">{t('database.buildings.prerequisites')}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {selectedBuilding.prerequisites.map((prereq) => {
                      const prereqBuilding = allBuildings.find(
                        (b) => b.building_id === prereq.building_id
                      )
                      const prereqName = prereqBuilding
                        ? isZh
                          ? prereqBuilding.name_zh
                          : prereqBuilding.name_en
                        : prereq.building_id
                      return (
                        <span
                          key={prereq.building_id}
                          className="px-2 py-1 bg-muted rounded text-sm"
                        >
                          {prereqName} {t('common.level')}{prereq.level}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 等級表格 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {/* 效果欄沒辦法照官方知識庫核對的建築：「效果」標題旁一個灰標，說明畫在標題列下面（P0-23） */}
                    <PendingRow as="tr" className="border-b" tableColSpan={9}>
                      <th className="py-2 px-2 text-left">{t('common.levelShort')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.wood')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.clay')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.iron')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.crop')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.buildTime')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.population')}</th>
                      <th className="py-2 px-2 text-right">{t('database.buildings.culturePoints')}</th>
                      <th className="py-2 px-2 text-left whitespace-nowrap" data-testid="building-effect-heading">
                        {t('database.buildings.effect')}
                        {!isBuildingEffectVerified(selectedBuilding.building_id) && <PendingVerifyChip kind="buildingEffect" className="ml-1" />}
                      </th>
                    </PendingRow>
                  </thead>
                  <tbody>
                    {selectedBuilding.levels.map((level) => (
                      <tr
                        key={level.level}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-2 px-2 font-medium">{level.level}</td>
                        <td className="py-2 px-2 text-right">
                          {level.cost_wood.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.cost_clay.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.cost_iron.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.cost_crop.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {formatTime(level.build_time_base)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.population}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.culture_points}
                        </td>
                        <td className="py-2 px-2 text-left text-muted-foreground">
                          {level.effect_description || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              {t('database.buildings.selectPrompt')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

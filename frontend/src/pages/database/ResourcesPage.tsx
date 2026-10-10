import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { resourcesApi } from '@/services/gameApi'
import type { ResourceFieldListItem, ResourceFieldDetail, ResourceType } from '@/types/game'
import { ingameBuildingName } from '@/lib/ingameNames'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import BuildingIcon from '@/components/common/BuildingIcon'

const RESOURCE_TYPES: { value: ResourceType; label: string; color: string }[] = [
  { value: 'wood', label: ingameBuildingName('woodcutter')!, color: 'bg-amber-100 text-amber-800' },
  { value: 'clay', label: ingameBuildingName('clay_pit')!, color: 'bg-orange-100 text-orange-800' },
  { value: 'iron', label: ingameBuildingName('iron_mine')!, color: 'bg-slate-100 text-slate-800' },
  { value: 'crop', label: ingameBuildingName('cropland')!, color: 'bg-green-100 text-green-800' },
]

export default function ResourcesPage() {
  const { i18n } = useTranslation()
  const [, setResources] = useState<ResourceFieldListItem[]>([])
  const [selectedResource, setSelectedResource] = useState<ResourceFieldDetail | null>(
    null
  )
  const [roiData, setRoiData] = useState<
    Array<{
      from_level: number
      to_level: number
      roi_hours: number
      upgrade_cost: number
      production_increase: number
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRoi, setShowRoi] = useState(false)

  const isZh = i18n.language.startsWith('zh')

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true)
        const response = await resourcesApi.getResources()
        setResources(response.resource_fields)
        // 預設選擇第一個
        if (response.resource_fields.length > 0) {
          const first = response.resource_fields[0]
          handleSelectResource(first.resource_type)
        }
      } catch {
        setError('Failed to load resources')
      } finally {
        setLoading(false)
      }
    }

    fetchResources()
  }, [])

  const handleSelectResource = async (resourceType: ResourceType) => {
    try {
      const [detail, roi] = await Promise.all([
        resourcesApi.getResourceField(resourceType),
        resourcesApi.getRoi(resourceType, 20),
      ])
      setSelectedResource(detail)
      setRoiData(roi)
    } catch {
      setError('Failed to load resource details')
    }
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }

  const formatRoiHours = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${(hours / 24).toFixed(1)}d`
  }

  if (loading) return <p className="text-center py-8">Loading...</p>
  if (error) return <p className="text-center py-8 text-red-500">{error}</p>

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">資源田數據庫</h1>

      {/* 資源類型選擇 */}
      <div className="flex flex-wrap gap-4 mb-6">
        {RESOURCE_TYPES.map((res) => (
          <Button
            key={res.value}
            variant={
              selectedResource?.resource_type === res.value ? 'default' : 'outline'
            }
            onClick={() => handleSelectResource(res.value)}
            className="min-w-[120px] gap-2"
          >
            <BuildingIcon id={res.value} size={20} />
            {res.label}
          </Button>
        ))}
      </div>

      {selectedResource && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本資訊 */}
          <div className="border rounded-lg p-4">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <BuildingIcon id={selectedResource.resource_type} size={32} />
              {isZh ? selectedResource.name_zh : selectedResource.name_en}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-muted rounded">
                <p className="text-sm text-muted-foreground">一般村莊最高等級</p>
                <p className="text-2xl font-bold">{selectedResource.max_level}</p>
              </div>
              <div className="p-3 bg-muted rounded">
                <p className="text-sm text-muted-foreground">首都最高等級</p>
                <p className="text-2xl font-bold">
                  {selectedResource.max_level_capital}
                </p>
              </div>
            </div>

            {/* 切換表格 */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={!showRoi ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowRoi(false)}
              >
                等級數據
              </Button>
              <Button
                variant={showRoi ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowRoi(true)}
              >
                ROI 分析
              </Button>
            </div>
          </div>

          {/* 產量圖表 */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">產量曲線</h3>
            <div className="h-48 flex items-end gap-1">
              {selectedResource.levels.slice(0, 20).map((level) => (
                <div
                  key={level.level}
                  className="flex-1 bg-green-500 rounded-t"
                  style={{
                    height: `${
                      (level.production_per_hour /
                        Math.max(
                          ...selectedResource.levels.map(
                            (l) => l.production_per_hour
                          )
                        )) *
                      100
                    }%`,
                  }}
                  title={`${level.level} 級：${level.production_per_hour}/小時`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0 級</span>
              <span>10 級</span>
              <span>20 級</span>
            </div>
          </div>

          {/* 數據表格 */}
          <div className="md:col-span-2 border rounded-lg p-4 overflow-x-auto">
            {!showRoi ? (
              <>
                <h3 className="font-semibold mb-4">等級數據</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left">等級</th>
                      <th className="py-2 px-2 text-right">產量/小時</th>
                      <th className="py-2 px-2 text-right">木材</th>
                      <th className="py-2 px-2 text-right">黏土</th>
                      <th className="py-2 px-2 text-right">鐵礦</th>
                      <th className="py-2 px-2 text-right">糧食</th>
                      <th className="py-2 px-2 text-right">總成本</th>
                      <th className="py-2 px-2 text-right">時間（1 倍速）</th>
                      <th className="py-2 px-2 text-right">人口</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResource.levels.map((level) => (
                      <PendingRow
                        as="tr"
                        tableColSpan={9}
                        key={level.level}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-2 px-2 font-medium whitespace-nowrap">
                          {level.level}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-green-600">
                          {level.production_per_hour}
                          {/* 0 級產量官方資料沒有（官方知識庫從 1 級開始，P0-23） */}
                          {level.level === 0 && <PendingVerifyChip kind="fieldLevelZero" className="ml-1" />}
                        </td>
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
                          {level.total_cost.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {formatTime(level.build_time_base)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {level.population}
                        </td>
                      </PendingRow>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <h3 className="font-semibold mb-4">ROI 分析 (回本時間)</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-2 text-left">升級</th>
                      <th className="py-2 px-2 text-right">升級成本</th>
                      <th className="py-2 px-2 text-right">產量增加</th>
                      <th className="py-2 px-2 text-right">ROI (回本時間)</th>
                      <th className="py-2 px-2 text-left">建議</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiData.map((roi) => (
                      <PendingRow
                        as="tr"
                        tableColSpan={5}
                        key={roi.from_level}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-2 px-2 font-medium">
                          {roi.from_level} → {roi.to_level} 級
                        </td>
                        <td className="py-2 px-2 text-right">
                          {roi.upgrade_cost.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right text-green-600">
                          +{roi.production_increase}/h
                          {roi.from_level === 0 && <PendingVerifyChip kind="fieldLevelZero" className="ml-1" />}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold">
                          {formatRoiHours(roi.roi_hours)}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              roi.roi_hours < 50
                                ? 'bg-green-100 text-green-800'
                                : roi.roi_hours < 100
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {roi.roi_hours < 50
                              ? '優先升級'
                              : roi.roi_hours < 100
                              ? '可以升級'
                              : '延後升級'}
                          </span>
                        </td>
                      </PendingRow>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

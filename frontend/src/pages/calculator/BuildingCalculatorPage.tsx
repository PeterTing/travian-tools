import { useState, useEffect } from 'react'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { apiErrorMessage } from '@/lib/apiFieldErrors'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { buildingsApi, calculatorApi } from '@/services/gameApi'
import BuildingVerifyMark, { BuildingVerifyLegend } from '@/components/common/BuildingVerifyMark'
import { isBuildingFullyVerified } from '@/lib/buildingVerify'
import type {
  BuildingListItem,
  BuildingUpgradeRequest,
  BuildingUpgradeResponse,
} from '@/types/game'
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

export default function BuildingCalculatorPage() {
  const { t, i18n } = useTranslation()
  const [buildings, setBuildings] = useState<BuildingListItem[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [fromLevel, setFromLevel] = useState<number>(0)
  const [toLevel, setToLevel] = useState<number>(10)
  const [mainBuildingLevel, setMainBuildingLevel] = useState<number>(20)
  // 伺服器速度跟「已帶入」列（含這頁的「更改」，稽核 2026-10-10）
  const fill = useAutoFill()
  const [serverSpeed, setServerSpeed] = useState<number>(fill.speed)

  useEffect(() => {
    setServerSpeed(fill.speed)
  }, [fill.speed])
  const [result, setResult] = useState<BuildingUpgradeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isZh = i18n.language.startsWith('zh')

  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        const response = await buildingsApi.getBuildings()
        setBuildings(response.buildings)
        if (response.buildings.length > 0) {
          setSelectedBuilding(response.buildings[0].building_id)
        }
      } catch {
        setError('建築資料載入失敗，請重新整理')
      }
    }
    fetchBuildings()
  }, [])

  const handleCalculate = async () => {
    if (!selectedBuilding) return

    try {
      setLoading(true)
      setError(null)
      const request: BuildingUpgradeRequest = {
        building_id: selectedBuilding,
        from_level: fromLevel,
        to_level: toLevel,
        main_building_level: mainBuildingLevel,
        server_speed: serverSpeed,
      }
      const response = await calculatorApi.calculateBuildingUpgrade(request)
      setResult(response)
    } catch (err) {
      // 後端的中文訊息直接顯示（例如「目標等級要比目前等級高」）
      setError(apiErrorMessage(err) ?? '計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  const selectedBuildingData = buildings.find(
    (b) => b.building_id === selectedBuilding
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{t('calculator.building.title')}</h1>
      <BuildingVerifyLegend />
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('calculator.building.params')}</h2>

          {/* Building selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {t('calculator.building.selectBuilding')}
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full p-2 border rounded bg-background"
            >
              {buildings.map((building) => (
                <option key={building.building_id} value={building.building_id}>
                  {isZh ? building.name_zh : building.name_en}{isBuildingFullyVerified(building.building_id) ? ` ${t('common.verifiedShort')}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Level range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('calculator.building.fromLevel')}
              </label>
              <input
                type="number"
                min={0}
                max={selectedBuildingData?.max_level || 20}
                value={fromLevel}
                onChange={(e) => setFromLevel(Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('calculator.building.toLevel')}
              </label>
              <input
                type="number"
                min={1}
                max={selectedBuildingData?.max_level || 20}
                value={toLevel}
                onChange={(e) => setToLevel(Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          {/* Main building level */}
          <div className="mb-4">
            <Stepper
              labelStyle="form"
              label={t('calculator.building.mainBuildingLevel')}
              value={mainBuildingLevel}
              onChange={setMainBuildingLevel}
              min={0}
              max={20}
              testId="building-main-level"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('calculator.building.mainBuildingNote')}
            </p>
            {selectedBuilding === 'main_building' && (
              <p className="text-xs text-muted-foreground mt-1" data-testid="mb-self-note">
                升村莊大樓本身：每一級用「蓋這一級時」的大樓等級算（填的等級比較高就用填的）。
              </p>
            )}
          </div>

          {/* Server speed */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {t('calculator.building.serverSpeed')}
            </label>
            <select
              data-testid="building-server-speed"
              value={serverSpeed}
              onChange={(e) => setServerSpeed(Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            >
              <option value={1}>{t('calculator.building.serverSpeedOptions.1x')}</option>
              <option value={2}>{t('calculator.building.serverSpeedOptions.2x')}</option>
              <option value={3}>{t('calculator.building.serverSpeedOptions.3x')}</option>
              <option value={5}>{t('calculator.building.serverSpeedOptions.5x')}</option>
              <option value={10}>{t('calculator.building.serverSpeedOptions.10x')}</option>
            </select>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !selectedBuilding || fromLevel >= toLevel}
            className="w-full"
          >
            {loading ? t('common.calculating') : t('calculator.building.calculate')}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result area */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('calculator.building.result')}</h2>

          {result ? (
            <div className="space-y-4">
              {/* Building info */}
              <div className="p-4 bg-muted rounded">
                <h3 className="font-semibold" data-testid="calc-building-name">
                  {isZh ? result.building_name_zh : result.building_name_en}
                  <BuildingVerifyMark buildingId={result.building_id} />
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('calculator.building.levelRange', { from: result.from_level, to: result.to_level })}
                </p>
              </div>

              {/* Resource cost */}
              <div>
                <h4 className="font-medium mb-2">{t('calculator.building.totalResources')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded">
                    <span className="text-amber-700 dark:text-amber-300">
                      {t('database.buildings.wood')}
                    </span>
                    <p className="font-semibold">
                      {result.cost.wood.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded">
                    <span className="text-orange-700 dark:text-orange-300">
                      {t('database.buildings.clay')}
                    </span>
                    <p className="font-semibold">
                      {result.cost.clay.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded">
                    <span className="text-slate-700 dark:text-slate-300">
                      {t('database.buildings.iron')}
                    </span>
                    <p className="font-semibold">
                      {result.cost.iron.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                    <span className="text-green-700 dark:text-green-300">
                      {t('database.buildings.crop')}
                    </span>
                    <p className="font-semibold">
                      {result.cost.crop.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 p-2 bg-muted rounded text-center">
                  <span className="text-sm text-muted-foreground">
                    {t('database.buildings.totalCost')}
                  </span>
                  <span className="font-bold">
                    {' '}{result.total_cost.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Time */}
              <div>
                <h4 className="font-medium mb-2">{t('calculator.building.buildTime')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted rounded">
                    <span className="text-muted-foreground">
                      {t('calculator.building.baseTime')}
                    </span>
                    <p className="font-semibold">
                      {formatTime(result.build_time_base)}
                    </p>
                  </div>
                  <div className="p-2 bg-primary/10 rounded">
                    <span className="text-muted-foreground">
                      {t('calculator.building.actualTime')}
                    </span>
                    <p className="font-semibold text-primary">
                      {result.build_time_formatted}
                    </p>
                  </div>
                </div>
              </div>

              {/* Population and Culture Points */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">
                    {t('calculator.building.populationIncrease')}
                  </span>
                  <p className="font-semibold">
                    {t('calculator.building.plusPopulation', { value: result.population_increase })}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">
                    {t('calculator.building.culturePointsPerDay')}
                  </span>
                  <p className="font-semibold">
                    {t('calculator.building.plusCulturePoints', { value: result.culture_points_per_day })}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {t('calculator.building.selectPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

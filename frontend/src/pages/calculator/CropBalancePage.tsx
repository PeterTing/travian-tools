import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { calculatorApi, buildingsApi, troopsApi } from '@/services/gameApi'
import type {
  CropBalanceRequest,
  CropBalanceResponse,
  BuildingListItem,
  TroopListItem,
  BattleUnit,
} from '@/types/game'

interface BuildingEntry {
  building_id: string
  level: number
}

export default function CropBalancePage() {
  const { t } = useTranslation()

  // Building and troop data
  const [buildings, setBuildings] = useState<BuildingListItem[]>([])
  const [troops, setTroops] = useState<TroopListItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Form state
  const [selectedBuildings, setSelectedBuildings] = useState<BuildingEntry[]>([
    { building_id: '', level: 1 },
  ])
  const [selectedTroops, setSelectedTroops] = useState<BattleUnit[]>([
    { troop_id: '', count: 0 },
  ])
  const [cropFieldsProduction, setCropFieldsProduction] = useState(1000)
  const [oasisBonus, setOasisBonus] = useState(0)
  const [heroCropProduction, setHeroCropProduction] = useState(0)
  const [heroCropConsumption, setHeroCropConsumption] = useState(0)
  const { currentAccount } = useCurrentAccount()
  const [serverSpeed, setServerSpeed] = useState(1)

  useEffect(() => {
    if (currentAccount?.server_speed) {
      setServerSpeed(currentAccount.server_speed)
    }
  }, [currentAccount])

  // Result state
  const [result, setResult] = useState<CropBalanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load buildings and troops data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [buildingsRes, troopsRes] = await Promise.all([
          buildingsApi.getBuildings(),
          troopsApi.getTroops(),
        ])
        setBuildings(buildingsRes.buildings)
        setTroops(troopsRes.troops)
      } catch {
        setError(t('calculator.crop.loadError'))
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [t])

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)

      // Filter out empty entries
      const validBuildings = selectedBuildings.filter((b) => b.building_id)
      const validTroops = selectedTroops.filter((t) => t.troop_id && t.count > 0)

      const request: CropBalanceRequest = {
        buildings: validBuildings,
        troops: validTroops.length > 0 ? validTroops : undefined,
        crop_fields_production: cropFieldsProduction,
        oasis_bonus: oasisBonus > 0 ? oasisBonus : undefined,
        hero_crop_production: heroCropProduction,
        hero_crop_consumption: heroCropConsumption,
        server_speed: serverSpeed,
      }

      const response = await calculatorApi.calculateCropBalance(request)
      setResult(response)
    } catch {
      setError(t('calculator.crop.calcError'))
    } finally {
      setLoading(false)
    }
  }

  const addBuilding = () => {
    setSelectedBuildings([...selectedBuildings, { building_id: '', level: 1 }])
  }

  const removeBuilding = (index: number) => {
    if (selectedBuildings.length > 1) {
      setSelectedBuildings(selectedBuildings.filter((_, i) => i !== index))
    }
  }

  const updateBuilding = (
    index: number,
    field: keyof BuildingEntry,
    value: string | number
  ) => {
    const newBuildings = [...selectedBuildings]
    if (field === 'building_id') {
      newBuildings[index].building_id = value as string
    } else {
      newBuildings[index].level = value as number
    }
    setSelectedBuildings(newBuildings)
  }

  const addTroop = () => {
    setSelectedTroops([...selectedTroops, { troop_id: '', count: 0 }])
  }

  const removeTroop = (index: number) => {
    if (selectedTroops.length > 1) {
      setSelectedTroops(selectedTroops.filter((_, i) => i !== index))
    }
  }

  const updateTroop = (
    index: number,
    field: keyof BattleUnit,
    value: string | number
  ) => {
    const newTroops = [...selectedTroops]
    if (field === 'troop_id') {
      newTroops[index].troop_id = value as string
    } else {
      newTroops[index].count = value as number
    }
    setSelectedTroops(newTroops)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'surplus':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'balanced':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      case 'deficit':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      case 'critical':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-gray-100 dark:bg-gray-900'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'surplus':
        return t('calculator.crop.status.surplus')
      case 'balanced':
        return t('calculator.crop.status.balanced')
      case 'deficit':
        return t('calculator.crop.status.deficit')
      case 'critical':
        return t('calculator.crop.status.critical')
      default:
        return status
    }
  }

  if (loadingData) {
    return <p className="text-center py-8">{t('common.loading')}</p>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('calculator.crop.title')}</h1>
      <p className="text-muted-foreground mb-6">
        {t('calculator.crop.description')}
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Input area */}
        <div className="space-y-6">
          {/* Crop production */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('calculator.crop.cropProduction')}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('calculator.crop.cropFieldsProduction')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={cropFieldsProduction}
                  onChange={(e) =>
                    setCropFieldsProduction(Number(e.target.value))
                  }
                  className="w-full p-2 border rounded bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('calculator.crop.cropFieldsHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('calculator.crop.oasisBonus')} ({t('common.percent')})
                </label>
                <input
                  type="number"
                  min={0}
                  max={150}
                  value={oasisBonus}
                  onChange={(e) => setOasisBonus(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('calculator.crop.heroProduction')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={heroCropProduction}
                  onChange={(e) => setHeroCropProduction(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('calculator.crop.heroProductionHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('calculator.crop.heroConsumption')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={heroCropConsumption}
                  onChange={(e) => setHeroCropConsumption(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('calculator.crop.heroConsumptionHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('calculator.crop.serverSpeed')}
                </label>
                <select
                  value={serverSpeed}
                  onChange={(e) => setServerSpeed(Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buildings */}
          <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {t('calculator.crop.buildings')}
              </h2>
              <Button variant="outline" size="sm" onClick={addBuilding}>
                {t('common.plusSymbol')} {t('calculator.crop.addBuilding')}
              </Button>
            </div>

            <div className="space-y-3">
              {selectedBuildings.map((building, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={building.building_id}
                    onChange={(e) =>
                      updateBuilding(index, 'building_id', e.target.value)
                    }
                    className="flex-1 p-2 border rounded bg-background"
                  >
                    <option value="">{t('calculator.crop.selectBuilding')}</option>
                    {buildings.map((b) => (
                      <option key={b.building_id} value={b.building_id}>
                        {b.name_zh}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={building.level}
                    onChange={(e) =>
                      updateBuilding(index, 'level', Number(e.target.value))
                    }
                    className="w-20 p-2 border rounded bg-background text-center"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBuilding(index)}
                    disabled={selectedBuildings.length <= 1}
                  >
                    {t('common.removeSymbol')}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Troops */}
          <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {t('calculator.crop.troops')}
              </h2>
              <Button variant="outline" size="sm" onClick={addTroop}>
                {t('common.plusSymbol')} {t('calculator.crop.addTroop')}
              </Button>
            </div>

            <div className="space-y-3">
              {selectedTroops.map((troop, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    value={troop.troop_id}
                    onChange={(e) =>
                      updateTroop(index, 'troop_id', e.target.value)
                    }
                    className="flex-1 p-2 border rounded bg-background"
                  >
                    <option value="">{t('calculator.crop.selectTroop')}</option>
                    {troops.map((trp) => (
                      <option key={trp.troop_id} value={trp.troop_id}>
                        {trp.name_zh} ({trp.crop_consumption}{t('common.perHour')})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={troop.count}
                    onChange={(e) =>
                      updateTroop(index, 'count', Number(e.target.value))
                    }
                    className="w-24 p-2 border rounded bg-background text-center"
                    placeholder={t('calculator.crop.count')}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTroop(index)}
                    disabled={selectedTroops.length <= 1}
                  >
                    {t('common.removeSymbol')}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading}
            className="w-full"
          >
            {loading ? t('common.calculating') : t('calculator.crop.calculate')}
          </Button>

          {error && <p className="text-red-500">{error}</p>}
        </div>

        {/* Right: Results */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('calculator.crop.results')}
          </h2>

          {result ? (
            <div className="space-y-6">
              {/* Status */}
              <div className={`p-4 rounded ${getStatusColor(result.status)}`}>
                <h3 className="font-semibold mb-2">
                  {t('calculator.crop.status.label')}
                </h3>
                <p className="text-2xl font-bold">
                  {getStatusLabel(result.status)}
                </p>
              </div>

              {/* Production */}
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded">
                <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">
                  {t('calculator.crop.production')}
                </h3>
                <p className="text-2xl font-bold text-green-600">
                  {t('common.plusSymbol')}{result.crop_production.toLocaleString()}{t('common.perHour')}
                </p>
              </div>

              {/* Consumption */}
              <div className="p-4 bg-red-50 dark:bg-red-950 rounded">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-3">
                  {t('calculator.crop.consumption')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('calculator.crop.populationConsumption')}
                    </p>
                    <p className="text-xl font-bold">
                      {result.population_consumption.toLocaleString()}{t('common.perHour')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('calculator.crop.troopConsumption')}
                    </p>
                    <p className="text-xl font-bold">
                      {result.troop_consumption.toLocaleString()}{t('common.perHour')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-sm text-muted-foreground">
                    {t('calculator.crop.totalConsumption')}
                  </p>
                  <p className="text-xl font-bold text-red-600">
                    {t('common.minusSymbol')}{result.total_consumption.toLocaleString()}{t('common.perHour')}
                  </p>
                </div>
              </div>

              {/* Balance */}
              <div
                className={`p-4 rounded ${
                  result.balance >= 0
                    ? 'bg-green-100 dark:bg-green-900'
                    : 'bg-red-100 dark:bg-red-900'
                }`}
              >
                <h3 className="font-semibold mb-2">
                  {t('calculator.crop.balance')}
                </h3>
                <p
                  className={`text-3xl font-bold ${
                    result.balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.balance >= 0 ? t('common.plusSymbol') : ''}
                  {result.balance.toLocaleString()}{t('common.perHour')}
                </p>
              </div>

              {/* Warning */}
              {result.warning_message && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    {t('calculator.crop.warning')}
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    {result.warning_message}
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">
                    {t('calculator.crop.suggestions')}
                  </h3>
                  <ul className="space-y-2">
                    {result.suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="text-blue-700 dark:text-blue-300"
                      >
                        {t('common.minusSymbol')} {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Daily stats */}
              <div className="p-4 border rounded">
                <h3 className="font-semibold mb-3">
                  {t('calculator.crop.dailyStats')}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">
                      {t('calculator.crop.dailyProduction')}
                    </p>
                    <p className="font-semibold">
                      {(result.crop_production * 24).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {t('calculator.crop.dailyConsumption')}
                    </p>
                    <p className="font-semibold">
                      {(result.total_consumption * 24).toLocaleString()}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">
                      {t('calculator.crop.dailyBalance')}
                    </p>
                    <p
                      className={`font-semibold ${result.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {result.balance >= 0 ? t('common.plusSymbol') : ''}
                      {(result.balance * 24).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Troop capacity */}
              {result.balance > 0 && (
                <div className="p-4 bg-muted rounded">
                  <h3 className="font-semibold mb-3">
                    {t('calculator.crop.troopCapacity')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('calculator.crop.troopCapacityHint')}
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        1 {t('calculator.crop.cropUnit')}
                      </p>
                      <p className="font-bold">
                        {Math.floor(result.balance).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        2 {t('calculator.crop.cropUnit')}
                      </p>
                      <p className="font-bold">
                        {Math.floor(result.balance / 2).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <p className="text-xs text-muted-foreground">
                        3 {t('calculator.crop.cropUnit')}
                      </p>
                      <p className="font-bold">
                        {Math.floor(result.balance / 3).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              {t('calculator.crop.noResult')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { calculatorApi } from '@/services/gameApi'
import type { ResourceRoiResponse, ResourceType } from '@/types/game'

const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  clay: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  iron: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  crop: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

interface ResourceField {
  resource_type: ResourceType
  current_level: number
}

export default function RoiCalculatorPage() {
  const { t } = useTranslation()
  const [fields, setFields] = useState<ResourceField[]>([
    { resource_type: 'wood', current_level: 5 },
    { resource_type: 'clay', current_level: 5 },
    { resource_type: 'iron', current_level: 5 },
    { resource_type: 'crop', current_level: 5 },
  ])
  const [oasisBonus, setOasisBonus] = useState<Record<string, number>>({
    wood: 0,
    clay: 0,
    iron: 0,
    crop: 0,
  })
  const [results, setResults] = useState<ResourceRoiResponse[]>([])
  const [recommendedOrder, setRecommendedOrder] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await calculatorApi.calculateBatchRoi(fields, oasisBonus)
      setResults(response.results)
      setRecommendedOrder(response.recommended_order)
    } catch {
      setError('Failed to calculate ROI')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (
    index: number,
    key: keyof ResourceField,
    value: string | number
  ) => {
    const newFields = [...fields]
    if (key === 'resource_type') {
      newFields[index].resource_type = value as ResourceType
    } else {
      newFields[index].current_level = Number(value)
    }
    setFields(newFields)
  }

  const addField = () => {
    setFields([...fields, { resource_type: 'wood', current_level: 5 }])
  }

  const removeField = (index: number) => {
    if (fields.length > 1) {
      setFields(fields.filter((_, i) => i !== index))
    }
  }

  const formatRoiHours = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours < 24) return `${hours.toFixed(1)}h`
    return `${(hours / 24).toFixed(1)}d`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('calculator.roi.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('calculator.roi.description')}</p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input area */}
        <div className="space-y-6">
          {/* Resource field list */}
          <div className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t('calculator.roi.fieldSettings')}</h2>
              <Button variant="outline" size="sm" onClick={addField}>
                + {t('calculator.roi.addField')}
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-muted rounded"
                >
                  <select
                    value={field.resource_type}
                    onChange={(e) =>
                      handleFieldChange(index, 'resource_type', e.target.value)
                    }
                    className="flex-1 p-2 border rounded bg-background"
                  >
                    {(['wood', 'clay', 'iron', 'crop'] as ResourceType[]).map(
                      (type) => (
                        <option key={type} value={type}>
                          {t(`resources.${type}`)}
                        </option>
                      )
                    )}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Lv.</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={field.current_level}
                      onChange={(e) =>
                        handleFieldChange(
                          index,
                          'current_level',
                          e.target.value
                        )
                      }
                      className="w-16 p-2 border rounded bg-background text-center"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(index)}
                    disabled={fields.length <= 1}
                  >
                    x
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Oasis bonus */}
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">{t('calculator.roi.oasisBonus')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {(['wood', 'clay', 'iron', 'crop'] as ResourceType[]).map(
                (type) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${RESOURCE_COLORS[type]}`}
                    >
                      {t(`resources.${type}`)}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      value={oasisBonus[type] || 0}
                      onChange={(e) =>
                        setOasisBonus({
                          ...oasisBonus,
                          [type]: Number(e.target.value),
                        })
                      }
                      className="flex-1 p-2 border rounded bg-background text-center"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('calculator.roi.oasisNote')}
            </p>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || fields.length === 0}
            className="w-full"
          >
            {loading ? t('common.calculating') : t('calculator.roi.calculate')}
          </Button>

          {error && <p className="text-red-500">{error}</p>}
        </div>

        {/* Result area */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('calculator.roi.result')}</h2>

          {results.length > 0 ? (
            <div className="space-y-6">
              {/* Recommended order */}
              <div className="p-4 bg-primary/10 rounded">
                <h3 className="font-semibold mb-2">{t('calculator.roi.recommendedOrder')}</h3>
                <div className="flex flex-wrap gap-2">
                  {recommendedOrder.map((item, index) => {
                    const parts = item.split(' ')
                    const type = parts[0] as ResourceType
                    return (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded ${RESOURCE_COLORS[type] || 'bg-muted'}`}
                      >
                        {index + 1}. {item}
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* ROI details for each resource field */}
              {results.map((result, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`px-3 py-1 rounded font-medium ${RESOURCE_COLORS[result.resource_type]}`}
                    >
                      {t(`resources.${result.resource_type}`)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Lv.{result.current_level} → Lv.{result.next_level}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                    <div className="p-2 bg-muted rounded text-center">
                      <p className="text-muted-foreground">{t('calculator.roi.upgradeCost')}</p>
                      <p className="font-semibold">
                        {result.total_cost.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded text-center">
                      <p className="text-muted-foreground">{t('calculator.roi.productionIncrease')}</p>
                      <p className="font-semibold text-green-600">
                        +{result.production_increase}/h
                      </p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded text-center">
                      <p className="text-muted-foreground">{t('calculator.roi.roi')}</p>
                      <p className="font-semibold text-primary">
                        {formatRoiHours(result.roi_hours)}
                      </p>
                    </div>
                  </div>

                  {/* ROI assessment */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        result.roi_hours < 50
                          ? 'bg-green-100 text-green-800'
                          : result.roi_hours < 100
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.roi_hours < 50
                        ? t('database.resources.priorityUpgrade')
                        : result.roi_hours < 100
                          ? t('database.resources.canUpgrade')
                          : t('database.resources.delayUpgrade')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {result.roi_hours < 50
                        ? t('calculator.roi.fastReturn')
                        : result.roi_hours < 100
                          ? t('calculator.roi.moderateReturn')
                          : t('calculator.roi.slowReturn')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              {t('calculator.roi.setFieldsPrompt')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

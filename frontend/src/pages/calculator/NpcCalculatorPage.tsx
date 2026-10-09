import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { NpcCalculatorRequest, NpcCalculatorResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'

const RESOURCE_KEYS = ['wood', 'clay', 'iron', 'crop'] as const
type ResourceKey = (typeof RESOURCE_KEYS)[number]

const COLOR: Record<ResourceKey, string> = {
  wood: 'text-amber-700 dark:text-amber-300',
  clay: 'text-orange-700 dark:text-orange-300',
  iron: 'text-slate-700 dark:text-slate-300',
  crop: 'text-green-700 dark:text-green-300',
}

export default function NpcCalculatorPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState<NpcCalculatorRequest>({
    wood: 0,
    clay: 0,
    iron: 0,
    crop: 0,
    desired_ratios: { wood: 1, clay: 1, iron: 1, crop: 1 },
    warehouse_capacity: undefined,
    granary_capacity: undefined,
  })
  const [result, setResult] = useState<NpcCalculatorResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResourceChange = (field: ResourceKey, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleRatioChange = (field: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      desired_ratios: { ...prev.desired_ratios, [field]: value },
    }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateNpc(form)
      setResult(res)
    } catch {
      setError(t('calculator.npc.calcError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('calculator.npc.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('calculator.npc.description')}</p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('calculator.npc.currentResources')}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {RESOURCE_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">
                  {t(`calculator.npc.${key}`)}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => handleResourceChange(key, Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                  data-testid={`npc-${key}`}
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4">{t('calculator.npc.desiredRatio')}</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {RESOURCE_KEYS.map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">
                  {t(`calculator.npc.${key}`)}
                </label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={form.desired_ratios[key] ?? 1}
                  onChange={(e) => handleRatioChange(key, Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                  data-testid={`npc-ratio-${key}`}
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4">{t('calculator.npc.capacityOptional')}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t('calculator.npc.capacityHint')}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('calculator.npc.warehouseCapacity')}
              </label>
              <input
                type="number"
                min={0}
                value={form.warehouse_capacity ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    warehouse_capacity: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                className="w-full p-2 border rounded bg-background"
                placeholder={t('calculator.npc.warehousePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('calculator.npc.granaryCapacity')}
              </label>
              <input
                type="number"
                min={0}
                value={form.granary_capacity ?? ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    granary_capacity: e.target.value === '' ? undefined : Number(e.target.value),
                  }))
                }
                className="w-full p-2 border rounded bg-background"
                placeholder={t('calculator.npc.granaryPlaceholder')}
              />
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full" data-testid="npc-submit">
            {loading ? t('calculator.npc.calculating') : t('calculator.npc.calculate')}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('calculator.npc.results')}</h2>

          {result ? (
            <div className="space-y-4" data-testid="npc-result">
              <div className="p-4 bg-muted rounded text-center">
                <span className="text-sm text-muted-foreground">
                  {t('calculator.npc.totalResources')}
                </span>
                <p className="text-2xl font-bold">{result.total_resources.toLocaleString()}</p>
                {(result.unallocated ?? 0) > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                    {t('calculator.npc.unallocated', {
                      count: result.unallocated ?? 0,
                    })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {RESOURCE_KEYS.map((key) => (
                  <div key={key} className="p-3 border rounded">
                    <span className={`text-sm ${COLOR[key]}`}>{t(`calculator.npc.${key}`)}</span>
                    <p className="text-xl font-bold">
                      {(result.result[key] ?? 0).toLocaleString()}
                    </p>
                    <p
                      className={`text-sm ${
                        (result.difference[key] ?? 0) > 0
                          ? 'text-green-600'
                          : (result.difference[key] ?? 0) < 0
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {(result.difference[key] ?? 0) > 0 ? '+' : ''}
                      {(result.difference[key] ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">{t('calculator.npc.noResult')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

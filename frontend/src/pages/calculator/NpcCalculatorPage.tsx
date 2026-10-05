import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { NpcCalculatorRequest, NpcCalculatorResponse } from '@/services/advancedCalculatorApi'

export default function NpcCalculatorPage() {
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

  const handleResourceChange = (field: 'wood' | 'clay' | 'iron' | 'crop', value: number) => {
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
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  const resourceLabels = [
    { key: 'wood', label: '木材', colorClass: 'text-amber-700 dark:text-amber-300' },
    { key: 'clay', label: '磚塊', colorClass: 'text-orange-700 dark:text-orange-300' },
    { key: 'iron', label: '鐵礦', colorClass: 'text-slate-700 dark:text-slate-300' },
    { key: 'crop', label: '穀物', colorClass: 'text-green-700 dark:text-green-300' },
  ] as const

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">NPC 計算器</h1>
      <p className="text-muted-foreground mb-6">
        將現有資源按指定比例重新分配（模擬 NPC 交易）。
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">當前資源</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {resourceLabels.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) =>
                    handleResourceChange(key, Number(e.target.value))
                  }
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4">期望比例</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {resourceLabels.map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={form.desired_ratios[key] ?? 1}
                  onChange={(e) => handleRatioChange(key, Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold mb-4">容量上限（選填）</h2>
          <p className="text-xs text-muted-foreground mb-3">
            官方規則：NPC 分配不得超過倉庫／穀倉容量。
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">倉庫容量</label>
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
                placeholder="木／磚／鐵上限"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">穀倉容量</label>
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
                placeholder="穀物上限"
              />
            </div>
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? '計算中...' : '計算 NPC 分配'}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">NPC 結果</h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded text-center">
                <span className="text-sm text-muted-foreground">總資源</span>
                <p className="text-2xl font-bold">
                  {result.total_resources.toLocaleString()}
                </p>
                {(result.unallocated ?? 0) > 0 && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                    因容量限制未分配：{result.unallocated?.toLocaleString()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {resourceLabels.map(({ key, label, colorClass }) => (
                  <div key={key} className="p-3 border rounded">
                    <span className={`text-sm ${colorClass}`}>{label}</span>
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
            <div className="text-center text-muted-foreground py-8">
              輸入資源和比例後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

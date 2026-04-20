import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  VillageBuilderRequest,
  VillageBuilderResponse,
} from '@/services/advancedCalculatorApi'

type CropperType = VillageBuilderRequest['cropper_type']

const CROPPER_OPTIONS: { value: CropperType; label: string }[] = [
  { value: '15c', label: '15-cropper (1-1-1-15)' },
  { value: '9c', label: '9-cropper (3-3-3-9)' },
  { value: '7c', label: '7-cropper (3-4-4-7)' },
  { value: '6c', label: '6-cropper (4-4-4-6)' },
  { value: '4446', label: 'Standard 4-4-4-6' },
  { value: '3347', label: '3-3-4-7' },
]

export default function VillageBuilderPage() {
  const [form, setForm] = useState<VillageBuilderRequest>({
    cropper_type: '15c',
    oases: [],
    tribe_egyptian: false,
    gold_plus: false,
    target_field_level: 18,
  })
  const [result, setResult] = useState<VillageBuilderResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateVillageBuilder(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">最佳建造順序</h1>
      <p className="text-muted-foreground mb-6">
        依 Lumi 攻略與 Travian Support
        官方建築前置規則，產出你首都的建造序列。15-cropper 自動跳過 Sawmill /
        Brickyard / Iron Foundry（浪費 slot）。
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">參數設定</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">首都類型</label>
            <select
              data-testid="cropper-type"
              value={form.cropper_type}
              onChange={(e) =>
                setForm({ ...form, cropper_type: e.target.value as CropperType })
              }
              className="w-full p-2 border rounded bg-background"
            >
              {CROPPER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              目標資源田等級 (10-20)
            </label>
            <input
              type="number"
              data-testid="target-level"
              min={10}
              max={20}
              value={form.target_field_level}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_field_level: Number(e.target.value) || 18,
                })
              }
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="gold-plus"
                checked={form.gold_plus}
                onChange={(e) => setForm({ ...form, gold_plus: e.target.checked })}
              />
              Gold Plus (+25%)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                data-testid="egyptian"
                checked={form.tribe_egyptian}
                onChange={(e) =>
                  setForm({ ...form, tribe_egyptian: e.target.checked })
                }
              />
              埃及族
            </label>
          </div>

          <Button
            data-testid="submit"
            disabled={loading}
            onClick={handleCalculate}
          >
            {loading ? '計算中…' : '產生建造序列'}
          </Button>

          {error && (
            <p className="text-red-600 mt-3" data-testid="error">
              {error}
            </p>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">建造序列</h2>
          {!result && <p className="text-muted-foreground">尚未計算</p>}
          {result && (
            <div data-testid="result">
              <p className="text-sm mb-4">
                共 <strong>{result.total_steps}</strong> 步，粗估{' '}
                <strong>{result.estimated_days}</strong> 天完成
                {result.gold_plus && '（已計入 Gold Plus -15%）'}
              </p>
              <ol className="space-y-2 text-sm max-h-[500px] overflow-y-auto">
                {result.build_sequence.map((s) => (
                  <li
                    key={s.step}
                    className="border-l-2 border-blue-500 pl-3 py-1"
                  >
                    <div className="font-mono text-xs text-muted-foreground">
                      Step {s.step} · {s.action}
                    </div>
                    <div className="font-semibold">
                      {s.target}
                      {s.from_level !== null && s.to_level !== null && (
                        <span>
                          {' '}
                          Lv {s.from_level} → Lv {s.to_level}
                        </span>
                      )}
                    </div>
                    {s.reason && (
                      <div className="text-xs text-muted-foreground">
                        {s.reason}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

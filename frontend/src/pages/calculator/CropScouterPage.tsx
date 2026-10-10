import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  CropScouterRequest,
  CropScouterResponse,
} from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'

export default function CropScouterPage() {
  const [form, setForm] = useState<CropScouterRequest>({
    wood_production: 0,
    clay_production: 0,
    iron_production: 0,
    crop_production: 0,
    population: 0,
    server_speed: 1,
  })
  const [result, setResult] = useState<CropScouterResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof CropScouterRequest, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateCropScouter(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">首都類型反推</h1>
      <p className="text-muted-foreground mb-6">
        輸入偵查到的對手每小時資源產量，估算其首都類型（15c / 9c / 7c / 6c /
        4446 / 3347）。用糧食和其他三種資源產量的比例來推測。
      </p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">偵查資料</h2>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ['wood_production', '木材 / 小時', 'wood'],
                ['clay_production', '磚塊 / 小時', 'clay'],
                ['iron_production', '鐵礦 / 小時', 'iron'],
                ['crop_production', '糧食 / 小時', 'crop'],
                ['population', '人口數', 'population'],
              ] as const
            ).map(([key, label, testId]) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <input
                  type="number"
                  data-testid={testId}
                  min={0}
                  value={form[key]}
                  onChange={(e) => handleChange(key, Number(e.target.value) || 0)}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
            ))}
          </div>

          <Button
            data-testid="submit"
            className="mt-4"
            disabled={loading}
            onClick={handleCalculate}
          >
            {loading ? '計算中…' : '反推首都類型'}
          </Button>

          {error && (
            <p className="text-red-600 mt-3" data-testid="error">
              {error}
            </p>
          )}
        </div>

        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">可能性排序</h2>
          {!result && <p className="text-muted-foreground">尚未計算</p>}
          {result && (
            <div data-testid="result">
              <p className="text-sm mb-2">
                主要資源：<strong>{result.dominant_resource}</strong>
              </p>
              <p className="text-sm mb-4 text-muted-foreground">
                木:穀 比例 {result.wood_to_crop_ratio}
              </p>
              <ul className="space-y-3">
                {result.matches.map((m, i) => (
                  <li
                    key={i}
                    className="border-l-4 border-blue-500 pl-3 py-1"
                  >
                    <div className="font-bold text-lg">{m.cropper_type}</div>
                    <div className="text-sm text-muted-foreground">
                      信心 {(m.likelihood * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm mt-1">{m.reasoning}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

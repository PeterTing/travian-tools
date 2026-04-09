import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  CulturePointsRequest,
  CulturePointsResponse,
} from '@/services/advancedCalculatorApi'

export default function CulturePointsCalculatorPage() {
  const [form, setForm] = useState<CulturePointsRequest>({
    current_culture_points: 0,
    cp_production_per_day: 500,
    current_villages: 1,
  })
  const [result, setResult] = useState<CulturePointsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof CulturePointsRequest, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateCulturePoints(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">文化點計算器</h1>
      <p className="text-muted-foreground mb-6">
        計算開設各村莊所需的文化點及預估日期。
      </p>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">當前文化點</label>
          <input
            type="number"
            min={0}
            value={form.current_culture_points}
            onChange={(e) => handleChange('current_culture_points', Number(e.target.value))}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">每日文化點產量</label>
          <input
            type="number"
            min={0}
            value={form.cp_production_per_day}
            onChange={(e) => handleChange('cp_production_per_day', Number(e.target.value))}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">當前村莊數</label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.current_villages}
            onChange={(e) => handleChange('current_villages', Number(e.target.value))}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
      </div>

      <Button onClick={handleCalculate} disabled={loading} className="mb-6">
        {loading ? '計算中...' : '計算'}
      </Button>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {result && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left">村莊</th>
                <th className="p-3 text-right">所需文化點</th>
                <th className="p-3 text-right">還差</th>
                <th className="p-3 text-right">需要天數</th>
                <th className="p-3 text-left">預計日期</th>
              </tr>
            </thead>
            <tbody>
              {result.villages.map((v) => (
                <tr
                  key={v.village_number}
                  className={
                    v.village_number <= (form.current_villages ?? 1)
                      ? 'bg-green-50 dark:bg-green-950'
                      : v.cp_remaining === 0
                        ? 'bg-blue-50 dark:bg-blue-950'
                        : ''
                  }
                >
                  <td className="p-3 font-medium">
                    第 {v.village_number} 村
                    {v.village_number <= (form.current_villages ?? 1) && (
                      <span className="ml-2 text-green-600 text-xs">已擁有</span>
                    )}
                  </td>
                  <td className="p-3 text-right">{v.cp_required.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {v.cp_remaining > 0 ? v.cp_remaining.toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-right">
                    {v.days_until !== null && v.days_until > 0
                      ? `${v.days_until} 天`
                      : v.days_until === 0
                        ? '-'
                        : v.days_until === null
                          ? '需要產量'
                          : '-'}
                  </td>
                  <td className="p-3">{v.date ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

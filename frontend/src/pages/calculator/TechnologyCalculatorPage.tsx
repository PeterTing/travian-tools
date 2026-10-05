import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { TechnologyRequest, TechnologyResponse } from '@/services/advancedCalculatorApi'

const TRIBES = [
  { value: 'romans', label: '羅馬' },
  { value: 'teutons', label: '條頓' },
  { value: 'gauls', label: '高盧' },
  { value: 'huns', label: '匈奴' },
  { value: 'egyptians', label: '埃及' },
  { value: 'vikings', label: '維京' },
  { value: 'spartans', label: '斯巴達' },
]

export default function TechnologyCalculatorPage() {
  const [form, setForm] = useState<TechnologyRequest>({
    tribe: 'romans',
    research_levels: [0, 5, 10, 15, 20],
  })
  const [result, setResult] = useState<TechnologyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateTechnology(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">科技計算器</h1>
      <p className="text-muted-foreground mb-6">
        查看各研究等級下兵種的攻防數值變化。公式：base * 1.015^level
      </p>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">部族</label>
          <select
            value={form.tribe}
            onChange={(e) => setForm((prev) => ({ ...prev, tribe: e.target.value }))}
            className="p-2 border rounded bg-background"
          >
            {TRIBES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleCalculate} disabled={loading}>
          {loading ? '計算中...' : '計算'}
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {result && result.troops.length > 0 && (
        <div className="space-y-6">
          {/* Attack Table */}
          <div>
            <h3 className="text-lg font-semibold mb-2">攻擊力</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        Lv {lv}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name}</td>
                      {troop.attack_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defense Infantry Table */}
          <div>
            <h3 className="text-lg font-semibold mb-2">步兵防禦</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        Lv {lv}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name}</td>
                      {troop.defense_infantry_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defense Cavalry Table */}
          <div>
            <h3 className="text-lg font-semibold mb-2">騎兵防禦</h3>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        Lv {lv}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name}</td>
                      {troop.defense_cavalry_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { PathSpeedTsRequest, PathSpeedTsResponse } from '@/services/advancedCalculatorApi'

export default function PathSpeedTsCalculatorPage() {
  const [form, setForm] = useState<PathSpeedTsRequest>({
    attacker_x: 0,
    attacker_y: 0,
    target_x: 0,
    target_y: 0,
    travel_time_seconds: 3600,
    server_speed: 1,
  })
  const [timeInput, setTimeInput] = useState({ hours: 1, minutes: 0, seconds: 0 })
  const [result, setResult] = useState<PathSpeedTsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof PathSpeedTsRequest, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleTimeChange = (field: 'hours' | 'minutes' | 'seconds', value: number) => {
    const newTime = { ...timeInput, [field]: value }
    setTimeInput(newTime)
    setForm((prev) => ({
      ...prev,
      travel_time_seconds: newTime.hours * 3600 + newTime.minutes * 60 + newTime.seconds,
    }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculatePathSpeedTs(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">TS 反推計算器</h1>
      <p className="text-muted-foreground mb-6">
        根據已知的攻擊者座標、目標座標和行進時間，反推可能的部隊速度和競技場等級組合。
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">已知條件</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">攻擊者 X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.attacker_x}
                onChange={(e) => handleChange('attacker_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">攻擊者 Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.attacker_y}
                onChange={(e) => handleChange('attacker_y', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">目標 X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.target_x}
                onChange={(e) => handleChange('target_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">目標 Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.target_y}
                onChange={(e) => handleChange('target_y', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">已知行進時間</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">時</label>
                <input
                  type="number"
                  min={0}
                  value={timeInput.hours}
                  onChange={(e) => handleTimeChange('hours', Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">分</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={timeInput.minutes}
                  onChange={(e) => handleTimeChange('minutes', Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">秒</label>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={timeInput.seconds}
                  onChange={(e) => handleTimeChange('seconds', Number(e.target.value))}
                  className="w-full p-2 border rounded bg-background"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              總計 {form.travel_time_seconds.toLocaleString()} 秒
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">伺服器速度</label>
            <select
              value={form.server_speed}
              onChange={(e) => handleChange('server_speed', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
            </select>
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? '計算中...' : '反推速度 + TS'}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">可能的匹配</h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <span className="text-sm text-muted-foreground">計算距離</span>
                <p className="text-xl font-bold">{result.distance} 格</p>
              </div>

              {result.possible_matches.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="p-3 text-left">速度</th>
                        <th className="p-3 text-left">TS 等級</th>
                        <th className="p-3 text-left">計算行進時間</th>
                        <th className="p-3 text-left">可能兵種</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.possible_matches.map((match, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-3 font-medium">{match.unit_speed}</td>
                          <td className="p-3">{match.tournament_square_level}</td>
                          <td className="p-3">{match.calculated_travel_time_formatted}</td>
                          <td className="p-3 text-xs">
                            {match.possible_units.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  在 +-30 秒容差內無匹配結果
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              輸入座標和行進時間後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

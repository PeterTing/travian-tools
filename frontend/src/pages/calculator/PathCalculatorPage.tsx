import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { PathCalculatorRequest, PathCalculatorResponse } from '@/services/advancedCalculatorApi'

export default function PathCalculatorPage() {
  const [form, setForm] = useState<PathCalculatorRequest>({
    start_x: 0,
    start_y: 0,
    target_x: 0,
    target_y: 0,
    unit_speed: 7,
    tournament_square_level: 0,
    hero_bonus: 0,
    artifact_bonus: 'none',
    server_speed: 1,
  })
  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setForm((prev) => ({ ...prev, server_speed: currentAccount.server_speed }))
    }
  }, [currentAccount])
  const [result, setResult] = useState<PathCalculatorResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof PathCalculatorRequest, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculatePath(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">路徑計算器</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">參數設定</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">起始 X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.start_x}
                onChange={(e) => handleChange('start_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">起始 Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.start_y}
                onChange={(e) => handleChange('start_y', Number(e.target.value))}
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
            <label className="block text-sm font-medium mb-2">部隊速度（格/小時）</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.unit_speed}
              onChange={(e) => handleChange('unit_speed', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">競技場等級</label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.tournament_square_level}
              onChange={(e) => handleChange('tournament_square_level', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">英雄速度加成 (%)</label>
            <select
              value={form.hero_bonus}
              onChange={(e) => handleChange('hero_bonus', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            >
              <option value={0}>無</option>
              <option value={25}>25%</option>
              <option value={50}>50%</option>
              <option value={75}>75%</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">神器加成</label>
            <select
              value={form.artifact_bonus}
              onChange={(e) => handleChange('artifact_bonus', e.target.value)}
              className="w-full p-2 border rounded bg-background"
            >
              <option value="none">無</option>
              <option value="account_1_5x">帳號級 1.5x</option>
              <option value="unique_2x">唯一 2x</option>
              <option value="village_2x">村莊 2x</option>
            </select>
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
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          <Button onClick={handleCalculate} disabled={loading} className="w-full">
            {loading ? '計算中...' : '計算'}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">計算結果</h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">距離</span>
                    <p className="text-2xl font-bold">{result.distance} 格</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">有效速度</span>
                    <p className="text-2xl font-bold">{result.arrival_speed} 格/時</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-primary/10 rounded text-center">
                <span className="text-sm text-muted-foreground">行進時間</span>
                <p className="text-3xl font-bold text-primary">
                  {result.travel_time_formatted}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ({result.travel_time_seconds.toLocaleString()} 秒)
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              輸入座標和速度後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

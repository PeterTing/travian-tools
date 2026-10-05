import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { SaveTroopsRequest, SaveTroopsResponse } from '@/services/advancedCalculatorApi'

export default function SaveTroopsCalculatorPage() {
  const [form, setForm] = useState<SaveTroopsRequest>({
    village_x: 0,
    village_y: 0,
    unit_speed: 7,
    offline_hours: 8,
    server_speed: 1,
    tournament_square_level: 0,
  })
  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setForm((prev) => ({ ...prev, server_speed: currentAccount.server_speed }))
    }
  }, [currentAccount])
  const [result, setResult] = useState<SaveTroopsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof SaveTroopsRequest, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateSaveTroops(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">避兵計算器</h1>
      <p className="text-muted-foreground mb-6">
        計算部隊應派往多遠的距離，確保離線期間部隊在外安全。部隊會在離線期間往返，剛好在你上線時回來。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">參數設定</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">村莊 X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.village_x}
                onChange={(e) => handleChange('village_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">村莊 Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.village_y}
                onChange={(e) => handleChange('village_y', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">部隊速度（格/小時）</label>
            <input
              type="number"
              min={1}
              value={form.unit_speed}
              onChange={(e) => handleChange('unit_speed', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">離線時間（小時）</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.offline_hours}
              onChange={(e) => handleChange('offline_hours', Number(e.target.value))}
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
            {loading ? '計算中...' : '計算'}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">計算結果</h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded text-center">
                <span className="text-sm text-muted-foreground">理想派兵距離</span>
                <p className="text-3xl font-bold text-primary">
                  {result.ideal_distance} 格
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded text-center">
                  <span className="text-sm text-muted-foreground">單程時間</span>
                  <p className="text-xl font-bold">{result.send_time_formatted}</p>
                </div>
                <div className="p-4 bg-muted rounded text-center">
                  <span className="text-sm text-muted-foreground">來回時間</span>
                  <p className="text-xl font-bold">{result.return_time_formatted}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                找一個距離約 {result.ideal_distance} 格的空地或綠洲，向它發送偵察或增援，
                部隊就會在 {result.return_time_formatted} 後返回。
              </p>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              輸入部隊速度和離線時間後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

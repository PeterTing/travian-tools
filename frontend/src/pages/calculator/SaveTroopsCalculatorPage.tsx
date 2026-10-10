import { useState, useEffect } from 'react'
import RangeNumberField, { focusFirstInvalid } from '@/components/common/RangeNumberField'
import CoordPair from '@/components/common/CoordPair'
import { EMPTY_COORD, coordPairValue, type CoordText } from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { SaveTroopsRequest, SaveTroopsResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'

// 座標另外用文字存（預設空白、可打負號），按「計算」時才換成數字
type SaveTroopsForm = Omit<SaveTroopsRequest, 'village_x' | 'village_y'>

export default function SaveTroopsCalculatorPage() {
  const radius = useMapRadius()
  const [villageCoord, setVillageCoord] = useState<CoordText>(EMPTY_COORD)
  const [showCoordErrors, setShowCoordErrors] = useState(false)
  const [form, setForm] = useState<SaveTroopsForm>({
    unit_speed: 7,
    offline_hours: 8,
    server_speed: 1,
    tournament_square_level: 0,
    hero_bonus: 0,
  })
  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setForm((prev) => ({ ...prev, server_speed: currentAccount.server_speed }))
    }
  }, [currentAccount])
  const [result, setResult] = useState<SaveTroopsResponse | null>(null)
  // 結果是用哪一組輸入算的（灰標看這組）
  const [used, setUsed] = useState<SaveTroopsRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof SaveTroopsForm, value: number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    // 超出 0–75 的欄位：欄位下方已經寫「請輸入 0–75」，捲過去、不送出（P0-17 (j)）
    // 座標空白或超出範圍：欄位下方標紅字、捲過去，不送出（不會拿 0 去算）
    const xy = coordPairValue(villageCoord, radius)
    if (!xy) {
      setShowCoordErrors(true)
      setTimeout(() => focusFirstInvalid(document.querySelector('main')), 0)
      return
    }
    if (focusFirstInvalid(document.querySelector('main'))) return
    const req: SaveTroopsRequest = { ...form, village_x: xy.x, village_y: xy.y }
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateSaveTroops(req)
      setResult(res)
      setUsed(req)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  const saveKinds = used ? speedPendingKinds(used.tournament_square_level ?? 0, used.hero_bonus ?? 0) : []

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">躲兵</h1>
      <p className="text-muted-foreground mb-6">
        計算部隊應派往多遠的距離，確保離線期間部隊在外安全。部隊會在離線期間往返，剛好在你上線時回來。
      </p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">參數設定</h2>

          <CoordPair
            className="grid grid-cols-2 gap-4 mb-4"
            labelX="村莊 X"
            labelY="村莊 Y"
            testId="village"
            radius={radius}
            showErrors={showCoordErrors}
            value={villageCoord}
            onChange={setVillageCoord}
          />

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
            <Stepper
              labelStyle="form"
              label="競技場等級"
              value={form.tournament_square_level ?? 0}
              onChange={(v) => handleChange('tournament_square_level', v)}
              min={0}
              max={20}
            />
          </div>

          {/* 靴子跟競技場相加、只算超過 20 格（P0-21） */}
          <RangeNumberField
            className="mb-4"
            label="英雄靴子速度加成（%）"
            min={0}
            max={75}
            testId="save-boots"
            value={form.hero_bonus ?? 0}
            onChange={(v) => handleChange('hero_bonus', v)}
          />

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
          {/* 整區的數字（距離、時間、說明那句）都是同一份說明：一個灰標放在「計算結果」標題旁，說明在標題下面（P0-21 設計師） */}
          <div className="mb-4">
            <PendingRow fill data-testid="save-result-title">
              <h2 className="inline text-xl font-semibold">計算結果</h2>
              {saveKinds.length > 0 && <> <PendingVerifyChip kinds={saveKinds} /></>}
            </PendingRow>
          </div>

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
              <p className="text-sm text-muted-foreground" data-testid="save-distance-line">
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

import { useState, useEffect } from 'react'
import RangeNumberField, { focusFirstInvalid } from '@/components/common/RangeNumberField'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import ServerSpeedSelect from '@/components/common/ServerSpeedSelect'
import UnitSpeedSelect from '@/components/common/UnitSpeedSelect'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { SaveTroopsRequest, SaveTroopsResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import LevelSelect from '@/components/common/LevelSelect'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'

// 躲兵只看兵種速度和離線時間，村莊座標用不到（稽核 2026-10-10：之前有欄位但沒用）
type SaveTroopsForm = Omit<SaveTroopsRequest, 'village_x' | 'village_y'>

/** 離線時間選項（小時）：12 小時內每半小時，之後每小時到 48 */
// eslint-disable-next-line react-refresh/only-export-components
export const OFFLINE_HOUR_OPTIONS: number[] = [
  ...Array.from({ length: 24 }, (_, i) => (i + 1) / 2),
  ...Array.from({ length: 36 }, (_, i) => i + 13),
]

function hoursLabel(h: number): string {
  const whole = Math.floor(h)
  return h % 1 ? (whole ? `${whole} 小時 30 分` : '30 分') : `${h} 小時`
}

export default function SaveTroopsCalculatorPage() {
  const [form, setForm] = useState<SaveTroopsForm>({
    unit_speed: 7,
    offline_hours: 8,
    server_speed: 1,
    tournament_square_level: 0,
    hero_bonus: 0,
  })
  // 伺服器速度跟「已帶入」列（含這頁的「更改」）
  const fill = useAutoFill()
  useEffect(() => {
    setForm((prev) => ({ ...prev, server_speed: fill.speed }))
  }, [fill.speed])
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
    if (focusFirstInvalid(document.querySelector('main'))) return
    const req: SaveTroopsRequest = { ...form }
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
        離線期間讓部隊在路上：算出要派到多遠，去程加回程剛好等於離線時間。
      </p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">參數設定</h2>

          {/* 兵種從下拉選，速度從兵種資料來（不用自己打） */}
          <UnitSpeedSelect
            className="mb-4 block text-sm font-medium"
            label="兵種（最慢的那種）"
            testId="save-unit"
            defaultTribe={fill.tribe}
            onChange={(v) => handleChange('unit_speed', v)}
          />

          <label className="mb-4 block text-sm font-medium">
            <span className="mb-2 block">離線時間</span>
            <select
              data-testid="save-offline-hours"
              value={form.offline_hours}
              onChange={(e) => handleChange('offline_hours', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            >
              {OFFLINE_HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>{hoursLabel(h)}</option>
              ))}
            </select>
          </label>

          <div className="mb-4">
            <LevelSelect
              labelStyle="form"
              buildingId="tournament_square"
              testId="save-ts-level"
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
            <ServerSpeedSelect value={form.server_speed ?? 1} onChange={(v) => handleChange('server_speed', v)} testId="save-server-speed" />
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
                  <span className="text-sm text-muted-foreground">去程時間</span>
                  <p className="text-xl font-bold">{result.send_time_formatted}</p>
                </div>
                <div className="p-4 bg-muted rounded text-center">
                  <span className="text-sm text-muted-foreground">去回總共</span>
                  <p className="text-xl font-bold">{result.return_time_formatted}</p>
                </div>
              </div>
              {/* 只寫算得出來的數字：去程、去回總共。派什麼任務、部隊會不會自己回來，沒有官方出處，不寫（稽核 2026-10-10，PM） */}
              <p className="text-sm text-muted-foreground" data-testid="save-distance-line">
                目標離你約 {result.ideal_distance} 格：去程 {result.send_time_formatted}，去回總共 {result.return_time_formatted}。
              </p>
              {result.exceeds_map && (
                <p role="alert" className="text-sm text-red-600" data-testid="save-exceeds-map">
                  地圖上最遠只有約 {result.max_map_distance} 格，走不了這麼遠；請把離線時間分段，或換慢一點的兵種。
                </p>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              選好兵種和離線時間後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

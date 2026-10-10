import { useState, useEffect } from 'react'
import RangeNumberField, { focusFirstInvalid } from '@/components/common/RangeNumberField'
import CoordPair from '@/components/common/CoordPair'
import { EMPTY_COORD, coordPairValue, type CoordText } from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { Button } from '@/components/ui/button'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { PathSpeedTsRequest, PathSpeedTsResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { speedPendingKinds } from '@/lib/pendingNotes'

/** 可能兵種：後端有中文名就用中文（含部族），舊後端只有英文時退回英文 */
function unitNames(match: { possible_units: string[]; possible_units_zh?: string[] }): string[] {
  return match.possible_units_zh?.length ? match.possible_units_zh : match.possible_units
}

/** 秒數 → 遊戲裡的「H:MM:SS」 */
function formatHms(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const x = sec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`
}

// 座標另外用文字存（預設空白、可打負號），按「計算」時才換成數字
type PathSpeedTsForm = Omit<PathSpeedTsRequest, 'attacker_x' | 'attacker_y' | 'target_x' | 'target_y'>

export default function PathSpeedTsCalculatorPage() {
  const radius = useMapRadius()
  const [attackerCoord, setAttackerCoord] = useState<CoordText>(EMPTY_COORD)
  const [targetCoord, setTargetCoord] = useState<CoordText>(EMPTY_COORD)
  const [showCoordErrors, setShowCoordErrors] = useState(false)
  const [form, setForm] = useState<PathSpeedTsForm>({
    travel_time_seconds: 3600,
    server_speed: 1,
    hero_bonus: 0,
  })
  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setForm((prev) => ({ ...prev, server_speed: currentAccount.server_speed }))
    }
  }, [currentAccount])
  const [timeInput, setTimeInput] = useState({ hours: 1, minutes: 0, seconds: 0 })
  const [result, setResult] = useState<PathSpeedTsResponse | null>(null)
  // 結果是用哪個靴子 % 算的（灰標看這個）
  const [usedBoots, setUsedBoots] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof PathSpeedTsForm, value: number) => {
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
    // 超出 0–75 的欄位：欄位下方已經寫「請輸入 0–75」，捲過去、不送出（P0-17 (j)）
    // 座標空白或超出範圍：欄位下方標紅字、捲過去，不送出（不會拿 0 去算）
    const atk = coordPairValue(attackerCoord, radius)
    const tgt = coordPairValue(targetCoord, radius)
    if (!atk || !tgt) {
      setShowCoordErrors(true)
      setTimeout(() => focusFirstInvalid(document.querySelector('main')), 0)
      return
    }
    if (focusFirstInvalid(document.querySelector('main'))) return
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculatePathSpeedTs({
        ...form,
        attacker_x: atk.x,
        attacker_y: atk.y,
        target_x: tgt.x,
        target_y: tgt.y,
      })
      setResult(res)
      setUsedBoots(form.hero_bonus ?? 0)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  // 20 格以內競技場／靴子不影響（S71），同一速度會出現 21 列一模一樣的時間：只留 0 級那列（P0-17 (h) 實測 390）
  const withinBase = (result?.distance ?? Infinity) <= 20
  const displayMatches = !result
    ? []
    : withinBase
      ? result.possible_matches.filter((m) => m.tournament_square_level === 0)
      : result.possible_matches

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">TS 反推計算器</h1>
      <p className="text-muted-foreground mb-6">
        根據已知的攻擊者座標、目標座標和行進時間，反推可能的部隊速度和競技場等級組合。
      </p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">已知條件</h2>

          <CoordPair
            className="grid grid-cols-2 gap-4 mb-4"
            labelX="攻擊者 X"
            labelY="攻擊者 Y"
            testId="attacker"
            radius={radius}
            showErrors={showCoordErrors}
            value={attackerCoord}
            onChange={setAttackerCoord}
          />

          <CoordPair
            className="grid grid-cols-2 gap-4 mb-4"
            labelX="目標 X"
            labelY="目標 Y"
            testId="target"
            radius={radius}
            showErrors={showCoordErrors}
            value={targetCoord}
            onChange={setTargetCoord}
          />

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

          {/* 攻擊方的英雄靴子：跟競技場相加、只算超過 20 格（P0-21） */}
          <RangeNumberField
            className="mb-4"
            label="英雄靴子速度加成（%）"
            min={0}
            max={75}
            testId="reverse-boots"
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

              {displayMatches.length > 0 ? (
                <>
                {/* ≥640 表格；390 寬改一組一張小卡（表格太擠：「TS 等級」一行一個字、時間斷行，P0-17 (h)） */}
                <div className="hidden overflow-hidden rounded-lg border sm:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="whitespace-nowrap p-3 text-left">速度</th>
                        <th className="whitespace-nowrap p-3 text-left">競技場等級</th>
                        <th className="whitespace-nowrap p-3 text-left">算出的行進時間</th>
                        <th className="p-3 text-left">可能兵種</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMatches.map((match) => {
                        // 待驗證：這一列有競技場或靴子時，時間用了官方說明頁的公式（一列一個，P0-21）
                        const kinds = speedPendingKinds(match.tournament_square_level, usedBoots)
                        return (
                          <PendingRow as="tr" tableColSpan={4} key={`${match.unit_speed}-${match.tournament_square_level}`} className="border-t">
                            <td className="p-3 font-medium">{match.unit_speed}</td>
                            <td className="p-3">{match.tournament_square_level}</td>
                            <td className="whitespace-nowrap p-3" data-testid="reverse-travel">
                              {formatHms(match.calculated_travel_time_seconds)}
                              {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                            </td>
                            <td className="p-3">
                              {unitNames(match).join('、')}
                            </td>
                          </PendingRow>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {withinBase && (
                  <p className="text-sm text-muted-foreground" data-testid="reverse-within-20">
                    20 格以內競技場和英雄靴子都不影響行進時間，只列出每種速度一次。
                  </p>
                )}
                <div className="space-y-2 sm:hidden" data-testid="reverse-cards">
                  {displayMatches.map((match) => {
                    const kinds = speedPendingKinds(match.tournament_square_level, usedBoots)
                    return (
                      <div key={`${match.unit_speed}-${match.tournament_square_level}`} className="min-w-0 rounded-md border p-3 text-sm" data-testid="reverse-card">
                        <PendingRow as="p" fill className="font-medium" data-testid="reverse-card-title">
                          速度 {match.unit_speed} · 競技場 {match.tournament_square_level} 級
                          {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                        </PendingRow>
                        <p className="mt-1 tabular-nums" data-testid="reverse-travel-card">行進 {formatHms(match.calculated_travel_time_seconds)}</p>
                        <p className="mt-1 text-muted-foreground">{unitNames(match).join('、')}</p>
                      </div>
                    )
                  })}
                </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  在 +-30 秒容差內無匹配結果
                </div>
              )}

              {(result.unverified_units?.length ?? 0) > 0 && (
                <PendingRow
                  as="p"
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                  data-testid="unverified-units-note"
                >
                  <PendingVerifyChip kind="spartanSpeed" />
                  <span>斯巴達兵種速度待驗證，未列入反推</span>
                </PendingRow>
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

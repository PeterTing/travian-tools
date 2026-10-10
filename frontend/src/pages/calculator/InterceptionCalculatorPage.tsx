import { useState, useEffect } from 'react'
import RangeNumberField, { focusFirstInvalid } from '@/components/common/RangeNumberField'
import { useCurrentAccount } from '@/contexts/CurrentAccountContext'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { InterceptionRequest, InterceptionResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import Stepper from '@/components/common/Stepper'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'

export default function InterceptionCalculatorPage() {
  const [form, setForm] = useState<InterceptionRequest>({
    attacker_x: 0,
    attacker_y: 0,
    defender_x: 0,
    defender_y: 0,
    attack_arrival_time: '12:00:00',
    attacker_speed: 7,
    catcher_x: 0,
    catcher_y: 0,
    catcher_speed: 10,
    server_speed: 1,
    catcher_ts_level: 0,
    catcher_hero_bonus: 0,
    attacker_ts_level: 0,
    attacker_hero_bonus: 0,
  })
  const { currentAccount } = useCurrentAccount()
  useEffect(() => {
    if (currentAccount?.server_speed) {
      setForm((prev) => ({ ...prev, server_speed: currentAccount.server_speed }))
    }
  }, [currentAccount])
  const [result, setResult] = useState<InterceptionResponse | null>(null)
  // 結果是用哪一組輸入算的（灰標看這組，不看還沒按「計算」的新輸入）
  const [used, setUsed] = useState<InterceptionRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof InterceptionRequest, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    // 超出 0–75 的欄位：欄位下方已經寫「請輸入 0–75」，捲過去、不送出（P0-17 (j)）
    if (focusFirstInvalid(document.querySelector('main'))) return
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateInterception(form)
      setResult(res)
      setUsed(form)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  const returnKinds = used ? speedPendingKinds(used.attacker_ts_level ?? 0, used.attacker_hero_bonus ?? 0) : []
  const catchKinds = used ? speedPendingKinds(used.catcher_ts_level ?? 0, used.catcher_hero_bonus ?? 0) : []
  // 發送時間用到兩邊：先攻方（回到家時間）、再攔截方（行進時間）。每一條前面寫是哪一方；
  // 兩方用到同一種加成時兩方都列出來，文字重複沒關係（PM＋設計師，P0-17）
  const sendKinds = [...returnKinds, ...catchKinds]
  const sendLabels = [...returnKinds.map(() => '攻方：'), ...catchKinds.map(() => '攔截方：')]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">攔截計算器</h1>
      <p className="text-muted-foreground mb-6">
        計算何時派出攔截部隊，在攻擊者回程時於其村莊攔截。
      </p>
      <CalcBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold">攻擊者村莊（敵方）</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">X</label>
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
              <label className="block text-sm font-medium mb-2">Y</label>
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

          <h2 className="text-xl font-semibold pt-2">被攻擊村莊</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.defender_x}
                onChange={(e) => handleChange('defender_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.defender_y}
                onChange={(e) => handleChange('defender_y', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">攻擊到達時間 (HH:MM:SS)</label>
            <input
              type="text"
              value={form.attack_arrival_time}
              onChange={(e) => handleChange('attack_arrival_time', e.target.value)}
              placeholder="12:00:00"
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">攻擊方部隊速度</label>
            <input
              type="number"
              min={1}
              value={form.attacker_speed}
              onChange={(e) => handleChange('attacker_speed', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          {/* 攻擊方回程也照共用行軍公式：競技場、靴子只加快超過 20 格的路段（P0-21） */}
          <div>
            <Stepper
              labelStyle="form"
              label="攻方競技場等級"
              value={form.attacker_ts_level ?? 0}
              onChange={(v) => handleChange('attacker_ts_level', v)}
              min={0}
              max={20}
            />
          </div>

          <RangeNumberField
            label="攻方英雄靴子速度加成（%）"
            min={0}
            max={75}
            testId="attacker-boots"
            value={form.attacker_hero_bonus ?? 0}
            onChange={(v) => handleChange('attacker_hero_bonus', v)}
          />

          <h2 className="text-xl font-semibold pt-2">攔截者村莊（你的）</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">X</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.catcher_x}
                onChange={(e) => handleChange('catcher_x', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Y</label>
              <input
                type="number"
                min={-200}
                max={200}
                value={form.catcher_y}
                onChange={(e) => handleChange('catcher_y', Number(e.target.value))}
                className="w-full p-2 border rounded bg-background"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">攔截部隊速度</label>
            <input
              type="number"
              min={1}
              value={form.catcher_speed}
              onChange={(e) => handleChange('catcher_speed', Number(e.target.value))}
              className="w-full p-2 border rounded bg-background"
            />
          </div>

          <div>
            <Stepper
              labelStyle="form"
              label="攔截方競技場等級"
              value={form.catcher_ts_level ?? 0}
              onChange={(v) => handleChange('catcher_ts_level', v)}
              min={0}
              max={20}
            />
          </div>

          <RangeNumberField
            label="攔截方英雄靴子速度加成（%）"
            min={0}
            max={75}
            testId="catcher-boots"
            value={form.catcher_hero_bonus ?? 0}
            onChange={(v) => handleChange('catcher_hero_bonus', v)}
          />

          <div>
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
            {loading ? '計算中...' : '計算攔截時間'}
          </Button>

          {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>

        {/* Result */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">計算結果</h2>

          {result ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                {/* 待驗證：攻擊方有競技場或靴子時，回程用了官方說明頁的公式（一行一個，P0-21） */}
                <PendingRow as="p" className="text-sm text-muted-foreground" data-testid="intercept-return-label">
                  攻擊者回到家時間
                  {returnKinds.length > 0 && <> <PendingVerifyChip kinds={returnKinds} /></>}
                </PendingRow>
                <p className="text-2xl font-bold">{result.attacker_return_time}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded text-center">
                {/* 發送時間 ＝ 回到家時間 − 攔截行進時間：灰標放標籤後面，點開依序列出攻擊方、攔截者用到的種類（P0-21 設計師） */}
                <PendingRow as="p" className="text-sm text-muted-foreground" data-testid="intercept-send-label">
                  你應該在此時發送攔截部隊
                  {sendKinds.length > 0 && <> <PendingVerifyChip kinds={sendKinds} labels={sendLabels} /></>}
                </PendingRow>
                <p className="text-3xl font-bold text-primary">{result.send_time}</p>
              </div>
              {/* 390 寬一欄：灰標的說明要有整張卡的寬度（窄格子撐滿的規則） */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="p-4 bg-muted rounded">
                  <PendingRow as="p" className="text-sm text-muted-foreground" data-testid="intercept-travel-label">
                    攔截行進時間
                    {catchKinds.length > 0 && <> <PendingVerifyChip kinds={catchKinds} /></>}
                  </PendingRow>
                  <p className="font-semibold">{result.travel_time_formatted}</p>
                </div>
                <div className="p-4 bg-muted rounded">
                  <span className="text-sm text-muted-foreground">與攻擊者距離</span>
                  <p className="font-semibold">{result.distance_to_attacker} 格</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              輸入攻防雙方座標及攔截者資訊後按「計算」
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  AttackerProfile,
  TsOptimizerRequest,
  TsOptimizerResponse,
} from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'

// 舊的「佯攻兵量」（目標人口 5% 的自編算法）已下架；
// 之後照攻略規則（19 步兵＋1 投石）併進 OP 規劃重寫，見 docs/TICKETS.md。
export default function AttackPlannerPage() {
  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-4">
      <h1 className="mb-2 text-xl font-bold">OP 規劃</h1>
      <p className="text-muted-foreground mb-6">
        TS 優化器：同步多個攻擊者對同一目標的抵達時間。
      </p>
      <CalcBar />

      <TsOptimizerForm />
    </div>
  )
}

// ─── TS Optimizer Form ───────────────────────────────────────────

function TsOptimizerForm() {
  const [target, setTarget] = useState({ x: 0, y: 0 })
  const [arrival, setArrival] = useState('2030-01-01T12:00:00+00:00')
  const [attackers, setAttackers] = useState<AttackerProfile[]>([
    {
      village_label: 'Hammer-1',
      x: 10,
      y: 0,
      unit_speed: 6,
      ts_level: 0,
      hero_bonus: 0,
      allow_ts_adjustment: true,
    },
  ])
  const [result, setResult] = useState<TsOptimizerResponse | null>(null)
  // 結果是用哪一組攻擊者算的（灰標看這組）
  const [usedAttackers, setUsedAttackers] = useState<AttackerProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addAttacker = () =>
    setAttackers([
      ...attackers,
      {
        village_label: `Hammer-${attackers.length + 1}`,
        x: 0,
        y: 0,
        unit_speed: 6,
        ts_level: 0,
        hero_bonus: 0,
        allow_ts_adjustment: true,
      },
    ])

  const updateAttacker = <K extends keyof AttackerProfile>(
    idx: number,
    field: K,
    value: AttackerProfile[K],
  ) => {
    setAttackers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    )
  }

  const removeAttacker = (idx: number) =>
    setAttackers(attackers.filter((_, i) => i !== idx))

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const req: TsOptimizerRequest = {
        target_x: target.x,
        target_y: target.y,
        target_arrival: arrival,
        attackers,
        wave_spacing_seconds: 1,
        server_speed: 1,
      }
      const res = await advancedCalculatorApi.calculateTsOptimizer(req)
      setResult(res)
      setUsedAttackers(attackers)
    } catch {
      setError('計算失敗，請檢查輸入與時間格式')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-w-0 rounded-lg border p-4 sm:p-6">
      {/* 390 寬：目標 X／Y 一列兩格，抵達時間獨占一列（原本三欄太窄） */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">目標 X</label>
          <input
            type="number"
            data-testid="target-x"
            value={target.x}
            onChange={(e) => setTarget({ ...target, x: Number(e.target.value) })}
            className="w-full min-w-0 p-2 border rounded bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">目標 Y</label>
          <input
            type="number"
            data-testid="target-y"
            value={target.y}
            onChange={(e) => setTarget({ ...target, y: Number(e.target.value) })}
            className="w-full min-w-0 p-2 border rounded bg-background"
          />
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <label className="block text-sm font-medium mb-2">
            希望抵達時間 (ISO 8601)
          </label>
          <input
            data-testid="arrival"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            className="w-full p-2 border rounded bg-background font-mono text-xs"
          />
        </div>
      </div>

      <h3 className="font-bold mb-2">攻擊者</h3>
      <div className="space-y-2 mb-3">
        {attackers.map((a, i) => (
          // 390 寬：每個攻擊者一張小卡、兩欄並附欄名；≥640 才排成一列七格
          <div key={i} className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-7 sm:border-0 sm:p-0" data-testid="attacker-row">
            <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
              <span className="sm:sr-only">標籤</span>
              <input
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="標籤"
                value={a.village_label}
                onChange={(e) => updateAttacker(i, 'village_label', e.target.value)}
              />
            </label>
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">X</span>
              <input
                type="number"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="X"
                value={a.x}
                onChange={(e) => updateAttacker(i, 'x', Number(e.target.value))}
              />
            </label>
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">Y</span>
              <input
                type="number"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="Y"
                value={a.y}
                onChange={(e) => updateAttacker(i, 'y', Number(e.target.value))}
              />
            </label>
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">速度</span>
              <input
                type="number"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="速度"
                value={a.unit_speed}
                onChange={(e) => updateAttacker(i, 'unit_speed', Number(e.target.value))}
              />
            </label>
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">TS lv</span>
              <input
                type="number"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="TS lv"
                min={0}
                max={20}
                value={a.ts_level}
                onChange={(e) => updateAttacker(i, 'ts_level', Number(e.target.value))}
              />
            </label>
            {/* 靴子跟競技場相加、只算超過 20 格（P0-21） */}
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">英雄靴子速度加成（%）</span>
              <input
                type="number"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-sm text-foreground sm:mt-0"
                placeholder="靴子 %"
                aria-label="英雄靴子速度加成（%）"
                data-testid="attacker-boots"
                min={0}
                max={75}
                value={a.hero_bonus ?? 0}
                onChange={(e) => updateAttacker(i, 'hero_bonus', Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="min-h-[44px] self-end rounded border p-2 text-sm text-red-600"
              data-testid="attack-remove"
              onClick={() => removeAttacker(i)}
              disabled={attackers.length <= 1}
            >
              移除
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <Button variant="outline" onClick={addAttacker}>
          + 加攻擊者
        </Button>
        <Button
          data-testid="ts-submit"
          disabled={loading}
          onClick={handleCalculate}
        >
          {loading ? '計算中…' : '計算發兵時間'}
        </Button>
      </div>

      {error && (
        <p className="text-red-600" data-testid="error">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4" data-testid="ts-result">
          {result.warnings.length > 0 && (
            <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm">
              {result.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}
          {/* ≥640 表格；390 寬改一攻擊者一張小卡（表格要橫向捲動，灰標說明會被切掉） */}
          <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">村莊</th>
                <th className="border p-2 text-left">距離</th>
                <th className="border p-2 text-left">建議 TS</th>
                <th className="border p-2 text-left">發兵時間</th>
                <th className="border p-2 text-left">行進時間</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r) => {
                // 待驗證：這一列的攻擊者有競技場或靴子時，行進時間用了官方說明頁的公式（一列一個，P0-21）
                const atk = usedAttackers.find((a) => a.village_label === r.village_label)
                const kinds = speedPendingKinds(atk?.ts_level ?? r.recommended_ts_level, atk?.hero_bonus ?? 0)
                return (
                  // 列高 ≥ 44（p-3）：上下兩列灰標的點擊範圍（44×44）才不會疊在一起
                  <PendingRow as="tr" tableColSpan={5} key={r.village_label}>
                    <td className="border p-3">{r.village_label}</td>
                    <td className="border p-3">{r.distance}</td>
                    <td className="border p-3">{r.recommended_ts_level}</td>
                    <td className="border p-3 font-mono text-xs">{r.send_time}</td>
                    <td className="border p-3" data-testid="ts-travel">
                      {r.travel_time_formatted}
                      {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                    </td>
                  </PendingRow>
                )
              })}
            </tbody>
          </table>
          </div>
          <div className="space-y-2 sm:hidden" data-testid="ts-result-cards">
            {result.results.map((r) => {
              const atk = usedAttackers.find((a) => a.village_label === r.village_label)
              const kinds = speedPendingKinds(atk?.ts_level ?? r.recommended_ts_level, atk?.hero_bonus ?? 0)
              return (
                <div key={r.village_label} className="min-w-0 rounded-md border p-3 text-sm">
                  <p className="font-medium">{r.village_label}</p>
                  <p className="text-muted-foreground">距離 {r.distance} · 建議 TS {r.recommended_ts_level}</p>
                  <p className="mt-1 break-all font-mono text-xs">發兵 {r.send_time}</p>
                  <PendingRow as="p" className="mt-1" data-testid="ts-travel-card">
                    行進 {r.travel_time_formatted}
                    {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                  </PendingRow>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

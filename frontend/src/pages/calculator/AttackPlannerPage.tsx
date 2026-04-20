import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  AttackerProfile,
  TsOptimizerRequest,
  TsOptimizerResponse,
  FakeTroopsRequest,
  FakeTroopsResponse,
} from '@/services/advancedCalculatorApi'

type Mode = 'ts' | 'fake'

export default function AttackPlannerPage() {
  const [mode, setMode] = useState<Mode>('ts')

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">攻擊規劃器</h1>
      <p className="text-muted-foreground mb-6">
        TS 優化器同步多個攻擊者對一目標抵達時間；佯攻兵量計算器算出看起來像真打的最小兵力。
      </p>

      <div className="flex gap-0 mb-6">
        <button
          data-testid="mode-ts"
          className={`px-4 py-2 rounded-l border ${
            mode === 'ts'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background'
          }`}
          onClick={() => setMode('ts')}
        >
          TS 優化器
        </button>
        <button
          data-testid="mode-fake"
          className={`px-4 py-2 rounded-r border-t border-r border-b ${
            mode === 'fake'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background'
          }`}
          onClick={() => setMode('fake')}
        >
          佯攻兵量
        </button>
      </div>

      {mode === 'ts' ? <TsOptimizerForm /> : <FakeTroopsForm />}
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
      allow_ts_adjustment: true,
    },
  ])
  const [result, setResult] = useState<TsOptimizerResponse | null>(null)
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
    } catch {
      setError('計算失敗，請檢查輸入與時間格式')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">目標 X</label>
          <input
            type="number"
            data-testid="target-x"
            value={target.x}
            onChange={(e) => setTarget({ ...target, x: Number(e.target.value) })}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">目標 Y</label>
          <input
            type="number"
            data-testid="target-y"
            value={target.y}
            onChange={(e) => setTarget({ ...target, y: Number(e.target.value) })}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
        <div>
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
          <div key={i} className="grid grid-cols-6 gap-2">
            <input
              className="p-2 border rounded bg-background text-sm"
              placeholder="標籤"
              value={a.village_label}
              onChange={(e) => updateAttacker(i, 'village_label', e.target.value)}
            />
            <input
              type="number"
              className="p-2 border rounded bg-background text-sm"
              placeholder="X"
              value={a.x}
              onChange={(e) => updateAttacker(i, 'x', Number(e.target.value))}
            />
            <input
              type="number"
              className="p-2 border rounded bg-background text-sm"
              placeholder="Y"
              value={a.y}
              onChange={(e) => updateAttacker(i, 'y', Number(e.target.value))}
            />
            <input
              type="number"
              className="p-2 border rounded bg-background text-sm"
              placeholder="速度"
              value={a.unit_speed}
              onChange={(e) =>
                updateAttacker(i, 'unit_speed', Number(e.target.value))
              }
            />
            <input
              type="number"
              className="p-2 border rounded bg-background text-sm"
              placeholder="TS lv"
              min={0}
              max={20}
              value={a.ts_level}
              onChange={(e) =>
                updateAttacker(i, 'ts_level', Number(e.target.value))
              }
            />
            <button
              className="p-2 border rounded text-red-600 text-sm"
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
              {result.results.map((r) => (
                <tr key={r.village_label}>
                  <td className="border p-2">{r.village_label}</td>
                  <td className="border p-2">{r.distance}</td>
                  <td className="border p-2">{r.recommended_ts_level}</td>
                  <td className="border p-2 font-mono text-xs">{r.send_time}</td>
                  <td className="border p-2">{r.travel_time_formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Fake Troops Form ────────────────────────────────────────────

const TRIBES = [
  'romans',
  'teutons',
  'gauls',
  'huns',
  'egyptians',
  'spartans',
  'vikings',
] as const

function FakeTroopsForm() {
  const [form, setForm] = useState<FakeTroopsRequest>({
    target_population: 500,
    attacker_tribe: 'romans',
    include_catapults: true,
    include_rams: true,
  })
  const [result, setResult] = useState<FakeTroopsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateFakeTroops(form)
      setResult(res)
    } catch {
      setError('計算失敗')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">目標人口</label>
            <input
              type="number"
              data-testid="pop"
              min={0}
              value={form.target_population}
              onChange={(e) =>
                setForm({ ...form, target_population: Number(e.target.value) || 0 })
              }
              className="w-full p-2 border rounded bg-background"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">攻擊方種族</label>
            <select
              data-testid="tribe"
              value={form.attacker_tribe}
              onChange={(e) =>
                setForm({ ...form, attacker_tribe: e.target.value })
              }
              className="w-full p-2 border rounded bg-background"
            >
              {TRIBES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.include_catapults}
                onChange={(e) =>
                  setForm({ ...form, include_catapults: e.target.checked })
                }
              />
              含催化彈
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.include_rams}
                onChange={(e) =>
                  setForm({ ...form, include_rams: e.target.checked })
                }
              />
              含破城槌
            </label>
          </div>
          <Button
            data-testid="fake-submit"
            disabled={loading}
            onClick={handleCalculate}
          >
            {loading ? '計算中…' : '計算佯攻兵量'}
          </Button>

          {error && (
            <p className="text-red-600 mt-3" data-testid="error">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div data-testid="fake-result" className="space-y-2">
            <h3 className="font-bold mb-2">建議佯攻組成</h3>
            <p>步兵 (infantry): {result.min_infantry}</p>
            <p>騎兵 (cavalry): {result.min_cavalry}</p>
            <p>催化彈: {result.min_catapults}</p>
            <p>破城槌: {result.min_rams}</p>
            <p className="font-bold mt-3 pt-2 border-t">
              人口成本: {result.total_population_cost}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {result.reasoning}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

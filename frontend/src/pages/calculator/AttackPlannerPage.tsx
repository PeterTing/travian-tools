import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import RangeNumberField, { focusFirstInvalid } from '@/components/common/RangeNumberField'
import CoordPair from '@/components/common/CoordPair'
import { EMPTY_COORD, coordPairValue, type CoordText } from '@/lib/coords'
import { useMapRadius } from '@/lib/mapRadius'
import LevelSelect from '@/components/common/LevelSelect'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type {
  AttackerProfile,
  TsOptimizerRequest,
  TsOptimizerResponse,
} from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { speedPendingKinds } from '@/lib/pendingNotes'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { UNIT_SPEED_TRIBES, tribeUnitSpeeds, type SpeedTribeId } from '@/data/unitSpeeds'
import { ingameUnitName } from '@/lib/ingameNames'
import { formatLocalMonthDayTime, parseLocalDateTimeInput, toLocalDateTimeInput, localZoneLabel } from '@/lib/serverTime'

// 舊的「佯攻兵量」（目標人口 5% 的自編算法）已下架；
// 之後照攻略規則（19 步兵＋1 投石）併進 OP 規劃重寫，見 docs/TICKETS.md。
export default function AttackPlannerPage() {
  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-4">
      <h1 className="mb-2 text-xl font-bold">OP 規劃</h1>
      <p className="text-muted-foreground mb-6">
        多個村莊打同一個目標：照你排的順序，第 1 波準時到，之後每波晚「間隔」秒到。
        發兵時間已經過了的村莊，會找出最低要幾級競技場才趕得上。
      </p>
      <CalcBar />

      <TsOptimizerForm />
    </div>
  )
}

// ─── TS Optimizer Form ───────────────────────────────────────────

/** 需要的競技場：目前等級來得及就是目前等級；來不及寫「要升到 N 級」；20 級也不行寫「20 級也來不及」 */
function tsLevelText(r: TsOptimizerResponse['results'][number]): string {
  if (r.unreachable) return '20 級也來不及'
  if (r.ts_level_changed) return `要升到 ${r.recommended_ts_level} 級`
  return `${r.recommended_ts_level} 級`
}

// 每個攻擊者一個穩定 id（React key、結果對回攻擊者都用它；兩個攻擊者同名也不會對錯人，P0-17 (i)）
// 座標用文字存（預設空白、可打負號），送出時才換成數字
type AttackerFields = Omit<AttackerProfile, 'x' | 'y'>
type AttackerRow = AttackerFields & { attacker_id: string; coord: CoordText; unit_id: string }
let nextAttackerId = 1
const newAttackerId = () => `atk-${nextAttackerId++}`

/** 預設抵達時間：明天這個整點（本地時區） */
function defaultArrival(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setMinutes(0, 0, 0)
  return toLocalDateTimeInput(d)
}

function TsOptimizerForm() {
  const { speed, tribe } = useAutoFill()
  // 兵種從下拉選（同帳號的部族），速度從兵種資料來，不用自己打數字
  const speedTribe: SpeedTribeId = tribe && (UNIT_SPEED_TRIBES as string[]).includes(tribe) ? (tribe as SpeedTribeId) : 'romans'
  const units = useMemo(() => tribeUnitSpeeds(speedTribe).filter((u) => u.speed != null), [speedTribe])
  const unitLabel = (feId: string) => ingameUnitName(speedTribe, feId) ?? units.find((u) => u.feId === feId)?.stats?.nameZh ?? feId
  const defaultUnit = units[0]
  const radius = useMapRadius()
  const [target, setTarget] = useState<CoordText>(EMPTY_COORD)
  // 按過「計算」：空白的座標格也標紅
  const [showCoordErrors, setShowCoordErrors] = useState(false)
  const [arrival, setArrival] = useState(defaultArrival)
  // 波次間隔（秒）：第 n 波比第 1 波晚 n×間隔 到
  const [spacing, setSpacing] = useState(1)
  const [attackers, setAttackers] = useState<AttackerRow[]>(() => [
    {
      attacker_id: newAttackerId(),
      village_label: '攻擊者 1',
      coord: EMPTY_COORD,
      unit_id: defaultUnit?.feId ?? '',
      unit_speed: defaultUnit?.speed ?? 6,
      ts_level: 0,
      hero_bonus: 0,
      allow_ts_adjustment: true,
    },
  ])
  const [result, setResult] = useState<TsOptimizerResponse | null>(null)
  // 結果是用哪一組攻擊者算的（灰標看這組）
  const [usedAttackers, setUsedAttackers] = useState<AttackerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addAttacker = () =>
    setAttackers([
      ...attackers,
      {
        attacker_id: newAttackerId(),
        village_label: `攻擊者 ${attackers.length + 1}`,
        coord: EMPTY_COORD,
        unit_id: defaultUnit?.feId ?? '',
        unit_speed: defaultUnit?.speed ?? 6,
        ts_level: 0,
        hero_bonus: 0,
        allow_ts_adjustment: true,
      },
    ])

  const updateAttacker = <K extends Exclude<keyof AttackerRow, 'attacker_id'>>(
    idx: number,
    field: K,
    value: AttackerRow[K],
  ) => {
    setAttackers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)),
    )
  }

  const removeAttacker = (idx: number) =>
    setAttackers(attackers.filter((_, i) => i !== idx))

  const handleCalculate = async () => {
    // 超出 0–75 的欄位：欄位下方已經寫「請輸入 0–75」，捲過去、不送出（P0-17 (j)）
    // 座標空白或超出範圍：欄位下方標紅字、捲過去，不送出（不會拿 0 去算）
    const targetXY = coordPairValue(target, radius)
    const attackerXY = attackers.map((a) => coordPairValue(a.coord, radius))
    if (!targetXY || attackerXY.some((c) => c == null)) {
      setShowCoordErrors(true)
      setTimeout(() => focusFirstInvalid(document.querySelector('main')), 0)
      return
    }
    if (focusFirstInvalid(document.querySelector('main'))) return
    const arrivalDate = parseLocalDateTimeInput(arrival)
    if (!arrivalDate) {
      setError('請填希望抵達的日期和時間')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const req: TsOptimizerRequest = {
        target_x: targetXY.x,
        target_y: targetXY.y,
        // 使用者填的是自己時區的時間，送出前換成含時差的 ISO（後端照 UTC 算）
        target_arrival: arrivalDate.toISOString(),
        attackers: attackers.map((a, i) => ({
          attacker_id: a.attacker_id,
          village_label: a.village_label,
          x: attackerXY[i]!.x,
          y: attackerXY[i]!.y,
          unit_speed: a.unit_speed,
          ts_level: a.ts_level,
          hero_bonus: a.hero_bonus,
          allow_ts_adjustment: a.allow_ts_adjustment,
        })),
        wave_spacing_seconds: spacing,
        // 伺服器速度跟「已帶入」列一致（原本寫死 x1）
        server_speed: speed,
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
        <CoordPair
          className="contents"
          labelX="目標 X"
          labelY="目標 Y"
          testId="target"
          radius={radius}
          showErrors={showCoordErrors}
          value={target}
          onChange={setTarget}
        />
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <label className="block text-sm font-medium mb-2" htmlFor="ts-arrival">
            希望抵達時間（{localZoneLabel('zh') || '本地'}時間）
          </label>
          <input
            id="ts-arrival"
            type="datetime-local"
            step={1}
            data-testid="arrival"
            value={arrival}
            onChange={(e) => setArrival(e.target.value)}
            className="w-full p-2 border rounded bg-background"
          />
        </div>
      </div>

      <label className="mb-4 block max-w-xs text-sm font-medium">
        <span className="mb-2 block">波次間隔</span>
        <select
          data-testid="wave-spacing"
          value={spacing}
          onChange={(e) => setSpacing(Number(e.target.value))}
          className="w-full p-2 border rounded bg-background"
        >
          {[0, 1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>{n === 0 ? '同一秒' : `${n} 秒`}</option>
          ))}
        </select>
      </label>

      <h3 className="font-bold mb-2">攻擊者（由上到下＝第 1、2、3… 波）</h3>
      <div className="space-y-2 mb-3">
        {attackers.map((a, i) => (
          // 390 寬：每個攻擊者一張小卡、兩欄並附欄名；≥640 才排成一列七格
          <div key={a.attacker_id} className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-7 sm:border-0 sm:p-0" data-testid="attacker-row">
            <label className="col-span-2 min-w-0 text-xs text-muted-foreground sm:col-span-1">
              <span className="sm:sr-only">村莊名稱</span>
              <input
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-base text-foreground sm:mt-0"
                placeholder="村莊名稱"
                value={a.village_label}
                onChange={(e) => updateAttacker(i, 'village_label', e.target.value)}
              />
            </label>
            <CoordPair
              className="contents"
              fieldClassName="min-w-0 text-xs text-muted-foreground"
              labelClassName="mb-1 block sm:sr-only"
              testId="attacker"
              radius={radius}
              showErrors={showCoordErrors}
              value={a.coord}
              onChange={(v) => updateAttacker(i, 'coord', v)}
            />
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sm:sr-only">最慢的兵種</span>
              <select
                data-testid="attacker-unit"
                className="mt-1 w-full min-w-0 rounded border bg-background p-2 text-base text-foreground sm:mt-0"
                value={units.some((u) => u.feId === a.unit_id) ? a.unit_id : (defaultUnit?.feId ?? '')}
                onChange={(e) => {
                  const u = units.find((x) => x.feId === e.target.value)
                  if (!u || u.speed == null) return
                  updateAttacker(i, 'unit_id', u.feId)
                  updateAttacker(i, 'unit_speed', u.speed)
                }}
              >
                {units.map((u) => (
                  <option key={u.feId} value={u.feId}>{`${unitLabel(u.feId)}（${u.speed} 格/時）`}</option>
                ))}
              </select>
            </label>
            <LevelSelect
              className="min-w-0"
              labelClassName="text-xs text-muted-foreground sm:sr-only"
              label="競技場等級"
              buildingId="tournament_square"
              min={0}
              max={20}
              value={a.ts_level}
              onChange={(v) => updateAttacker(i, 'ts_level', v)}
              testId="attacker-ts"
            />
            {/* 靴子跟競技場相加、只算超過 20 格（P0-21） */}
            <RangeNumberField
              className="min-w-0 text-xs text-muted-foreground"
              labelClassName="block sm:sr-only"
              label="英雄靴子速度加成（%）"
              min={0}
              max={75}
              testId="attacker-boots"
              value={a.hero_bonus ?? 0}
              onChange={(v) => updateAttacker(i, 'hero_bonus', v)}
            />
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
                <th className="border p-2 text-left">需要的競技場</th>
                <th className="border p-2 text-left">發兵時間（{localZoneLabel('zh') || '本地'}）</th>
                <th className="border p-2 text-left">抵達</th>
                <th className="border p-2 text-left">行進時間</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((r, idx) => {
                // 待驗證：這一列的攻擊者有競技場或靴子時，建議 TS、發兵、行進時間用了官方說明頁的公式（一列一個，P0-21）
                const atk = usedAttackers.find((a) => a.attacker_id === r.attacker_id) ?? usedAttackers.find((a) => a.village_label === r.village_label)
                const kinds = speedPendingKinds(atk?.ts_level ?? r.recommended_ts_level, atk?.hero_bonus ?? 0)
                return (
                  // 列高 ≥ 44（p-3）：上下兩列灰標的點擊範圍（44×44）才不會疊在一起
                  <PendingRow as="tr" tableColSpan={6} key={r.attacker_id ?? `${idx}`}>
                    {/* 一列一個灰標，放在列的標題（村莊）格：涵蓋建議 TS、發兵時間、行進時間 */}
                    <td className="border p-3" data-testid="ts-row-title">
                      {r.village_label}
                      {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                    </td>
                    <td className="border p-3">{r.distance}</td>
                    <td className="border p-3" data-testid="ts-level">{tsLevelText(r)}</td>
                    <td className="border p-3 tabular-nums" data-testid="ts-send">{formatLocalMonthDayTime(new Date(r.send_time))}</td>
                    <td className="border p-3 tabular-nums" data-testid="ts-arrival">{r.arrival_time ? formatLocalMonthDayTime(new Date(r.arrival_time)) : '—'}</td>
                    <td className="border p-3" data-testid="ts-travel">{r.travel_time_formatted}</td>
                  </PendingRow>
                )
              })}
            </tbody>
          </table>
          </div>
          <div className="space-y-2 sm:hidden" data-testid="ts-result-cards">
            {result.results.map((r, idx) => {
              const atk = usedAttackers.find((a) => a.attacker_id === r.attacker_id) ?? usedAttackers.find((a) => a.village_label === r.village_label)
              const kinds = speedPendingKinds(atk?.ts_level ?? r.recommended_ts_level, atk?.hero_bonus ?? 0)
              return (
                <div key={r.attacker_id ?? `${idx}`} className="min-w-0 rounded-md border p-3 text-sm" data-testid="ts-result-card">
                  {/* 一張卡一個灰標，放在標題行（建議 TS、發兵時間、行進時間都用到行軍公式）；說明撐滿卡片內容寬（P0-21 設計師） */}
                  <PendingRow as="p" fill className="font-medium" data-testid="ts-card-title">
                    {r.village_label}
                    {kinds.length > 0 && <> <PendingVerifyChip kinds={kinds} /></>}
                  </PendingRow>
                  <p className="text-muted-foreground">距離 {r.distance} 格 · 競技場 <span data-testid="ts-level-card">{tsLevelText(r)}</span></p>
                  <p className="mt-1 tabular-nums" data-testid="ts-send-card">發兵 {formatLocalMonthDayTime(new Date(r.send_time))}（{localZoneLabel('zh') || '本地'}）</p>
                  {r.arrival_time && <p className="mt-1 tabular-nums" data-testid="ts-arrival-card">抵達 {formatLocalMonthDayTime(new Date(r.arrival_time))}</p>}
                  <p className="mt-1" data-testid="ts-travel-card">行進 {r.travel_time_formatted}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

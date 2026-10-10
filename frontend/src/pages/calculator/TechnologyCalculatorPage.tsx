import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { advancedCalculatorApi } from '@/services/advancedCalculatorApi'
import type { TechnologyRequest, TechnologyResponse } from '@/services/advancedCalculatorApi'
import { CalcBar } from '@/components/autofill/CalcFrame'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import { ingameTribeName } from '@/lib/ingameNames'

const TRIBES = [
  { value: 'romans', label: ingameTribeName('romans') },
  { value: 'teutons', label: ingameTribeName('teutons') },
  { value: 'gauls', label: ingameTribeName('gauls') },
  { value: 'huns', label: ingameTribeName('huns') },
  { value: 'egyptians', label: ingameTribeName('egyptians') },
  { value: 'vikings', label: ingameTribeName('vikings') },
  { value: 'spartans', label: ingameTribeName('spartans') },
]

export default function TechnologyCalculatorPage() {
  // 部族預設跟著已帶入的村莊部族（一般伺服器 = 帳號的部族；沒有才用羅馬）
  const { tribe: accountTribe } = useAutoFill()
  const [form, setForm] = useState<TechnologyRequest>({
    tribe: accountTribe ?? 'romans',
    research_levels: [0, 5, 10, 15, 20],
  })
  // 帳號資料晚一點才載入：使用者還沒自己選過部族就跟著帳號
  const [tribeTouched, setTribeTouched] = useState(false)
  useEffect(() => {
    if (accountTribe && !tribeTouched) setForm((prev) => ({ ...prev, tribe: accountTribe }))
  }, [accountTribe, tribeTouched])
  const [result, setResult] = useState<TechnologyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCalculate = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await advancedCalculatorApi.calculateTechnology(form)
      setResult(res)
    } catch {
      setError('計算失敗，請檢查輸入')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">盔甲廠升級</h1>
      <p className="text-muted-foreground mb-6">
        查看盔甲廠升級後兵種的攻擊、防禦。升級後數值＝原本數值＋（原本數值＋300×糧耗÷7）×（1.007 的等級次方 − 1），四捨五入到小數 1 位。
      </p>
      <CalcBar tribe={form.tribe} />

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">部族</label>
          <select
            value={form.tribe}
            onChange={(e) => { setTribeTouched(true); setForm((prev) => ({ ...prev, tribe: e.target.value })) }}
            className="p-2 border rounded bg-background"
          >
            {TRIBES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleCalculate} disabled={loading}>
          {loading ? '計算中...' : '計算'}
        </Button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {result && result.troops.length > 0 && (
        <div className="space-y-6">
          {/* Attack Table */}
          <div>
            <PendingRow as="h3" className="text-lg font-semibold mb-2">攻擊力 <PendingVerifyChip kind="smithyFormula" /></PendingRow>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        {lv} 級
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name_zh ?? troop.troop_name}</td>
                      {troop.attack_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defense Infantry Table */}
          <div>
            <PendingRow as="h3" className="text-lg font-semibold mb-2">步兵防禦 <PendingVerifyChip kind="smithyFormula" /></PendingRow>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        {lv} 級
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name_zh ?? troop.troop_name}</td>
                      {troop.defense_infantry_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Defense Cavalry Table */}
          <div>
            <PendingRow as="h3" className="text-lg font-semibold mb-2">騎兵防禦 <PendingVerifyChip kind="smithyFormula" /></PendingRow>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-3 text-left">兵種</th>
                    {result.levels.map((lv) => (
                      <th key={lv} className="p-3 text-right">
                        {lv} 級
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.troops.map((troop) => (
                    <tr key={troop.troop_id} className="border-t">
                      <td className="p-3 font-medium">{troop.troop_name_zh ?? troop.troop_name}</td>
                      {troop.defense_cavalry_values.map((val, i) => (
                        <td key={i} className="p-3 text-right">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

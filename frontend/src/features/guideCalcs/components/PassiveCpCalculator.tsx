import { useEffect, useMemo, useRef, useState } from 'react'
import { cpAtLevel, type CpBuilding } from '../data/travian'
import {
  SERVER_SPEEDS, villageRequirements, startCp, celebrationCap, celebrationCp, celebration,
  isVillageCpVerified, isBuildingVerified, buildingName, type ServerSpeed, type CelebrationKind,
} from '../../../data/gameData'
import PendingVerifyChip, { PendingRow } from '@/components/common/PendingVerifyChip'
import Stepper from '@/components/common/Stepper'
import AutoFillBar, { AutoFillHint } from '@/components/autofill/AutoFillBar'
import { useAutoFill } from '@/components/autofill/AutoFillContext'
import { readCpProgress, writeCpProgress } from '@/lib/cpProgress'
import { useLang } from '../i18n/LangContext'
import s from './calc.module.css'
import CalcResultPanel from './CalcResultPanel'

/** ids：buildings.json 的建築 id（中文名從同一份資料取，合併欄位用「／」） */
interface FieldDef { id: string; key: CpBuilding; label: string; ids: string[] }

const FIELDS: FieldDef[] = [
  { id: 'mb', key: 'mainBuilding',     label: 'Main Building',     ids: ['main_building'] },
  { id: 'mk', key: 'marketplace',      label: 'Marketplace',       ids: ['marketplace'] },
  { id: 'em', key: 'embassy',          label: 'Embassy',           ids: ['embassy'] },
  { id: 'ac', key: 'academy',          label: 'Academy',           ids: ['academy'] },
  { id: 'th', key: 'townHall',         label: 'Town Hall',         ids: ['town_hall'] },
  { id: 're', key: 'residence',        label: 'Residence',         ids: ['residence'] },
  { id: 'cr', key: 'cranny',           label: 'Cranny',            ids: ['cranny'] },
  { id: 'wh', key: 'warehouse',        label: 'Warehouse',         ids: ['warehouse'] },
  { id: 'gr', key: 'granary',          label: 'Granary',           ids: ['granary'] },
  { id: 'sm', key: 'smithy',           label: 'Smithy',            ids: ['blacksmith'] },
  { id: 'ba', key: 'barracks',         label: 'Barracks',          ids: ['barracks'] },
  { id: 'st', key: 'stable',           label: 'Stable',            ids: ['stable'] },
  { id: 'ts', key: 'tournamentSquare', label: 'Tournament Sq.',    ids: ['tournament_square'] },
  { id: 'hm', key: 'heroMansion',      label: "Hero's Mansion",    ids: ['heros_mansion'] },
  { id: 'to', key: 'tradeOffice',      label: 'Trade Office',      ids: ['trade_office'] },
  { id: 'pl', key: 'palace',           label: 'Palace / Treasury', ids: ['palace', 'treasury'] },
]

function fieldLabel(f: FieldDef, en: boolean): string {
  return en ? f.label : f.ids.map(id => buildingName(id, 'zh')).join('／')
}

const PRESETS: Record<string, Record<string, number>> = {
  // 攻略（small guide §2.2）的每村被動配置：MB20＋市場20＋大使館20＋研究院20＋城鎮廳10＝529 CP/天
  lumi: { mb: 20, mk: 20, em: 20, ac: 20, th: 10 },
  min: { mb: 5, mk: 3, em: 3, ac: 10, th: 1, re: 10, cr: 1, wh: 3, gr: 3 },
  zero: {},
}

/** 城鎮廳 1 級一場慶典的時數（官方：x1–x2 24h、x3–x5 12h、x10 6h） */
const TH1_HOURS: Record<ServerSpeed, number> = { 1: 24, 2: 24, 3: 12, 5: 12, 10: 6 }

export type CelebrationMode = 'none' | CelebrationKind

/** 一個村每日 CP＝各建築目前等級的 CP 加總（沒有空村基礎值） */
export function villageDailyCp(levels: Record<string, number>): number {
  return FIELDS.reduce((sum, f) => sum + cpAtLevel(f.key, levels[f.id] ?? 0), 0)
}

export const PRESET_LUMI_CP = villageDailyCp(PRESETS.lumi ?? {})

export interface CountdownInput {
  /** 這個村每日 CP（各建築加總） */
  villageCp: number
  /** 其他村每日 CP 加總 */
  otherVillagesCp: number
  currentCp: number
  speed: ServerSpeed
  mode: CelebrationMode
  /** 一場慶典幾小時（看城鎮廳頁） */
  hoursPerCelebration: number
}

export interface CountdownRow {
  village: number
  required: number
  verified: boolean
  daysPassive: number
  daysWithCelebration: number | null
}

/**
 * 開村倒數。慶典 CP＝每日 CP 產量（小＝本村、大＝全帳號），上限依伺服器速度
 * （support.travian.com/en/articles/82、/20）。連續辦慶典時，每天多拿
 * 「一場的 CP × 24 ÷ 每場時數」。
 */
export function villageCountdown(input: CountdownInput, maxVillage = 10) {
  const accountCp = input.villageCp + input.otherVillagesCp
  const perCelebration = input.mode === 'none'
    ? 0
    : celebrationCp(input.mode === 'small' ? input.villageCp : accountCp, input.mode, input.speed)
  const hours = Math.max(1, input.hoursPerCelebration)
  const extraPerDay = perCelebration * (24 / hours)
  const req = villageRequirements(input.speed)
  const rows: CountdownRow[] = []
  for (let v = 2; v <= Math.min(maxVillage, req.length); v++) {
    const remaining = Math.max(0, req[v - 1]! - input.currentCp)
    rows.push({
      village: v,
      required: req[v - 1]!,
      verified: isVillageCpVerified(v, input.speed),
      daysPassive: accountCp > 0 ? remaining / accountCp : Infinity,
      daysWithCelebration: input.mode === 'none' ? null : remaining / (accountCp + extraPerDay),
    })
  }
  return { accountCp, perCelebration, extraPerDay, rows }
}

const fmtDays = (d: number | null) => (d == null ? '—' : isFinite(d) ? d.toFixed(1) : '∞')

export default function PassiveCpCalculator() {
  const { lang } = useLang()
  const en = lang === 'en'
  // 伺服器速度從帳號帶入（「已帶入」列）；在這頁改過就顯示「已手動修改 · 還原」
  const fill = useAutoFill()
  const accountSpeed = fill.speed as ServerSpeed
  const [levels, setLevels] = useState<Record<string, number>>(PRESETS.lumi)
  const [manualSpeed, setManualSpeed] = useState<ServerSpeed | null>(null)
  const speed: ServerSpeed = manualSpeed ?? accountSpeed
  const [currentCp, setCurrentCp] = useState<number>(startCp(accountSpeed))
  const [otherCp, setOtherCp] = useState<number>(0)
  const [mode, setMode] = useState<CelebrationMode>('small')
  const [hours, setHours] = useState<number>(TH1_HOURS[accountSpeed])
  const accountId = fill.account?.account_id ?? null
  // 使用者在「哪個帳號」動過輸入才記到那個帳號的首頁「開村 · CP」卡（不記預設值）。
  // 換帳號就清掉，避免把上一個帳號打的數字寫進新帳號。
  const touchedFor = useRef<string | null>(null)
  const touch = () => { touchedFor.current = accountId }
  const set = (id: string, v: number) => {
    touch()
    setLevels(prev => ({ ...prev, [id]: Math.max(0, Math.min(20, v || 0)) }))
  }
  const apply = (preset: string) => setLevels(() => {
    touch()
    const next: Record<string, number> = {}
    FIELDS.forEach(f => { next[f.id] = PRESETS[preset]?.[f.id] ?? 0 })
    return next
  })
  const resetForSpeed = (sp: ServerSpeed) => {
    setCurrentCp(startCp(sp))
    setHours(TH1_HOURS[sp])
  }
  const changeSpeed = (sp: ServerSpeed) => {
    setManualSpeed(sp === accountSpeed ? null : sp)
    resetForSpeed(sp)
  }
  const restoreSpeed = () => {
    setManualSpeed(null)
    resetForSpeed(accountSpeed)
  }
  // 帳號（或「已帶入」列）換了速度，跟著換預設值
  const lastAccountSpeed = useRef(accountSpeed)
  useEffect(() => {
    if (lastAccountSpeed.current === accountSpeed) return
    lastAccountSpeed.current = accountSpeed
    if (manualSpeed == null) resetForSpeed(accountSpeed)
  }, [accountSpeed, manualSpeed])

  // 第一次進來和換帳號：不再算「動過」，表單換成那個帳號上次存的目前 CP（沒存過就用預設值）。
  // 初值用 undefined：從首頁點進來時帳號已經載好，第一次 render 就有 accountId，也要讀一次。
  const lastAccountId = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (lastAccountId.current === accountId) return
    lastAccountId.current = accountId
    touchedFor.current = null
    const saved = readCpProgress(accountId)
    setLevels(PRESETS.lumi)
    setManualSpeed(null)
    lastAccountSpeed.current = accountSpeed
    setHours(TH1_HOURS[accountSpeed])
    setCurrentCp(saved ? saved.currentCp : startCp(accountSpeed))
    // 存的是全帳號每日 CP；扣掉這村（預設配置）就是其他村
    setOtherCp(saved ? Math.max(0, saved.dailyCp - PRESET_LUMI_CP) : 0)
  }, [accountId, accountSpeed])

  // 只算建築：遊戲沒有空村基礎產量（ts11：各棟 CP 加總＝遊戲顯示的 12／天）
  const total = useMemo(() => villageDailyCp(levels), [levels])
  // 每日 CP 用到還沒在 ts11 核對的建築數值（等級 > 0 的建築裡有沒標 ✓ 的）→ 摘要標題旁放灰標
  const usesUnverifiedBuilding = useMemo(
    () => FIELDS.some(f => (levels[f.id] ?? 0) > 0 && f.ids.some(id => !isBuildingVerified(id))),
    [levels],
  )

  const breakdown = useMemo(() => FIELDS.map(f => ({
    label: fieldLabel(f, en),
    level: levels[f.id] ?? 0,
    cp: cpAtLevel(f.key, levels[f.id] ?? 0),
  })).filter(x => x.cp > 0).sort((a, b) => b.cp - a.cp), [levels, en])

  const cd = useMemo(() => villageCountdown({
    villageCp: total, otherVillagesCp: otherCp, currentCp, speed, mode, hoursPerCelebration: hours,
  }), [total, otherCp, currentCp, speed, mode, hours])

  useEffect(() => {
    if (accountId == null || touchedFor.current !== accountId) return
    writeCpProgress(accountId, { currentCp, dailyCp: cd.accountCp, speed })
  }, [accountId, currentCp, cd.accountCp, speed])

  const small = celebration('small')
  const great = celebration('great')
  const capSmall = celebrationCap('small', speed)
  const capGreat = celebrationCap('great', speed)

  return (
    <>
      <div className={s.intro}>
        <h2>{en ? 'CP & new villages' : 'CP 與開村'}</h2>
        {/* Preset 「常用」= MB20+Market20+Embassy20+Academy20+TH10 → 529 CP/day; see tests */}
        <p>{en
          ? 'How many culture points one village produces per day, and how long until the next village. Raise building levels below, or tap a preset to fill common setups.'
          : '看一個村莊每天能產出多少 CP、還要幾天能開下一村。調整下面的建築等級，或點預設一鍵帶入常見配置。'}</p>
      </div>

      <AutoFillBar
        assumption={en
          ? `Assumes: x${speed} server · celebration CP = daily production (cap ${capSmall.toLocaleString()} / ${capGreat.toLocaleString()}), per the official rules`
          : `假設：x${speed} 伺服器 · 慶典 CP＝每日產量（上限 ${capSmall.toLocaleString()}／${capGreat.toLocaleString()}）依官方說明`}
      />

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{en ? 'Building levels' : '建築等級'}</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3" data-testid="cp-levels">
            {FIELDS.map(f => (
              <Stepper
                key={f.id}
                label={fieldLabel(f, en)}
                value={levels[f.id] ?? 0}
                onChange={v => set(f.id, v)}
                testId={`cp-level-${f.id}`}
              />
            ))}
          </div>

          <div className={s.btnRow}>
            <button onClick={() => apply('lumi')}>{en ? `Common (${PRESET_LUMI_CP}/d)` : `常用（${PRESET_LUMI_CP}／天）`}</button>
            <button onClick={() => apply('min')}>{en ? 'Bare-min' : '最小'}</button>
            <button onClick={() => apply('zero')}>{en ? 'Clear' : '清空'}</button>
          </div>

          {/* 預設按鈕和「開村倒數」標題之間留 16px（設計師） */}
          <h4 style={{ marginTop: 16 }} data-testid="cp-countdown-heading">{en ? 'Next-village countdown' : '開村倒數'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label>{en ? 'Server speed' : '伺服器速度'}</label>
              <select data-testid="cp-speed" value={speed} onChange={e => changeSpeed(+e.target.value as ServerSpeed)}>
                {SERVER_SPEEDS.map(sp => <option key={sp} value={sp}>x{sp}</option>)}
              </select>
              {fill.account && (
                <AutoFillHint
                  source={en ? 'From account' : '帳號帶入'}
                  manual={manualSpeed != null}
                  onRestore={restoreSpeed}
                  testId="cp-speed-hint"
                />
              )}
            </div>
            <div className={s.field}>
              <label>{en ? 'CP you have now' : '目前已有 CP'}</label>
              <input data-testid="cp-current" type="number" min={0} value={currentCp}
                     onChange={e => { touch(); setCurrentCp(Math.max(0, +e.target.value || 0)) }} />
            </div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label>{en ? 'Other villages CP/day' : '其他村每日 CP'}</label>
              <input data-testid="cp-other" type="number" min={0} value={otherCp}
                     onChange={e => { touch(); setOtherCp(Math.max(0, +e.target.value || 0)) }} />
            </div>
            <div className={s.field}>
              <label>{en ? 'Hours per celebration' : '一場慶典幾小時'}</label>
              <input data-testid="cp-hours" type="number" min={1} value={hours}
                     onChange={e => setHours(Math.max(1, +e.target.value || 1))} />
              <p className="mt-1 text-xs text-gray-500" data-testid="cp-hours-hint">
                {en
                  ? 'Celebrations get shorter as the Town Hall levels up; the default is the official Town Hall level 1 duration.'
                  : '慶典時長會隨城鎮廳等級變短，預設帶入城鎮廳 1 級的官方時長。'}
              </p>
            </div>
          </div>
          <div className={s.field}>
            <label>{en ? 'Celebrations' : '慶典'}</label>
            <select data-testid="cp-mode" value={mode} onChange={e => setMode(e.target.value as CelebrationMode)}>
              <option value="none">{en ? 'None' : '不辦'}</option>
              <option value="small">{en ? 'Small, back to back (this village)' : '連續辦小慶典（本村）'}</option>
              <option value="great">{en ? 'Great, back to back (whole account)' : '連續辦大慶典（全帳號）'}</option>
            </select>
          </div>
          <div className={s.note}>
            {en
              ? `A celebration gives your daily CP production — small: this village, great: all villages — up to ${capSmall} / ${capGreat} on x${speed}. Town Hall 1 runs one every ${TH1_HOURS[speed]} h; higher levels are shorter, so copy the time from your Town Hall page.`
              : `慶典拿到的 CP＝每日 CP 產量（小慶典算本村、大慶典算全帳號），x${speed} 上限 ${capSmall}／${capGreat}。城鎮廳 1 級一場 ${TH1_HOURS[speed]} 小時，等級越高越短，請照遊戲城鎮廳頁的時間填。`}
          </div>
        </div>

        <CalcResultPanel
          lang={lang}
          title={en ? 'Daily passive CP' : '每日被動 CP'}
          titlePending={usesUnverifiedBuilding ? 'building' : false}
          primary={<>{total} / {en ? 'day' : '天'}</>}
          secondary={mode === 'none'
            ? (en ? 'Buildings only; there is no empty-village base' : '只算建築，遊戲沒有空村基礎產量')
            : (en
              ? `One ${mode} celebration: +${cd.perCelebration} CP (cap ${mode === 'small' ? capSmall : capGreat})`
              : `辦一場${mode === 'small' ? '小' : '大'}慶典：+${cd.perCelebration} CP（上限 ${mode === 'small' ? capSmall : capGreat}）`)}
        >
          <h4>{en ? 'Days to reach village #N' : '開村門檻所需天數'}</h4>
          {/* 每一列至少 44px、數字垂直置中：灰標的 44px 點擊範圍剛好等於這一列，不會蓋到上一列的灰標 */}
          <table className={`${s.table} ${s.tapRows}`} data-testid="cp-countdown">
            <thead>
              <tr>
                <th>#</th>
                <th>{en ? 'CP req.' : '需求'}</th>
                <th>{en ? 'Buildings' : '只靠建築'}</th>
                <th>{en ? '+ celebrations' : '加慶典'}</th>
              </tr>
            </thead>
            <tbody>
              {cd.rows.map(r => (
                <PendingRow as="tr" className="h-11" tableColSpan={4} key={r.village}>
                  <td>#{r.village}</td>
                  <td>
                    {r.required.toLocaleString()}
                    {!r.verified && <> <PendingVerifyChip kind="cpThreshold" /></>}
                  </td>
                  <td>{fmtDays(r.daysPassive)}</td>
                  <td>{fmtDays(r.daysWithCelebration)}</td>
                </PendingRow>
              ))}
            </tbody>
          </table>

          <h4>{en ? 'Celebration cost (x1)' : '慶典花費（x1）'}</h4>
          <table className={`${s.table} ${s.tapRows}`} data-testid="cp-celebration-cost">
            <thead>
              <tr><th>{en ? 'Type' : '種類'}</th><th>{en ? 'Wood / Clay / Iron' : '木／泥／鐵'}</th><th>{en ? 'Crop' : '糧'}</th></tr>
            </thead>
            <tbody>
              <PendingRow as="tr" className="h-11" tableColSpan={3}>
                <td>{en ? 'Small' : '小慶典'}</td>
                <td>{small.cost.slice(0, 3).map(n => n.toLocaleString()).join(' / ')}</td>
                <td>{small.cost[3].toLocaleString()}{small.pending.length > 0 && <> <PendingVerifyChip kind="celebration" /></>}</td>
              </PendingRow>
              <PendingRow as="tr" className="h-11" tableColSpan={3}>
                <td>{en ? 'Great' : '大慶典'}{great.pending.includes('cost') && <> <PendingVerifyChip kind="celebration" /></>}</td>
                <td>{great.cost.slice(0, 3).map(n => n.toLocaleString()).join(' / ')}</td>
                <td>{great.cost[3].toLocaleString()}</td>
              </PendingRow>
            </tbody>
          </table>

          <h4>{en ? 'Top contributors' : '最大貢獻建築'}</h4>
          <table className={s.table}>
            <thead><tr><th>{en ? 'Building' : '建築'}</th><th>Lv</th><th>CP/day</th></tr></thead>
            <tbody>
              {breakdown.slice(0, 8).map(b => (
                <tr key={b.label}><td>{b.label}</td><td>{b.level}</td><td>{b.cp}</td></tr>
              ))}
            </tbody>
          </table>

          <div className={s.note}>
            {en
              ? 'Culture points are account-wide — enter the other villages\' CP/day so great celebrations and the countdown use the whole account.'
              : 'CP 是整帳號共用，把其他村的每日 CP 填進去，大慶典和開村倒數才會用全帳號計算。'}
          </div>
        </CalcResultPanel>
      </div>
    </>
  )
}

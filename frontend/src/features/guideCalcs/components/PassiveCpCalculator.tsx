import { useState, useMemo } from 'react'
import { cpAtLevel, type CpBuilding } from '../data/travian'
import {
  SERVER_SPEEDS, villageRequirements, startCp, celebrationCap, celebrationCp, celebration,
  isVillageCpVerified, buildingName, type ServerSpeed, type CelebrationKind,
} from '../../../data/gameData'
import PendingVerifyChip from '@/components/common/PendingVerifyChip'
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
  { id: 'sm', key: 'smithy',           label: 'Smithy / Armoury',  ids: ['blacksmith', 'armoury'] },
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
  const [levels, setLevels] = useState<Record<string, number>>(PRESETS.lumi)
  const [speed, setSpeed] = useState<ServerSpeed>(1)
  const [currentCp, setCurrentCp] = useState<number>(startCp(1))
  const [otherCp, setOtherCp] = useState<number>(0)
  const [mode, setMode] = useState<CelebrationMode>('small')
  const [hours, setHours] = useState<number>(TH1_HOURS[1])
  const set = (id: string, v: number) => setLevels(prev => ({ ...prev, [id]: Math.max(0, Math.min(20, v || 0)) }))
  const apply = (preset: string) => setLevels(() => {
    const next: Record<string, number> = {}
    FIELDS.forEach(f => { next[f.id] = PRESETS[preset]?.[f.id] ?? 0 })
    return next
  })
  const changeSpeed = (sp: ServerSpeed) => {
    setSpeed(sp)
    setCurrentCp(startCp(sp))
    setHours(TH1_HOURS[sp])
  }

  // 只算建築：遊戲沒有空村基礎產量（ts11：各棟 CP 加總＝遊戲顯示的 12／天）
  const total = useMemo(() => villageDailyCp(levels), [levels])

  const breakdown = useMemo(() => FIELDS.map(f => ({
    label: fieldLabel(f, en),
    level: levels[f.id] ?? 0,
    cp: cpAtLevel(f.key, levels[f.id] ?? 0),
  })).filter(x => x.cp > 0).sort((a, b) => b.cp - a.cp), [levels, en])

  const cd = useMemo(() => villageCountdown({
    villageCp: total, otherVillagesCp: otherCp, currentCp, speed, mode, hoursPerCelebration: hours,
  }), [total, otherCp, currentCp, speed, mode, hours])

  const small = celebration('small')
  const great = celebration('great')
  const capSmall = celebrationCap('small', speed)
  const capGreat = celebrationCap('great', speed)
  const anyUnverified = cd.rows.some(r => !r.verified)

  return (
    <>
      <div className={s.intro}>
        <h2>{en ? 'CP & new villages' : 'CP 與開村'}</h2>
        {/* Preset 「常用」= MB20+Market20+Embassy20+Academy20+TH10 → 529 CP/day; see tests */}
        <p>{en
          ? 'How many culture points one village produces per day, and how long until the next village. Raise building levels below, or tap a preset to fill common setups.'
          : '看一個村莊每天能產出多少 CP、還要幾天能開下一村。調整下面的建築等級，或點預設一鍵帶入常見配置。'}</p>
      </div>

      <div className={s.wrapper}>
        <div className={s.inputs}>
          <h4>{en ? 'Building levels' : '建築等級'}</h4>
          {Array.from({ length: Math.ceil(FIELDS.length / 2) }).map((_, idx) => {
            const a = FIELDS[idx * 2]
            const b = FIELDS[idx * 2 + 1]
            return (
              <div key={idx} className={s.fieldRow}>
                {a && (
                  <div className={s.field}>
                    <label>{fieldLabel(a, en)}</label>
                    <input type="number" min={0} max={20} value={levels[a.id] ?? 0}
                           onChange={e => set(a.id, +e.target.value)} />
                  </div>
                )}
                {b && (
                  <div className={s.field}>
                    <label>{fieldLabel(b, en)}</label>
                    <input type="number" min={0} max={20} value={levels[b.id] ?? 0}
                           onChange={e => set(b.id, +e.target.value)} />
                  </div>
                )}
              </div>
            )
          })}

          <div className={s.btnRow}>
            <button onClick={() => apply('lumi')}>{en ? `Common (${PRESET_LUMI_CP}/d)` : `常用（${PRESET_LUMI_CP}／天）`}</button>
            <button onClick={() => apply('min')}>{en ? 'Bare-min' : '最小'}</button>
            <button onClick={() => apply('zero')}>{en ? 'Clear' : '清空'}</button>
          </div>

          <h4>{en ? 'Next-village countdown' : '開村倒數'}</h4>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label>{en ? 'Server speed' : '伺服器速度'}</label>
              <select data-testid="cp-speed" value={speed} onChange={e => changeSpeed(+e.target.value as ServerSpeed)}>
                {SERVER_SPEEDS.map(sp => <option key={sp} value={sp}>x{sp}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label>{en ? 'CP you have now' : '目前已有 CP'}</label>
              <input data-testid="cp-current" type="number" min={0} value={currentCp}
                     onChange={e => setCurrentCp(Math.max(0, +e.target.value || 0))} />
            </div>
          </div>
          <div className={s.fieldRow}>
            <div className={s.field}>
              <label>{en ? 'Other villages CP/day' : '其他村每日 CP'}</label>
              <input data-testid="cp-other" type="number" min={0} value={otherCp}
                     onChange={e => setOtherCp(Math.max(0, +e.target.value || 0))} />
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
          primary={<>{total} / {en ? 'day' : '天'}</>}
          secondary={mode === 'none'
            ? (en ? 'Buildings only; there is no empty-village base' : '只算建築，遊戲沒有空村基礎產量')
            : (en
              ? `One ${mode} celebration: +${cd.perCelebration} CP (cap ${mode === 'small' ? capSmall : capGreat})`
              : `辦一場${mode === 'small' ? '小' : '大'}慶典：+${cd.perCelebration} CP（上限 ${mode === 'small' ? capSmall : capGreat}）`)}
        >
          <h4>{en ? 'Days to reach village #N' : '開村門檻所需天數'}</h4>
          <table className={s.table} data-testid="cp-countdown">
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
                <tr key={r.village}>
                  <td>#{r.village}</td>
                  <td>
                    {r.required.toLocaleString()}
                    {!r.verified && <> <PendingVerifyChip /></>}
                  </td>
                  <td>{fmtDays(r.daysPassive)}</td>
                  <td>{fmtDays(r.daysWithCelebration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {anyUnverified && (
            <p className="mb-3 mt-1" data-testid="cp-countdown-note">
              <PendingVerifyChip
                withNote
                note={en
                  ? 'Not yet confirmed in-game (only village 2 on x1, 2,000, is)'
                  : '這個數值還沒在遊戲裡實測確認（只有 x1 第 2 村 2,000 確認過）'}
              />
            </p>
          )}

          <h4>{en ? 'Celebration cost (x1)' : '慶典花費（x1）'}</h4>
          <table className={s.table} data-testid="cp-celebration-cost">
            <thead>
              <tr><th>{en ? 'Type' : '種類'}</th><th>{en ? 'Wood / Clay / Iron' : '木／泥／鐵'}</th><th>{en ? 'Crop' : '糧'}</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{en ? 'Small' : '小慶典'}</td>
                <td>{small.cost.slice(0, 3).map(n => n.toLocaleString()).join(' / ')}</td>
                <td>{small.cost[3].toLocaleString()}{small.pending.length > 0 && <> <PendingVerifyChip /></>}</td>
              </tr>
              <tr>
                <td>{en ? 'Great' : '大慶典'}{great.pending.includes('cost') && <> <PendingVerifyChip /></>}</td>
                <td>{great.cost.slice(0, 3).map(n => n.toLocaleString()).join(' / ')}</td>
                <td>{great.cost[3].toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          <p className="mb-3 mt-1" data-testid="cp-celebration-note">
            <PendingVerifyChip
              withNote
              note={en
                ? 'Not yet confirmed in-game (small-celebration crop may be 500)'
                : '這個數值還沒在遊戲裡實測確認（小慶典的糧也可能是 500）'}
            />
          </p>

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

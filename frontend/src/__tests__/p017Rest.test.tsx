import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import RangeNumberField, { focusFirstInvalid, outOfRange } from '@/components/common/RangeNumberField'
import { planGreedy } from '@/features/guideCalcs/components/BuildOrderCalculator'
import { bbBuildTime } from '@/features/guideCalcs/data/travian'
import { formatLocalMonthDayTime, parseLocalDateTimeInput, toLocalDateTimeInput } from '@/lib/serverTime'

function Boots() {
  const [v, setV] = useState(0)
  return <RangeNumberField label='英雄靴子 %' value={v} onChange={setV} min={0} max={75} testId='boots' />
}

describe('P0-17 (j) 範圍欄位', () => {
  it('超出 0–75 時欄位下方出現紅字「請輸入 0–75」，回到範圍內就消失', () => {
    render(<Boots />)
    const input = screen.getByTestId('boots')
    fireEvent.change(input, { target: { value: '80' } })
    expect(screen.getByTestId('boots-error')).toHaveTextContent('請輸入 0–75')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(input, { target: { value: '25' } })
    expect(screen.queryByTestId('boots-error')).toBeNull()
  })

  it('outOfRange 把空白／NaN 也算錯', () => {
    expect(outOfRange(Number.NaN, 0, 75)).toBe(true)
    expect(outOfRange(-1, 0, 75)).toBe(true)
    expect(outOfRange(75, 0, 75)).toBe(false)
  })

  it('focusFirstInvalid 捲到並聚焦第一個出錯的欄位', () => {
    const { container } = render(<Boots />)
    fireEvent.change(screen.getByTestId('boots'), { target: { value: '99' } })
    const input = screen.getByTestId('boots') as HTMLInputElement
    const scroll = vi.fn()
    input.scrollIntoView = scroll
    expect(focusFirstInvalid(container)).toBe(true)
    expect(scroll).toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
  })
})

describe('P0-17 (c) 建造順序的加成建築時間', () => {
  it('鋸木廠 1 級的建造時間不是 0', () => {
    expect(bbBuildTime('sawmill', 1, 1)).toBeGreaterThan(0)
  })

  it('有加成建築步驟時，總時間包含它的建造時間', () => {
    const r = planGreedy({
      cropperId: '15c', isCap: true, mb: 20, gold: false, maxSteps: 60,
      start: { wood: 10, clay: 10, iron: 10, crop: 10 },
      bonus: { sawmill: 0, brickyard: 0, ironFoundry: 0, grainMill: 0, bakery: 0 },
    })
    const bb = r.steps.filter(s => s.kind === 'bb')
    expect(bb.length).toBeGreaterThan(0)
    for (const s of bb) expect(s.time).toBeGreaterThan(0)
    expect(r.steps.every(s => s.labelZh && !/Lv|Wood|Clay|Iron|Crop/.test(s.labelZh))).toBe(true)
  })
})

describe('P0-17 (g) OP 發兵時間用本地時區', () => {
  it('datetime-local 往返不變', () => {
    const d = new Date(2026, 9, 11, 21, 5, 9)
    expect(toLocalDateTimeInput(d)).toBe('2026-10-11T21:05:09')
    expect(parseLocalDateTimeInput('2026-10-11T21:05:09')?.getTime()).toBe(d.getTime())
    expect(parseLocalDateTimeInput('2026-10-11T21:05')?.getSeconds()).toBe(0)
    expect(parseLocalDateTimeInput('2026/10/11')).toBeNull()
  })

  it('顯示成 M/D HH:mm:ss', () => {
    expect(formatLocalMonthDayTime(new Date(2026, 9, 1, 3, 4, 5))).toBe('10/1 03:04:05')
  })
})

describe('第 6 項：攔截「發送」卡的灰標分攻方／攔截方', () => {
  it('兩邊加成一樣也各列一次，前面標「攻方：」「攔截方：」', async () => {
    const { default: PendingVerifyChip } = await import('@/components/common/PendingVerifyChip')
    render(<PendingVerifyChip kinds={['arenaSpeed', 'arenaSpeed']} labels={['攻方：', '攔截方：']} />)
    fireEvent.click(screen.getByTestId('pending-verify-chip'))
    const labels = screen.getAllByTestId('pending-note-label').map(e => e.textContent)
    expect(labels).toEqual(['攻方：', '攔截方：'])
  })
})

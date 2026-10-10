import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import LevelSelect from '../LevelSelect'
import gen from '@/data/gameData.gen.json'
import { buildingMaxLevel, FIELD_IDS } from '@/lib/buildingLevels'

const values = (sel: HTMLElement) => Array.from((sel as HTMLSelectElement).options).map(o => Number(o.value))
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

describe('LevelSelect', () => {
  it('is a native select (select only, nothing to type) with a 44px height and 16px text', () => {
    render(<LevelSelect label="兵營等級" buildingId="barracks" value={3} onChange={() => undefined} />)
    const sel = screen.getByRole('combobox', { name: '兵營等級' })
    expect(sel.tagName).toBe('SELECT')
    expect(sel.className).toMatch(/\bh-11\b/)
    expect(sel.className).toMatch(/\btext-base\b/)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('range per building comes from the building data: every building, 0..max', () => {
    for (const [id, rows] of Object.entries(gen.buildings as Record<string, unknown[]>)) {
      if ((FIELD_IDS as readonly string[]).includes(id)) continue
      const { unmount } = render(<LevelSelect label={id} buildingId={id} value={0} onChange={() => undefined} />)
      expect(values(screen.getByRole('combobox', { name: id })), id).toEqual(range(0, rows.length))
      unmount()
    }
    expect(buildingMaxLevel('cranny')).toBe(10)
    expect(buildingMaxLevel('sawmill')).toBe(5)
    expect(buildingMaxLevel('main_building')).toBe(20)
  })

  it('resource fields: 10 in a normal village, 20 in the capital', () => {
    const { rerender } = render(<LevelSelect label="伐木場" buildingId="woodcutter" value={0} onChange={() => undefined} />)
    expect(values(screen.getByRole('combobox'))).toEqual(range(0, 10))
    rerender(<LevelSelect label="伐木場" buildingId="woodcutter" capital value={0} onChange={() => undefined} />)
    expect(values(screen.getByRole('combobox'))).toEqual(range(0, 20))
  })

  it('explicit min / max win over the data', () => {
    render(<LevelSelect label="目標等級" buildingId="cropland" min={1} max={20} value={7} onChange={() => undefined} />)
    expect(values(screen.getByRole('combobox'))).toEqual(range(1, 20))
  })

  it('calls onChange with a number when a level is picked', () => {
    const onChange = vi.fn()
    render(<LevelSelect label="競技場等級" buildingId="tournament_square" value={0} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: '競技場等級' }), { target: { value: '7' } })
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it('keeps a saved value that is outside the range instead of silently changing it', () => {
    render(<LevelSelect label="伐木場" buildingId="woodcutter" value={15} onChange={() => undefined} />)
    const sel = screen.getByRole('combobox') as HTMLSelectElement
    expect(sel.value).toBe('15')
    expect(values(sel)).toEqual([...range(0, 10), 15])
  })

  it('icon sits left of the dropdown, follows the building, and is decorative', () => {
    const { rerender } = render(<LevelSelect label="等級" buildingId="barracks" value={1} onChange={() => undefined} testId="ls" />)
    const svg = within(screen.getByTestId('ls')).getByRole('combobox').parentElement!.firstElementChild!
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('data-building-icon')).toBe('barracks')
    rerender(<LevelSelect label="等級" buildingId="stable" value={1} onChange={() => undefined} testId="ls" />)
    expect(screen.getByTestId('ls').querySelector('svg')!.getAttribute('data-building-icon')).toBe('stable')
    rerender(<LevelSelect label="等級" buildingId="stable" noIcon value={1} onChange={() => undefined} testId="ls" />)
    expect(screen.getByTestId('ls').querySelector('svg')).toBeNull()
  })

  it('option text follows the language', async () => {
    const { rerender } = render(<LevelSelect label="x" buildingId="sawmill" lang="zh" value={1} onChange={() => undefined} />)
    expect(screen.getByRole('option', { name: '5 級' })).toBeInTheDocument()
    rerender(<LevelSelect label="x" buildingId="sawmill" lang="en" value={1} onChange={() => undefined} />)
    expect(screen.getByRole('option', { name: 'Lv 5' })).toBeInTheDocument()
    expect(i18n).toBeTruthy()
  })
})

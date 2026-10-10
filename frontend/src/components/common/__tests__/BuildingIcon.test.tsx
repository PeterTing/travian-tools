import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import gen from '@/data/gameData.gen.json'
import { INGAME_BUILDINGS } from '@/lib/ingameNames'
import BuildingIcon, { BuildingLabel } from '../BuildingIcon'
import {
  BUILDING_ICONS, FIELD_TONE, resolveBuildingIconId, resolveBuildingIconIdFromText,
} from '../icons/buildingIcons'

const DATA_IDS = Object.keys(gen.buildings)
const INGAME_IDS = Object.keys(INGAME_BUILDINGS)

describe('BuildingIcon: every building and resource field has its own icon', () => {
  it('every building id in gameData (buildings.json) has an icon', () => {
    const missing = DATA_IDS.filter(id => !(id in BUILDING_ICONS))
    expect(missing).toEqual([])
  })

  it('every building in the in-game names table (gid 1–45) has an icon, including tribe-only ones', () => {
    const missing = INGAME_IDS.filter(id => !(id in BUILDING_ICONS))
    expect(missing).toEqual([])
  })

  it('no icon is a copy of another one (each building is drawn differently)', () => {
    const seen = new Map<string, string>()
    for (const id of Object.keys(BUILDING_ICONS)) {
      const html = renderToStaticMarkup(<BuildingIcon id={id} />).replace(/ data-building-icon="[^"]+"/, '').replace(/ class="[^"]*"/, '')
      expect(seen.get(html), `${id} looks the same as ${seen.get(html)}`).toBeUndefined()
      seen.set(html, id)
    }
  })

  it('follows the designer spec: 24×24 viewBox, stroke only, 1.75 width, round caps/joins, aria-hidden, at most 4 strokes, no text', () => {
    for (const id of Object.keys(BUILDING_ICONS)) {
      const { container, unmount } = render(<BuildingIcon id={id} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.getAttribute('fill')).toBe('none')
      expect(svg.getAttribute('stroke')).toBe('currentColor')
      expect(svg.getAttribute('stroke-width')).toBe('1.75')
      expect(svg.getAttribute('stroke-linecap')).toBe('round')
      expect(svg.getAttribute('stroke-linejoin')).toBe('round')
      expect(svg.querySelectorAll('text').length, id).toBe(0)
      expect(svg.textContent, id).toBe('')
      // 一個主外框＋最多 3 條細節線
      const shapes = svg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon')
      expect(shapes.length, id).toBeGreaterThan(0)
      expect(shapes.length, id).toBeLessThanOrEqual(4)
      // 沒有任何形狀自己填色
      for (const el of shapes) expect(el.getAttribute('fill'), id).toBeNull()
      unmount()
    }
  })

  it('sizes: 20 by default (lists), 32 when asked (detail title)', () => {
    const { container, rerender } = render(<BuildingIcon id="barracks" />)
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('20')
    rerender(<BuildingIcon id="barracks" size={32} />)
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('32')
  })

  it('buildings use the text colour; only the four resource fields get a resource colour', () => {
    expect(FIELD_TONE).toEqual({
      woodcutter: 'text-amber-700', clay_pit: 'text-orange-600', iron_mine: 'text-slate-500', cropland: 'text-yellow-600',
    })
    const { container } = render(<BuildingIcon id="main_building" />)
    expect(container.querySelector('svg')!.getAttribute('class')).not.toMatch(/text-/)
    const f = render(<BuildingIcon id="cropland" />)
    expect(f.container.querySelector('svg')!.getAttribute('class')).toMatch(/text-yellow-600/)
  })

  it('resolves the other ways buildings are written on the site', () => {
    expect(resolveBuildingIconId('building_15')).toBe('main_building')
    expect(resolveBuildingIconId('building_45')).toBe('waterworks')
    expect(resolveBuildingIconId('wood_field')).toBe('woodcutter')
    expect(resolveBuildingIconId('crop')).toBe('cropland')
    expect(resolveBuildingIconId('盔甲廠')).toBe('blacksmith')
    expect(resolveBuildingIconIdFromText('所有伐木場')).toBe('woodcutter')
    expect(resolveBuildingIconIdFromText('一塊農場')).toBe('cropland')
    expect(resolveBuildingIconId('building_0')).toBeNull()
    expect(resolveBuildingIconId('unknown')).toBeNull()
    expect(resolveBuildingIconId('')).toBeNull()
  })

  it('renders nothing for an unknown id, and the name always stays as text', () => {
    const { container } = render(<BuildingIcon id="no_such_building" />)
    expect(container.innerHTML).toBe('')
    const l = render(<BuildingLabel id="barracks" name="兵營" />)
    expect(l.container.textContent).toBe('兵營')
    expect(l.container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true')
  })
})

import { describe, expect, it } from 'vitest'
import { birthTribeOf, isMultiTribeWorld, villageTribeOf } from '@/lib/villageTribe'
import { makeAccount } from '@/test/accountFixtures'
import type { GameWorld, Village } from '@/types/game'

const world = (keep?: boolean): GameWorld => ({
  world_id: 'w',
  server_url: 'https://ts11.x1.asia.travian.com',
  utc_offset: null,
  account_count: 1,
  ...(keep === undefined ? {} : { keep_tribe_on_conquest: keep }),
})
const village = (tribe: Village['tribe']): Village => ({
  village_id: 'v',
  account_id: 'acc-ts3',
  name: '02',
  coordinate_x: 1,
  coordinate_y: 2,
  population: 0,
  village_type: null,
  is_capital: false,
  role: null,
  tribe,
  last_updated: null,
  created_at: '2026-10-01T00:00:00',
})

describe('一個帳號多個部族（P0-25）', () => {
  it('birth tribe comes from birth_tribe, falling back to tribe for the old API', () => {
    expect(birthTribeOf(makeAccount({ tribe: 'romans', birth_tribe: 'romans' }))).toBe('romans')
    expect(birthTribeOf(makeAccount({ tribe: 'gauls' }))).toBe('gauls')
    expect(birthTribeOf(makeAccount({ tribe: null }))).toBeNull()
    expect(birthTribeOf(null)).toBeNull()
  })

  it('only worlds with Keep Tribe on Conquest are multi-tribe; missing flag (old API) = single tribe', () => {
    expect(isMultiTribeWorld(world(true))).toBe(true)
    expect(isMultiTribeWorld(world(false))).toBe(false)
    expect(isMultiTribeWorld(world())).toBe(false)
    expect(isMultiTribeWorld(null)).toBe(false)
  })

  it('single-tribe worlds always use the birth tribe, even if a village has another tribe stored', () => {
    const acc = makeAccount({ tribe: 'romans', birth_tribe: 'romans' })
    expect(villageTribeOf(village('gauls'), acc, world(false))).toBe('romans')
    expect(villageTribeOf(village('gauls'), acc, null)).toBe('romans')
  })

  it('multi-tribe worlds use the village tribe; unset village follows the birth tribe', () => {
    const acc = makeAccount({ tribe: 'romans', birth_tribe: 'romans' })
    expect(villageTribeOf(village('gauls'), acc, world(true))).toBe('gauls')
    expect(villageTribeOf(village(null), acc, world(true))).toBe('romans')
    expect(villageTribeOf(null, acc, world(true))).toBe('romans')
  })
})

import type { GameAccount } from '@/types/game'

/** 測試用的帳號＋世界；預設值對應 P0 線框裡的 PeterT · ts3 */
export function makeAccount(overrides: Partial<GameAccount> = {}): GameAccount {
  return {
    account_id: 'acc-ts3',
    user_id: 'user-1',
    server_url: 'https://ts3.x1.international.travian.com',
    server_name: 'ts3',
    server_speed: 1,
    tribe: 'gauls',
    player_name: 'PeterT',
    alliance_name: null,
    server_start_date: null,
    current_server_day: 10,
    player_role: null,
    is_active: true,
    last_updated: null,
    created_at: '2026-10-01T00:00:00',
    time_display: null,
    local_timezone: null,
    village_count: 0,
    ...overrides,
  }
}

import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '@/i18n/i18n'
import { ParseConfirmPanel } from '../ParseConfirmPanel'

const account = {
  account_id: 'acc-1',
  player_name: 'HandsomeTing',
  server_name: 'International 11',
  server_url: 'https://ts11.x1.international.travian.com',
} as never

describe('ParseConfirmPanel', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-TW')
  })

  it('shows helpful empty state with page type and next step', () => {
    render(
      <ParseConfirmPanel
        account={account}
        state={{
          pageType: 'rally_point',
          data: { garrison_own: [{ count: 1 }], incoming: [], movements: [] },
          source: 'paste',
        }}
        villages={[]}
        villageId={null}
        onVillageIdChange={vi.fn()}
        captureAt={new Date(2026, 9, 5, 12, 0)}
        onCaptureAtChange={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    const empty = screen.getByTestId('parse-empty-state')
    expect(empty).toHaveTextContent('沒有可存的解析結果')
    expect(screen.getByTestId('parse-empty-detail').textContent).toMatch(/集結點/)
    expect(screen.getByTestId('parse-empty-detail').textContent).toMatch(/Ctrl\+U/)
  })

  it('lists dorf2 buildings with name and level', () => {
    render(
      <ParseConfirmPanel
        account={account}
        state={{
          pageType: 'village_center',
          data: {
            village_name: 'HandsomeTing的村莊',
            population: 8,
            buildings: [
              { position: 19, building_id: 'building_0', level: 0 },
              { position: 26, building_id: 'building_15', level: 1 },
              { position: 39, building_id: 'building_16', level: 1 },
            ],
          },
          source: 'paste',
        }}
        villages={[]}
        villageId={null}
        onVillageIdChange={vi.fn()}
        captureAt={new Date(2026, 9, 5, 12, 0)}
        onCaptureAtChange={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByTestId('village-center-preview')).toHaveTextContent('人口 8')
    const list = screen.getByTestId('building-list')
    expect(list).toHaveTextContent('村莊大樓')
    expect(list).toHaveTextContent('Lv1')
    expect(list).toHaveTextContent('集結點')
  })

  it('shows population on village overview confirm', () => {
    render(
      <ParseConfirmPanel
        account={account}
        state={{
          pageType: 'village_overview',
          data: {
            village_name: 'HandsomeTing的村莊',
            population: 8,
            resources: { wood: 1, clay: 1, iron: 1, crop: 1 },
            production: { wood: 1, clay: 1, iron: 1, crop: 1 },
            resource_fields: [{ level: 1 }],
          },
          source: 'paste',
        }}
        villages={[]}
        villageId={null}
        onVillageIdChange={vi.fn()}
        captureAt={new Date(2026, 9, 5, 12, 0)}
        onCaptureAtChange={vi.fn()}
        onDiscard={vi.fn()}
        onSave={vi.fn()}
      />,
    )
    expect(screen.getByTestId('overview-population')).toHaveTextContent('人口 8')
  })
})

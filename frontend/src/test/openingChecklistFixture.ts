import type { OpeningChecklistData, OpeningStep } from '@/types/openingChecklist'

const step = (overrides: Partial<OpeningStep> & { id: string }): OpeningStep => ({
  row: Number(overrides.id.slice(1)),
  kind: 'build',
  building: '伐木場',
  building_en: 'Woodcutter',
  target: '升到 1',
  target_en: 'to 1',
  tier: 1,
  cost: 260,
  reward_res: 600,
  reward_exp: 10,
  cp: 0,
  pop: 2,
  why: null,
  ...overrides,
})

/** 測試用的小份起手式清單（結構跟 backend/data/static/opening_checklist.json 一樣） */
export function makeOpeningChecklist(): OpeningChecklistData {
  return {
    version: 1,
    source: { file: 'opening.xlsx', sha256: 'x', hero_level: 0, sheets: {} },
    tribe_data: { settler_cost: {}, farm_unit: {} },
    strategies: [
      {
        id: '4p-farm',
        name: '4P 農開',
        sheet: '4P - Farm',
        parties: 4,
        total_steps: 5,
        sections: [
          {
            id: 'tier-1',
            title: '任務等級 1',
            tier: 1,
            intro: null,
            steps: [
              step({
                id: 'r003',
                building: '村莊大樓',
                cost: null,
                cp: 2,
                why: { zh: '派英雄去最短的冒險拿馬。', en: 'Send hero...', source: 'manual' },
              }),
              step({ id: 'r004', building: '伐木場', target: '1 座升到 2' }),
            ],
          },
          {
            id: 'tier-2',
            title: '任務等級 2',
            tier: 2,
            intro: null,
            steps: [
              step({ id: 'r010', building: '泥坑', tier: 2 }),
              step({
                id: 'r058',
                building: '倉庫',
                target: '升到 5',
                tier: 2,
                cost: null,
                skip: true,
                by_tribe: { romans: { skip: false, cost: 2010 } },
              }),
              step({
                id: 'r084',
                kind: 'settlers',
                building: '拓荒者',
                target: '×1',
                tier: null,
                cost: 18100,
                reward_res: null,
                reward_exp: null,
                pop: 1,
                by_tribe: {
                  gauls: { cost: 18100 },
                  teutons: { cost: 20000 },
                  vikings: { cost: null, missing: 'settler_cost' },
                },
              }),
            ],
          },
        ],
      },
      {
        id: '3p-sim',
        name: '3P 兵開',
        sheet: '3P - Sim',
        parties: 3,
        total_steps: 2,
        sections: [
          {
            id: 'tier-1',
            title: '任務等級 1',
            tier: 1,
            intro: null,
            steps: [
              step({ id: 'r003', building: '村莊大樓', cost: null }),
              step({ id: 'r005', building: '鐵礦場', target: '升到 1' }),
            ],
          },
        ],
      },
    ],
    reference: {
      tasks: [
        {
          title: '首村的任務',
          groups: [
            {
              title: '一般',
              rows: [{ task: '文明點產量', tier: 1, target: '每日 50', reward_res: 1500, reward_exp: 25 }],
            },
          ],
        },
        {
          title: '帳號的任務',
          groups: [
            {
              title: '一般',
              rows: [{ task: '英雄等級', tier: 1, target: '升到 5', reward_res: 900, reward_exp: 0 }],
            },
          ],
        },
      ],
      party_cp: {
        example_inputs: { production_per_hour: 2200, farming_per_hour: 250, cp_to_go: 1316 },
        phases: [
          {
            title: '到第 1 場派對',
            rows: [
              {
                res_label: '花費',
                resources: 15000,
                cp_label: '文明點產量（每日）',
                cp_value: 165,
                hours: 30,
                cp_left: 1109.75,
              },
              {
                res_label: '第 1 場派對',
                resources: 20330,
                cp_label: '第 1 場派對的文明點',
                cp_value: 206,
                hours: 0,
                cp_left: -1.25,
              },
              {
                res_label: '任務獎勵',
                resources: 0,
                cp_label: '城鎮廳等級',
                cp_value: 1,
                hours: 0,
                cp_left: 0,
              },
            ],
          },
        ],
      },
    },
  }
}

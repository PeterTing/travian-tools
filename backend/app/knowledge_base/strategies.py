"""Travian 策略知識庫."""

from typing import Any

from app.utils.culture_points import celebration_cap, village_requirements

# 早期發展策略
EARLY_GAME_STRATEGIES = {
    "first_72_hours": {
        "title": "前72小時攻略",
        "description": "遊戲開始的關鍵時期",
        "key_points": [
            "選擇最新開的伺服器，盡量在開服1小時內註冊",
            "完成所有新手任務，可獲得大量資源獎勵",
            "第一時間讓英雄去冒險，優先選擇最短路程的冒險",
            "盡快獲得馬匹提升英雄移動速度",
            "如果是條頓，盡早開始訓練棍棒兵進行掠奪",
        ],
        "tribe_specific": {
            "romans": "可以雙蓋，但不要過度使用，資源田提升比建築優先",
            "gauls": "利用1.5倍密藏室保護資源，適合較和平的開局",
            "teutons": "最佳早期掠奪部族，棍棒兵是最高效的早期單位",
            "egyptians": "利用英雄資源加成，專注經濟發展",
            "huns": "適合有經驗的玩家，需要快速掠奪來彌補弱防禦",
        },
    },
    "resource_development": {
        "title": "資源田發展",
        "description": "如何有效升級資源田",
        "key_points": [
            "四種資源田（木材、磚塊、鐵礦、糧食）應平均發展",
            "優先升級主建築以縮短建造時間",
            "條頓可能不需要太多鐵礦，多餘的可在市場交易",
            "資源田等級越高，回報越大但成本也越高",
        ],
        "recommended_order": [
            "主建築升到10級",
            "所有資源田升到2級",
            "倉庫和糧倉升到適當等級",
            "資源田升到5級",
            "加蓋資源加成建築（鋸木廠、磚廠、鍛造廠）",
            "資源田升到8-10級",
        ],
    },
    "second_village_rush": {
        "title": "第二村速開",
        "description": "如何快速開第二村",
        "requirements": {
            "culture_points": 2000,
            "settlers": 3,
            "resources_for_settlers": "約60000資源",
        },
        "building_requirements": [
            "主建築 10級",
            "研究院 10級",
            "城鎮廳 1級",
            "行宮或皇宮 10級",
        ],
        "timeline": {
            "day_7_target": "頂尖玩家可在第7天開第二村",
            "day_10_target": "一般玩家可在第10天達成",
            "day_14_target": "休閒玩家的合理目標",
        },
        "tips": [
            "持續舉辦慶典累積 CP",
            "小型慶典：拿到本村每日 CP 產量（x1 上限 500）——開局一天才十幾 CP，別期待一次 500",
            "大型慶典（城鎮廳10級）：拿到全帳號每日 CP 產量（x1 上限 2000）",
            "小慶典成本 20,330 資源（糧食 1,340 待 ts11 驗證）",
        ],
    },
}

# 中期發展策略
MID_GAME_STRATEGIES = {
    "capital_selection": {
        "title": "首都選擇",
        "description": "如何選擇最佳首都位置",
        "key_points": [
            "首都必須是15田村（15-cropper），9田村不夠格",
            "綠洲加成至少要100%，125%或150%更理想",
            "首都是唯一可以無限升級資源田的村莊",
            "主力攻擊軍隊應該建在首都",
        ],
        "oasis_bonus_impact": {
            "0%": "18級田 + 磨坊麵包店 = 約45000糧食產量",
            "100%": "18級田 + 磨坊麵包店 = 約75000糧食產量",
            "150%": "18級田 + 磨坊麵包店 = 約90000糧食產量",
        },
        "15c_vs_9c": {
            "15c_advantages": [
                "糧食產量差異巨大",
                "不需要建造鋸木廠、磚廠、鍛造廠",
                "多出3格可建造倉庫糧倉",
                "可支撐更大的軍隊",
            ],
            "9c_uses": [
                "可作為第二村使用",
                "產量仍比普通村高",
                "對新手玩家較容易管理",
            ],
        },
    },
    "village_specialization": {
        "title": "村莊專業化",
        "description": "如何規劃不同功能的村莊",
        "types": {
            "capital": {
                "description": "主力軍隊村，15田村",
                "focus": ["糧食產量最大化", "建造主力攻擊部隊", "升級鐵匠舖"],
            },
            "hammer_village": {
                "description": "生產攻擊部隊的村莊",
                "buildings": [
                    "最高等級兵營和馬廄",
                    "工場生產攻城器械",
                    "鐵匠舖升級攻擊",
                ],
                "tips": "應該靠近首都以便運送糧食",
            },
            "anvil_village": {
                "description": "生產防禦部隊的村莊",
                "buildings": ["兵營和馬廄", "盔甲匠舖升級防禦"],
                "ratio": "每4-5村開一個防禦村",
            },
            "resource_village": {
                "description": "純資源生產村",
                "focus": ["資源田升級", "最小化建築數量", "支援其他村莊"],
            },
        },
    },
    "raiding_strategy": {
        "title": "掠奪策略",
        "description": "如何有效率地掠奪資源",
        "key_principles": [
            "掠奪是為了獲利，不是所有玩家都適合當農場",
            "分開掠奪軍和攻擊軍，當主力出征時掠奪可持續",
            "不要浪費載重量，根據目標產量派遣適當數量",
            "剛出新手保護的玩家是最佳農場目標",
        ],
        "tribe_efficiency": {
            "teutons": {
                "rating": "最佳",
                "reason": "棍棒兵只需5次滿載就能回本",
            },
            "huns": {"rating": "優秀", "reason": "快速騎兵適合掠奪"},
            "vikings": {"rating": "優秀", "reason": "港口加速讓掠奪船更快"},
            "gauls": {"rating": "中等", "reason": "雷神騎兵適合快速掠奪"},
            "romans": {"rating": "較差", "reason": "軍團兵載重小速度慢"},
            "egyptians": {"rating": "較差", "reason": "專注防禦不適合掠奪"},
        },
        "farm_list_tips": [
            "使用農場清單（Gold Club功能）提高效率",
            "標記好各農場的資源產量和防禦",
            "定期清理有防禦的農場",
        ],
    },
}

# 後期/終局策略
LATE_GAME_STRATEGIES = {
    "world_wonder": {
        "title": "世界奇蹟攻略",
        "description": "如何建造或攻擊世界奇蹟",
        "basics": {
            "objective": "第一個將世界奇蹟建到100級的聯盟獲勝",
            "construction_plans": {
                "1_plan": "可建造到49級",
                "2_plans": "可建造到100級",
            },
            "special_rules": [
                "建造時間縮短50%",
                "世界奇蹟村的部隊糧食消耗減半",
                "不能使用即時完成、大師建築師、NPC交易",
            ],
        },
        "storage_requirements": {
            "level_100": "需要100萬資源容量的倉庫",
            "recommended_layout": [
                "6個大倉庫 + 6個大糧倉 + 貿易所20級 + 市場20級",
                "或 7個大倉庫 + 6個大糧倉 + 市場1級（監控用）",
            ],
        },
        "defense_strategy": [
            "納塔族攻擊每5級出現一次",
            "第一波是部隊和攻城槌攻擊城牆",
            "第二波是投石車攻擊世界奇蹟",
            "需要整個聯盟協調防禦",
        ],
        "attack_strategy": {
            "hammer": "攻擊部隊應最大化攻擊加成",
            "gold_bonus": "攻擊時開啟+10%金幣加成",
            "timing": "在敵方世界奇蹟升級時攻擊最有效",
        },
    },
    "artifacts": {
        "title": "神器系統",
        "description": "神器的獲取和使用",
        "types": {
            "small": "影響單一村莊",
            "great": "影響整個帳號",
            "unique": "全伺服器只有一個，效果最強",
        },
        "categories": [
            "建築加速神器",
            "部隊訓練加速神器",
            "攻擊力加成神器",
            "偵察防護神器",
            "等等...",
        ],
        "strategy": [
            "神器不直接影響世界奇蹟建造",
            "大型/唯一建築師神器可加強世界奇蹟村其他建築",
            "需要協調聯盟資源來守護重要神器",
        ],
    },
    "alliance_coordination": {
        "title": "聯盟協調",
        "description": "如何有效協調聯盟行動",
        "defense_coordination": {
            "role": "防禦協調員是最困難的角色之一",
            "responsibilities": [
                "收集攻擊情報",
                "分配防禦資源",
                "協調增援時機",
            ],
            "scout_hammer": "應指派專人訓練10000+偵察兵",
        },
        "offense_coordination": {
            "hammer_wingman": {
                "description": "主攻+副攻的組合",
                "advantage": "可造成2-4倍傷害",
            },
            "decoy_attacks": {
                "description": "假攻擊來分散敵方防禦",
                "execution": "對目標附近2個村莊發送假攻擊",
            },
        },
        "communication": [
            "使用Discord或類似工具即時通訊",
            "建立清晰的指揮鏈",
            "定期召開戰略會議",
        ],
    },
}

# 防禦策略
DEFENSE_STRATEGIES = {
    "troop_selection": {
        "title": "防禦部隊選擇",
        "description": "如何選擇正確的防禦部隊",
        "principle": "根據敵方部隊組成選擇防禦兵種",
        "vs_infantry": {
            "best_units": ["禁衛兵（羅馬）", "德魯伊騎兵（高盧）", "聖騎士（條頓）"],
            "tip": "羅馬攻擊多為步兵，需要反步兵部隊",
        },
        "vs_cavalry": {
            "best_units": ["長矛兵（條頓）", "方陣兵（高盧）", "軍團兵（羅馬）"],
            "tip": "條頓和匈奴攻擊多為騎兵，需要反騎兵部隊",
        },
        "mixed_defense": "對高盧和條頓攻擊，使用平衡的步騎防禦組合",
    },
    "anvil_guide": {
        "title": "鐵砧指南",
        "description": "如何成為優秀的防禦玩家",
        "definition": "鐵砧是指大型單村防禦部隊",
        "advantages": [
            "村莊群集時很難被攻破",
            "可以快速支援附近盟友",
            "20000防禦部隊在1小時內可到達的村莊都很安全",
        ],
        "building_tips": [
            "不需要1:1的攻防比例",
            "一個好的鐵砧可以提供大量防禦",
            "應該有更多防禦待命隨時可派出",
        ],
    },
    "attack_dodging": {
        "title": "閃避攻擊",
        "description": "如何保護攻擊部隊",
        "principle": "永遠不要用攻擊部隊防禦",
        "technique": [
            "在攻擊到達前10秒派出增援其他村莊",
            "在90秒內取消增援",
            "部隊會在攻擊後安全返回",
        ],
        "warning": "棍棒兵是最弱的防禦單位之一，絕對不要用來防禦",
    },
}

# 英雄系統
HERO_GUIDE = {
    "attributes": {
        "title": "英雄屬性",
        "description": "如何分配英雄屬性點",
        "points_per_level": 4,
        "attributes": {
            "fighting_strength": {
                "description": "增加英雄攻防值",
                "tribe_bonus": {
                    "romans": "+100每點（其他部族+80）",
                },
            },
            "off_bonus": {
                "description": "增加整支軍隊攻擊力",
                "max_bonus": "20%（每點0.2%）",
                "condition": "只有英雄帶隊攻擊時生效",
            },
            "def_bonus": {
                "description": "增加所有自己部隊的防禦力",
                "max_bonus": "20%（每點0.2%）",
            },
            "resource_production": {
                "description": "增加資源產出",
                "early_game": "早期推薦優先投資",
            },
        },
        "recommended_builds": {
            "early_game": "優先資源產出，加速發展",
            "raider": "投資戰鬥力，用英雄掠奪綠洲",
            "attacker": "投資攻擊加成，最大化軍隊傷害",
            "defender": "投資防禦加成，增強防禦效果",
        },
    },
    "adventures": {
        "title": "冒險系統",
        "description": "如何有效利用冒險",
        "tips": [
            "優先選擇低風險冒險保持英雄存活",
            "收集藥膏保持英雄健康",
            "第一個冒險盡量取得馬匹",
            "英雄大廈等級影響冒險位置",
        ],
        "rewards": ["銀幣", "藥膏", "裝備", "馬匹", "資源", "經驗"],
    },
    "equipment": {
        "title": "英雄裝備",
        "description": "推薦的英雄裝備配置",
        "early_game": {
            "helmet": "覺醒頭盔（更多經驗=更快升級）",
            "armor": "輕型分段/鱗甲（減傷比純力量更有效）",
            "boots": "小馬刺（騎乘速度加成）",
            "accessory": "小地圖（更快返回）",
            "mount": "任何馬匹（提升速度）",
        },
    },
}

# 文化點系統
CULTURE_POINTS_GUIDE = {
    "basics": {
        "title": "CP 基礎",
        "description": "CP 決定你可以擁有多少村莊",
        "sources": [
            "建築物每日產出",
            "城鎮廳慶典",
            "藝術品（冒險或拍賣獲得）",
        ],
    },
    "celebrations": {
        "small": {
            "cp": f"本村每日 CP 產量，x1 上限 {celebration_cap('small', 1)}",
            "cp_cap_x1": celebration_cap("small", 1),
            "cost": "6,400／6,650／5,940／1,340（糧食待 ts11 驗證）",
            "requirement": "城鎮廳1級",
        },
        "great": {
            "cp": f"全帳號每日 CP 產量，x1 上限 {celebration_cap('great', 1)}",
            "cp_cap_x1": celebration_cap("great", 1),
            "cost": "29,700／33,250／32,000／6,700（待 ts11 驗證）",
            "requirement": "城鎮廳10級",
        },
        "tip": "慶典給的 CP＝每日 CP 產量（有上限）；x3／x5 上限減半、x10 剩 1/4（官方 Game Versions and Speed）",
    },
    "efficient_buildings": {
        "title": "高效 CP 建築",
        "list": [
            {"name": "密藏室", "max_cp": 6, "cost_per_cp": 834},
            {"name": "主建築", "max_cp": 77, "cost_per_cp": 1220},
            {"name": "市場", "max_cp": 115, "cost_per_cp": 1461},
            {"name": "寶物庫", "max_cp": 230, "cost_per_cp": 15479},
        ],
    },
    "village_requirements": {
        "description": "每個新村莊需要的累積 CP（x1；第 3 村起待 ts11 驗證）",
        "formula": "官方表；約 1600 ÷ 速度 × (村數−1)^2.3",
        "example": [
            {"village": v, "cp_needed": village_requirements(1)[v - 1]}
            for v in (2, 3, 4, 5)
        ],
    },
}


def get_strategy_by_phase(phase: str) -> dict[str, Any]:
    """根據遊戲階段取得相關策略."""
    phase_mapping: dict[str, dict[str, Any]] = {
        "early": EARLY_GAME_STRATEGIES,
        "mid": MID_GAME_STRATEGIES,
        "late": LATE_GAME_STRATEGIES,
    }
    return phase_mapping.get(phase, {})


def get_defense_strategies() -> dict:
    """取得防禦策略."""
    return DEFENSE_STRATEGIES


def get_hero_guide() -> dict:
    """取得英雄指南."""
    return HERO_GUIDE


def get_culture_points_guide() -> dict:
    """取得文化點指南."""
    return CULTURE_POINTS_GUIDE


def search_strategies(keyword: str) -> list[dict]:
    """搜尋相關策略."""
    results = []
    keyword_lower = keyword.lower()

    all_strategies = {
        **EARLY_GAME_STRATEGIES,
        **MID_GAME_STRATEGIES,
        **LATE_GAME_STRATEGIES,
        **DEFENSE_STRATEGIES,
    }

    for key, strategy in all_strategies.items():
        if keyword_lower in key.lower() or keyword_lower in str(strategy).lower():
            results.append({"key": key, "strategy": strategy})

    return results

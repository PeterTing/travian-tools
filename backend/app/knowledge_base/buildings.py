"""Travian 建築物資料庫."""

import json
from pathlib import Path
from typing import cast

INGAME_NAMES_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "static" / "ingame_names.json"
)

BUILDINGS_DATA = {
    # 資源田
    "woodcutter": {
        "name_zh": "伐木場",
        "name_en": "Woodcutter",
        "category": "resource",
        "max_level": 18,
        "capital_max_level": "無限",
        "description": "生產木材",
        "cp_per_level": [0, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 22, 27],
    },
    "clay_pit": {
        "name_zh": "泥坑",
        "name_en": "Clay Pit",
        "category": "resource",
        "max_level": 18,
        "capital_max_level": "無限",
        "description": "生產磚塊",
        "cp_per_level": [0, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 22, 27],
    },
    "iron_mine": {
        "name_zh": "鐵礦場",
        "name_en": "Iron Mine",
        "category": "resource",
        "max_level": 18,
        "capital_max_level": "無限",
        "description": "生產鐵礦",
        "cp_per_level": [0, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 22, 27],
    },
    "cropland": {
        "name_zh": "農場",
        "name_en": "Cropland",
        "category": "resource",
        "max_level": 18,
        "capital_max_level": "無限",
        "description": "生產糧食",
        "cp_per_level": [0, 1, 1, 1, 2, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 22],
    },
    # 資源加成建築
    "sawmill": {
        "name_zh": "鋸木廠",
        "name_en": "Sawmill",
        "category": "resource_bonus",
        "max_level": 5,
        "description": "增加木材產量5%每級，最高25%",
        "requirements": ["伐木場 10級", "村莊大樓 5級"],
        "bonus_per_level": "5%",
    },
    "brickyard": {
        "name_zh": "磚廠",
        "name_en": "Brickyard",
        "category": "resource_bonus",
        "max_level": 5,
        "description": "增加磚塊產量5%每級，最高25%",
        "requirements": ["泥坑 10級", "村莊大樓 5級"],
        "bonus_per_level": "5%",
    },
    "iron_foundry": {
        "name_zh": "鋼鐵鑄造廠",
        "name_en": "Iron Foundry",
        "category": "resource_bonus",
        "max_level": 5,
        "description": "增加鐵礦產量5%每級，最高25%",
        "requirements": ["鐵礦場 10級", "村莊大樓 5級"],
        "bonus_per_level": "5%",
    },
    "grain_mill": {
        "name_zh": "麵粉廠",
        "name_en": "Grain Mill",
        "category": "resource_bonus",
        "max_level": 5,
        "description": "增加糧食產量5%每級，最高25%",
        "requirements": ["農場 5級", "村莊大樓 5級"],
        "bonus_per_level": "5%",
    },
    "bakery": {
        "name_zh": "麵包店",
        "name_en": "Bakery",
        "category": "resource_bonus",
        "max_level": 5,
        "description": "增加糧食產量5%每級，最高25%（與麵粉廠疊加）",
        "requirements": ["農場 10級", "村莊大樓 5級", "麵粉廠 5級"],
        "bonus_per_level": "5%",
    },
    # 儲存建築
    "warehouse": {
        "name_zh": "倉庫",
        "name_en": "Warehouse",
        "category": "storage",
        "max_level": 20,
        "description": "儲存木材、磚塊、鐵礦",
        "capacity_per_level": [
            0,
            1200,
            1700,
            2300,
            3100,
            4000,
            5000,
            6300,
            7800,
            9600,
            11800,
            14400,
            17600,
            21400,
            26000,
            31600,
            38400,
            46600,
            56600,
            68800,
            80000,
        ],
    },
    "granary": {
        "name_zh": "穀倉",
        "name_en": "Granary",
        "category": "storage",
        "max_level": 20,
        "description": "儲存糧食",
        "capacity_per_level": [
            0,
            1200,
            1700,
            2300,
            3100,
            4000,
            5000,
            6300,
            7800,
            9600,
            11800,
            14400,
            17600,
            21400,
            26000,
            31600,
            38400,
            46600,
            56600,
            68800,
            80000,
        ],
    },
    "great_warehouse": {
        "name_zh": "大倉庫",
        "name_en": "Great Warehouse",
        "category": "storage",
        "max_level": 20,
        "description": "只能建在世界奇蹟村，容量約倉庫的2.5倍",
        "requirements": ["世界奇蹟村"],
    },
    "great_granary": {
        "name_zh": "大穀倉",
        "name_en": "Great Granary",
        "category": "storage",
        "max_level": 20,
        "description": "只能建在世界奇蹟村，容量約穀倉的2.5倍",
        "requirements": ["世界奇蹟村"],
    },
    # 軍事建築
    "barracks": {
        "name_zh": "兵營",
        "name_en": "Barracks",
        "category": "military",
        "max_level": 20,
        "description": "訓練步兵單位，每級減少10%訓練時間",
        "requirements": ["村莊大樓 3級", "集結點 1級"],
        "training_reduction": "每級-10%（20級時為0.9^19 ≈ 0.135倍）",
    },
    "stable": {
        "name_zh": "馬廄",
        "name_en": "Stable",
        "category": "military",
        "max_level": 20,
        "description": "訓練騎兵單位，每級減少10%訓練時間",
        "requirements": ["研究院 5級", "盔甲廠 3級"],
        "training_reduction": "每級-10%",
    },
    "workshop": {
        "name_zh": "工場",
        "name_en": "Workshop",
        "category": "military",
        "max_level": 20,
        "description": "建造攻城器械（衝撞車／破城槌、投石類攻城武器）",
        "requirements": ["研究院 10級", "村莊大樓 5級"],
    },
    "great_barracks": {
        "name_zh": "大兵營",
        "name_en": "Great Barracks",
        "category": "military",
        "max_level": 20,
        "description": "額外的步兵訓練設施，可與兵營同時運作",
        "requirements": ["兵營 20級"],
    },
    "great_stable": {
        "name_zh": "大馬廄",
        "name_en": "Great Stable",
        "category": "military",
        "max_level": 20,
        "description": "額外的騎兵訓練設施，可與馬廄同時運作",
        "requirements": ["馬廄 20級"],
    },
    "academy": {
        "name_zh": "研究院",
        "name_en": "Academy",
        "category": "military",
        "max_level": 20,
        "description": "研究新兵種，解鎖高階單位",
        "requirements": ["村莊大樓 3級", "兵營 3級"],
        "key_levels": {
            10: "解鎖城鎮廳（開第二村必需）",
            15: "解鎖工場",
            20: "解鎖所有兵種研究",
        },
    },
    # T4 只有一棟盔甲廠（gid 13），同時升級攻擊和防禦（T3 的兩棟舊建築已合併）
    "blacksmith": {
        "name_zh": "盔甲廠",
        "name_en": "Smithy",
        "category": "military",
        "max_level": 20,
        "description": "升級部隊的攻擊力和防禦力",
        "requirements": ["村莊大樓 3級", "研究院 1級"],
    },
    # 防禦建築
    "city_wall": {
        "name_zh": "城牆（羅馬）",
        "name_en": "City Wall",
        "category": "defense",
        "max_level": 20,
        "tribe": "romans",
        "description": "提供最高防禦加成",
        "defense_bonus_per_level": "3%",
        "max_defense_bonus": "81%（20級）",
    },
    "earth_wall": {
        "name_zh": "土牆（日耳曼人）",
        "name_en": "Earth Wall",
        "category": "defense",
        "max_level": 20,
        "tribe": "teutons",
        "description": "較難被摧毀但防禦加成較低",
        "defense_bonus_per_level": "2.5%",
        "durability": "高",
    },
    "palisade": {
        "name_zh": "木牆（高盧）",
        "name_en": "Palisade",
        "category": "defense",
        "max_level": 20,
        "tribe": "gauls",
        "description": "防禦加成適中",
        "defense_bonus_per_level": "2.5%",
    },
    "trapper": {
        "name_zh": "陷阱機（高盧）",
        "name_en": "Trapper",
        "category": "defense",
        "max_level": 20,
        "tribe": "gauls",
        "description": "製造陷阱捕捉敵方部隊",
        "max_traps": "200（英雄宅20級時400）",
    },
    # 行政建築
    "main_building": {
        "name_zh": "村莊大樓",
        "name_en": "Main Building",
        "category": "infrastructure",
        "max_level": 20,
        "description": "縮短建造時間，10級可拆除建築",
        "time_reduction": "每級2-3%，20級時建造速度為2倍",
        "key_levels": {
            10: "可以拆除建築",
            15: "建議的穩定等級",
            20: "最快建造速度",
        },
    },
    "rally_point": {
        "name_zh": "集結點",
        "name_en": "Rally Point",
        "category": "infrastructure",
        "max_level": 20,
        "description": "部隊集結和出征的地點",
        "features": [
            "可以查看進行中的軍事行動",
            "可以發送增援",
            "可以召回部隊",
        ],
    },
    "marketplace": {
        "name_zh": "市場",
        "name_en": "Marketplace",
        "category": "infrastructure",
        "max_level": 20,
        "description": "與其他玩家交易資源",
        "merchants_per_level": "商人數量隨等級增加",
        "cp_production": "每日產出較多 CP",
    },
    "trade_office": {
        "name_zh": "交易所",
        "name_en": "Trade Office",
        "category": "infrastructure",
        "max_level": 20,
        "description": "增加商人載重量",
        "requirements": ["市場 20級", "馬廄 10級"],
        "bonus": "每級增加商人載重量",
    },
    "embassy": {
        "name_zh": "大使館",
        "name_en": "Embassy",
        "category": "infrastructure",
        "max_level": 20,
        "description": "加入或創建聯盟",
        "key_levels": {
            1: "可以加入聯盟",
            3: "可以創建聯盟",
        },
    },
    "town_hall": {
        "name_zh": "城鎮廳",
        "name_en": "Town Hall",
        "category": "infrastructure",
        "max_level": 20,
        "description": "舉辦慶典獲得 CP",
        "requirements": ["村莊大樓 10級", "研究院 10級"],
        "celebrations": {
            # CP＝每日 CP 產量（小：本村；大：全帳號），cp 欄是 x1 上限
            "small": {
                "cp": 500,
                "cp_rule": "本村每日 CP 產量，x1 上限 500",
                "cost": 20330,
                "requirement": "1級",
            },
            "great": {
                "cp": 2000,
                "cp_rule": "全帳號每日 CP 產量，x1 上限 2000",
                "cost": 101650,
                "requirement": "10級",
            },
        },
    },
    "residence": {
        "name_zh": "行宮",
        "name_en": "Residence",
        "category": "expansion",
        "max_level": 20,
        "description": "訓練開拓者，提供忠誠度保護",
        "requirements": ["村莊大樓 5級"],
        "key_levels": {
            10: "可訓練3個開拓者",
            20: "最大忠誠度保護",
        },
        "note": "不能與皇宮同時存在",
    },
    "palace": {
        "name_zh": "皇宮",
        "name_en": "Palace",
        "category": "expansion",
        "max_level": 20,
        "description": "可設定首都，訓練3個開拓者",
        "requirements": ["村莊大樓 5級", "大使館 1級"],
        "features": [
            "整個帳號只能有一個皇宮",
            "皇宮所在村莊成為首都",
            "首都的資源田可無限升級",
        ],
    },
    "treasury": {
        "name_zh": "寶物庫",
        "name_en": "Treasury",
        "category": "expansion",
        "max_level": 20,
        "description": "存放神器",
        "requirements": ["村莊大樓 10級"],
        "cp_production": "高 CP 產出（230點/最高級）",
    },
    "heros_mansion": {
        "name_zh": "英雄宅",
        "name_en": "Hero's Mansion",
        "category": "hero",
        "max_level": 20,
        "description": "管理英雄和佔領綠洲",
        "requirements": ["村莊大樓 3級", "集結點 1級"],
        "oasis_slots": {
            10: "1個綠洲",
            15: "2個綠洲",
            20: "3個綠洲",
        },
    },
    "tournament_square": {
        "name_zh": "競技場",
        "name_en": "Tournament Square",
        "category": "military",
        "max_level": 20,
        "description": "增加部隊20格以外的移動速度",
        "requirements": ["集結點 15級"],
        "speed_bonus": "每級+20%速度（僅超過20格的距離加速；S71）",
    },
    "cranny": {
        "name_zh": "山洞",
        "name_en": "Cranny",
        "category": "defense",
        "max_level": 10,
        "description": "保護資源不被掠奪",
        "capacity_per_level": {
            "normal": "每級保護100-200資源",
            "gauls": "高盧容量1.5倍",
        },
        "note": "日耳曼人英雄可穿透20%山洞",
    },
    # 部族特殊建築
    "brewery": {
        "name_zh": "釀酒廠（日耳曼人）",
        "name_en": "Brewery",
        "category": "special",
        "tribe": "teutons",
        "max_level": 20,
        "description": "增加攻擊力但減少農作物產量",
        "requirements": ["集結點 20級", "穀倉 20級"],
    },
    "horse_drinking_trough": {
        "name_zh": "放牧水槽（羅馬）",
        "name_en": "Horse Drinking Trough",
        "category": "special",
        "tribe": "romans",
        "max_level": 20,
        "description": "減少騎兵糧食消耗",
        "bonus": "每級減少1%騎兵糧食消耗，最高20%",
    },
    "waterworks": {
        "name_zh": "供水系統（埃及）",
        "name_en": "Waterworks",
        "category": "special",
        "tribe": "egyptians",
        "max_level": 20,
        "description": "增加綠洲加成",
    },
    "command_center": {
        "name_zh": "指揮中心（匈奴）",
        "name_en": "Command Center",
        "category": "special",
        "tribe": "huns",
        "max_level": 20,
        "description": "提供額外擴張選項",
    },
    "asclepeion": {
        "name_zh": "阿斯克勒庇俄斯神殿（斯巴達）",
        "name_en": "Asclepeion",
        "category": "special",
        "tribe": "spartans",
        "max_level": 20,
        "description": "恢復戰鬥中陣亡的部隊",
        "recovery_rate": "最高60%",
    },
    "harbor": {
        "name_zh": "港口",
        "name_en": "Harbor",
        "category": "special",
        "max_level": 20,
        "description": "建造船隻進行海上運輸和掠奪",
        "viking_bonus": "維京港口船速24格/小時（其他18格/小時）",
    },
    # 世界奇蹟
    "world_wonder": {
        "name_zh": "世界奇蹟",
        "name_en": "World Wonder",
        "category": "endgame",
        "max_level": 100,
        "description": "第一個建到100級的聯盟獲勝",
        "requirements": [
            "建築藍圖（1張可建到49級，2張可建到100級）",
            "世界奇蹟村",
        ],
        "special_rules": [
            "建造時間縮短50%",
            "部隊糧食消耗減半",
            "不能使用即時完成",
            "不能使用大師建築師",
            "不能使用NPC交易",
        ],
    },
}


def _apply_ingame_names() -> None:
    """建築中文名照遊戲內名稱表（ingame_names.json，#34 PM）；舊名放 aliases_zh，只給查詢用."""
    names = json.loads(INGAME_NAMES_PATH.read_text(encoding="utf-8"))["buildings"]
    for bid, b in BUILDINGS_DATA.items():
        row = names.get(bid)
        if row:
            b["name_zh"] = row["zh"]
            b["aliases_zh"] = row["aliases"]


_apply_ingame_names()


def get_building_info(building_name: str) -> dict | None:
    """取得建築物資訊：英文 id、遊戲內名稱或舊名都可以."""
    building_key = building_name.lower().replace(" ", "_").replace("'", "")
    for b in BUILDINGS_DATA.values():
        aliases = cast(list[str], b.get("aliases_zh", []))
        if building_name == b["name_zh"] or building_name in aliases:
            return b
    return BUILDINGS_DATA.get(building_key)


def get_buildings_by_category(category: str) -> dict:
    """取得特定類別的建築物."""
    return {k: v for k, v in BUILDINGS_DATA.items() if v.get("category") == category}


def get_all_buildings() -> dict:
    """取得所有建築物."""
    return BUILDINGS_DATA

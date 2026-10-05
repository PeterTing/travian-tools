"""RAG (Retrieval-Augmented Generation) 知識檢索服務."""

from pathlib import Path
from typing import Any

from app.knowledge_base.buildings import (
    BUILDINGS_DATA,
)
from app.knowledge_base.strategies import (
    CULTURE_POINTS_GUIDE,
    DEFENSE_STRATEGIES,
    EARLY_GAME_STRATEGIES,
    HERO_GUIDE,
    LATE_GAME_STRATEGIES,
    MID_GAME_STRATEGIES,
)
from app.knowledge_base.tribes import TRIBES_DATA

# Path to docs/knowledge/ markdown topic files (Phase 1 additions)
# Points at the worktree-local docs/knowledge directory. When running from a
# different CWD, override via BROWSE_KB_DIR env var (unset by default).
_KNOWLEDGE_DIR = Path(__file__).resolve().parents[3] / "docs" / "knowledge"

# Topic key (matches TOPIC_KEYWORDS below) → filename in docs/knowledge/
# Each markdown file cites its Travian Support source at the top.
_MARKDOWN_TOPICS: dict[str, str] = {
    "siege": "siege-and-catapult.md",
    "loyalty": "loyalty-and-conquest.md",
    "wall_durability": "wall-durability.md",
    "hero_system": "hero-system.md",
    "artifacts_md": "artifacts.md",
    "town_hall": "town-hall-celebrations.md",
    "tournament_square": "tournament-square-speed.md",
    "npc_village": "npc-village-template.md",
}


class TravianKnowledgeBase:
    """Travian 知識庫檢索服務."""

    # 關鍵字到主題的映射
    TOPIC_KEYWORDS = {
        "tribe": [
            "部族",
            "種族",  # 使用者可能還是這樣問，保留當搜尋同義詞
            "羅馬",
            "高盧",
            "條頓",
            "埃及",
            "匈奴",
            "斯巴達",
            "維京",
            "romans",
            "gauls",
            "teutons",
            "egyptians",
            "huns",
            "spartans",
            "vikings",
            "選擇部族",
            "選擇種族",
        ],
        "troops": [
            "兵種",
            "部隊",
            "軍隊",
            "步兵",
            "騎兵",
            "攻城",
            "投石車",
            "攻城槌",
            "偵察",
            "拓荒者",
            "防禦兵",
            "攻擊兵",
            "棍棒兵",
            "方陣兵",
            "軍團兵",
            "禁衛兵",
            "狂戰士",
            "troops",
            "army",
        ],
        "buildings": [
            "建築",
            "升級",
            "主建築",
            "兵營",
            "馬廄",
            "研究院",
            "城鎮廳",
            "行宮",
            "皇宮",
            "倉庫",
            "糧倉",
            "資源田",
            "伐木場",
            "農田",
            "building",
            "construct",
        ],
        "early_game": [
            "新手",
            "開局",
            "早期",
            "初期",
            "第一",
            "開始",
            "前幾天",
            "新手保護",
            "任務",
            "beginning",
            "early",
            "start",
            "first",
        ],
        "second_village": [
            "第二村",
            "開村",
            "二村",
            "拓荒",
            "文化點",
            "慶典",
            "派對",
            "second village",
            "settle",
            "culture points",
        ],
        "capital": [
            "首都",
            "15田",
            "9田",
            "cropper",
            "15c",
            "9c",
            "綠洲",
            "oasis",
            "capital",
        ],
        "raiding": [
            "掠奪",
            "搶劫",
            "農場",
            "farming",
            "raiding",
            "raid",
            "farm",
            "資源獲取",
        ],
        "defense": [
            "防禦",
            "防守",
            "守",
            "鐵砧",
            "城牆",
            "增援",
            "defense",
            "defend",
            "anvil",
            "reinforce",
        ],
        "attack": [
            "攻擊",
            "進攻",
            "打",
            "錘子",
            "hammer",
            "attack",
            "offense",
            "offensive",
        ],
        "hero": [
            "英雄",
            "冒險",
            "屬性",
            "裝備",
            "hero",
            "adventure",
            "equipment",
        ],
        "world_wonder": [
            "世界奇蹟",
            "WW",
            "終局",
            "神器",
            "建築藍圖",
            "world wonder",
            "endgame",
            "artifact",
        ],
        "alliance": [
            "聯盟",
            "協調",
            "合作",
            "alliance",
            "coordination",
            "team",
        ],
        # Phase 1 additions — each key maps to a docs/knowledge/*.md file
        "siege": [
            "催化彈",
            "投石車",
            "投石",
            "攻城武器",
            "破城槌",
            "ram",
            "catapult",
            "cat",
            "siege",
            "殺村",
            "摧毀",
            "拆除",
            "demolish",
            "destruction",
        ],
        "loyalty": [
            "忠誠度",
            "忠誠",
            "征服",
            "酋長",
            "貴族",
            "拓荒者",
            "chief",
            "senator",
            "chieftain",
            "loyalty",
            "conquer",
            "tablet of law",
        ],
        "wall_durability": [
            "城牆",
            "耐久",
            "durability",
            "wall",
            "palisade",
            "earth wall",
            "city wall",
        ],
        "hero_system": [
            "英雄",
            "冒險",
            "物品",
            "屬性",
            "auction",
            "auction house",
            "revival",
            "馬",
            "mount",
            "boots",
        ],
        "artifacts_md": [
            "神器",
            "artifact",
            "artefact",
            "architect",
            "boots of mercury",
            "stonemason",
            "world wonder plan",
        ],
        "town_hall": [
            "城鎮廳",
            "town hall",
            "慶典",
            "celebration",
            "大慶典",
            "great celebration",
            "brewery",
            "文化點生產",
            "cp production",
        ],
        "tournament_square": [
            "競技場",
            "tournament square",
            "ts level",
            "長程速度",
            "long-range",
            "30 格",
            "30 field",
        ],
        "npc_village": [
            "npc 村",
            "npc village",
            "倉儲村",
            "轉換村",
            "supply hub",
            "storage village",
        ],
    }

    def __init__(self) -> None:
        """初始化知識庫."""
        self.tribes: dict[str, Any] = TRIBES_DATA
        self.buildings: dict[str, Any] = BUILDINGS_DATA
        self.early_strategies: dict[str, Any] = EARLY_GAME_STRATEGIES
        self.mid_strategies: dict[str, Any] = MID_GAME_STRATEGIES
        self.late_strategies: dict[str, Any] = LATE_GAME_STRATEGIES
        self.defense_strategies: dict[str, Any] = DEFENSE_STRATEGIES
        self.hero_guide: dict[str, Any] = HERO_GUIDE
        self.culture_guide: dict[str, Any] = CULTURE_POINTS_GUIDE

        # Phase 1 additions — load markdown topic files from docs/knowledge/
        # Each file is self-contained with Travian Support citations at top.
        self.markdown_topics: dict[str, str] = self._load_markdown_topics()

    def _load_markdown_topics(self) -> dict[str, str]:
        """Load Phase 1 markdown knowledge files into memory.

        Returns a dict mapping topic key (matches TOPIC_KEYWORDS) to file
        content. Failures are silent (file may be missing in some deploys);
        `_retrieve_from_markdown` returns empty list when file not loaded.
        """
        loaded: dict[str, str] = {}
        for topic_key, filename in _MARKDOWN_TOPICS.items():
            try:
                path = _KNOWLEDGE_DIR / filename
                loaded[topic_key] = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
        return loaded

    def _detect_topics(self, query: str) -> list[str]:
        """檢測查詢相關的主題."""
        query_lower = query.lower()
        detected_topics = []

        for topic, keywords in self.TOPIC_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in query_lower:
                    if topic not in detected_topics:
                        detected_topics.append(topic)
                    break

        return detected_topics

    def _detect_tribe(self, query: str) -> str | None:
        """檢測查詢中提到的部族."""
        tribe_mapping = {
            "羅馬": "romans",
            "romans": "romans",
            "roman": "romans",
            "高盧": "gauls",
            "gauls": "gauls",
            "gaul": "gauls",
            "條頓": "teutons",
            "teutons": "teutons",
            "teuton": "teutons",
            "埃及": "egyptians",
            "egyptians": "egyptians",
            "egyptian": "egyptians",
            "匈奴": "huns",
            "huns": "huns",
            "hun": "huns",
            "斯巴達": "spartans",
            "spartans": "spartans",
            "spartan": "spartans",
            "維京": "vikings",
            "vikings": "vikings",
            "viking": "vikings",
        }

        query_lower = query.lower()
        for keyword, tribe in tribe_mapping.items():
            if keyword in query_lower:
                return tribe
        return None

    def retrieve(
        self, query: str, player_context: dict | None = None, max_results: int = 5
    ) -> list[dict[str, Any]]:
        """根據查詢檢索相關知識.

        Args:
            query: 用戶查詢
            player_context: 玩家上下文（部族、天數等）
            max_results: 最大返回結果數

        Returns:
            相關知識片段列表
        """
        results = []

        # 檢測主題和部族
        topics = self._detect_topics(query)
        detected_tribe = self._detect_tribe(query)

        # 如果有玩家上下文，優先使用玩家的部族
        player_tribe = None
        if player_context:
            player_tribe = player_context.get("tribe")
            if player_tribe:
                player_tribe = player_tribe.lower()

        # 使用的部族（優先使用查詢中的部族，其次是玩家部族）
        active_tribe = detected_tribe or player_tribe

        # 根據主題檢索
        if "tribe" in topics or active_tribe:
            results.extend(self._retrieve_tribe_info(active_tribe, query))

        if "troops" in topics:
            results.extend(self._retrieve_troop_info(active_tribe, query))

        if "buildings" in topics:
            results.extend(self._retrieve_building_info(query))

        if "early_game" in topics or "second_village" in topics:
            results.extend(self._retrieve_early_game_info(query))

        if "capital" in topics:
            results.extend(self._retrieve_capital_info())

        if "raiding" in topics:
            results.extend(self._retrieve_raiding_info(active_tribe))

        if "defense" in topics:
            results.extend(self._retrieve_defense_info(active_tribe))

        if "attack" in topics:
            results.extend(self._retrieve_attack_info())

        if "hero" in topics:
            results.extend(self._retrieve_hero_info())

        if "world_wonder" in topics or "alliance" in topics:
            results.extend(self._retrieve_endgame_info())

        # Phase 1 markdown-based topics
        for md_topic in _MARKDOWN_TOPICS:
            if md_topic in topics:
                results.extend(self._retrieve_from_markdown(md_topic))

        # 如果沒有檢測到特定主題，根據玩家階段提供通用建議
        if not topics and player_context:
            day = player_context.get("day", 1)
            if day <= 7:
                results.extend(self._retrieve_early_game_info(query))
            elif day <= 30:
                results.extend(self._retrieve_mid_game_info())
            else:
                results.extend(self._retrieve_late_game_info())

        # 去重並限制結果數量
        seen = set()
        unique_results = []
        for result in results:
            key = result.get("title", "") + str(result.get("content", ""))[:100]
            if key not in seen:
                seen.add(key)
                unique_results.append(result)

        return unique_results[:max_results]

    def _retrieve_tribe_info(self, tribe: str | None, query: str) -> list[dict]:
        """檢索部族資訊."""
        results = []

        if tribe and tribe in self.tribes:
            tribe_data = self.tribes[tribe]
            results.append(
                {
                    "title": f"{tribe_data['name_zh']}部族特性",
                    "content": self._format_tribe_summary(tribe_data),
                    "relevance": "high",
                }
            )

        # 如果問到部族比較，提供比較資訊
        if "比較" in query or "選擇" in query or "哪個" in query:
            results.append(
                {
                    "title": "部族選擇建議",
                    "content": self._format_tribe_comparison(),
                    "relevance": "high",
                }
            )

        return results

    def _retrieve_troop_info(self, tribe: str | None, query: str) -> list[dict]:
        """檢索兵種資訊."""
        results = []

        # 搜尋特定兵種
        troop_keywords = [
            "棍棒兵",
            "方陣兵",
            "軍團兵",
            "禁衛兵",
            "狂戰士",
            "雷神騎兵",
            "長矛兵",
            "斧頭兵",
        ]
        for keyword in troop_keywords:
            if keyword in query:
                # 找到這個兵種的資訊
                for _tribe_key, tribe_data in self.tribes.items():
                    for _troop_key, troop_data in tribe_data.get("troops", {}).items():
                        if troop_data.get("name_zh") == keyword:
                            results.append(
                                {
                                    "title": f"{keyword}詳細資料",
                                    "content": self._format_troop_details(troop_data),
                                    "relevance": "high",
                                }
                            )
                            break

        # 如果有指定部族，列出該部族的兵種
        if tribe and tribe in self.tribes:
            tribe_data = self.tribes[tribe]
            results.append(
                {
                    "title": f"{tribe_data['name_zh']}兵種一覽",
                    "content": self._format_tribe_troops(tribe_data),
                    "relevance": "medium",
                }
            )

        return results

    def _retrieve_building_info(self, query: str) -> list[dict]:
        """檢索建築物資訊."""
        results = []

        # 搜尋特定建築
        for _building_key, building_data in self.buildings.items():
            if (
                building_data.get("name_zh", "") in query
                or building_data.get("name_en", "").lower() in query.lower()
            ):
                results.append(
                    {
                        "title": f"{building_data['name_zh']}資訊",
                        "content": self._format_building_details(building_data),
                        "relevance": "high",
                    }
                )

        # 如果問到建築順序
        if "順序" in query or "先蓋" in query or "優先" in query:
            results.append(
                {
                    "title": "建築優先順序建議",
                    "content": self._format_building_order(),
                    "relevance": "high",
                }
            )

        return results

    def _retrieve_early_game_info(self, query: str) -> list[dict]:
        """檢索早期遊戲資訊."""
        results = []

        # 前72小時攻略
        first_72h = self.early_strategies.get("first_72_hours", {})
        results.append(
            {
                "title": "前72小時攻略",
                "content": self._format_strategy(first_72h),
                "relevance": "high",
            }
        )

        # 第二村速開
        if "第二村" in query or "開村" in query or "文化點" in query:
            second_village = self.early_strategies.get("second_village_rush", {})
            results.append(
                {
                    "title": "第二村速開攻略",
                    "content": self._format_strategy(second_village),
                    "relevance": "high",
                }
            )

        return results

    def _retrieve_mid_game_info(self) -> list[dict]:
        """檢索中期遊戲資訊."""
        results = []

        # 首都選擇
        capital = self.mid_strategies.get("capital_selection", {})
        results.append(
            {
                "title": "首都選擇攻略",
                "content": self._format_strategy(capital),
                "relevance": "medium",
            }
        )

        # 村莊專業化
        specialization = self.mid_strategies.get("village_specialization", {})
        results.append(
            {
                "title": "村莊專業化攻略",
                "content": self._format_strategy(specialization),
                "relevance": "medium",
            }
        )

        return results

    def _retrieve_late_game_info(self) -> list[dict]:
        """檢索後期遊戲資訊."""
        results = []

        ww = self.late_strategies.get("world_wonder", {})
        results.append(
            {
                "title": "世界奇蹟攻略",
                "content": self._format_strategy(ww),
                "relevance": "medium",
            }
        )

        return results

    def _retrieve_capital_info(self) -> list[dict]:
        """檢索首都相關資訊."""
        capital = self.mid_strategies.get("capital_selection", {})
        return [
            {
                "title": "首都選擇完整指南",
                "content": self._format_strategy(capital),
                "relevance": "high",
            }
        ]

    def _retrieve_raiding_info(self, tribe: str | None) -> list[dict]:
        """檢索掠奪相關資訊."""
        results = []

        raiding = self.mid_strategies.get("raiding_strategy", {})
        results.append(
            {
                "title": "掠奪策略指南",
                "content": self._format_strategy(raiding),
                "relevance": "high",
            }
        )

        if tribe:
            tribe_efficiency = raiding.get("tribe_efficiency", {}).get(tribe, {})
            if tribe_efficiency:
                results.append(
                    {
                        "title": f"{self.tribes[tribe]['name_zh']}掠奪效率",
                        "content": f"評價: {tribe_efficiency.get('rating')}\n"
                        f"原因: {tribe_efficiency.get('reason')}",
                        "relevance": "high",
                    }
                )

        return results

    def _retrieve_defense_info(self, tribe: str | None) -> list[dict]:
        """檢索防禦相關資訊."""
        results = []

        troop_selection = self.defense_strategies.get("troop_selection", {})
        results.append(
            {
                "title": "防禦部隊選擇",
                "content": self._format_strategy(troop_selection),
                "relevance": "high",
            }
        )

        anvil_guide = self.defense_strategies.get("anvil_guide", {})
        results.append(
            {
                "title": "鐵砧指南",
                "content": self._format_strategy(anvil_guide),
                "relevance": "medium",
            }
        )

        if tribe and tribe in self.tribes:
            tribe_data = self.tribes[tribe]
            results.append(
                {
                    "title": f"{tribe_data['name_zh']}推薦防禦配置",
                    "content": tribe_data.get("recommended_defense_ratio", "平衡配置"),
                    "relevance": "high",
                }
            )

        return results

    def _retrieve_attack_info(self) -> list[dict]:
        """檢索攻擊相關資訊."""
        results = []

        alliance_coord = self.late_strategies.get("alliance_coordination", {})
        offense = alliance_coord.get("offense_coordination", {})
        if offense:
            results.append(
                {
                    "title": "攻擊協調策略",
                    "content": self._format_dict(offense),
                    "relevance": "high",
                }
            )

        return results

    def _retrieve_hero_info(self) -> list[dict]:
        """檢索英雄相關資訊."""
        results = []

        attributes = self.hero_guide.get("attributes", {})
        results.append(
            {
                "title": "英雄屬性配點指南",
                "content": self._format_strategy(attributes),
                "relevance": "high",
            }
        )

        adventures = self.hero_guide.get("adventures", {})
        results.append(
            {
                "title": "冒險系統指南",
                "content": self._format_strategy(adventures),
                "relevance": "medium",
            }
        )

        return results

    def _retrieve_endgame_info(self) -> list[dict]:
        """檢索終局相關資訊."""
        results = []

        ww = self.late_strategies.get("world_wonder", {})
        results.append(
            {
                "title": "世界奇蹟完整攻略",
                "content": self._format_strategy(ww),
                "relevance": "high",
            }
        )

        alliance = self.late_strategies.get("alliance_coordination", {})
        results.append(
            {
                "title": "聯盟協調指南",
                "content": self._format_strategy(alliance),
                "relevance": "medium",
            }
        )

        return results

    def _retrieve_from_markdown(self, topic_key: str) -> list[dict]:
        """從 Phase 1 markdown knowledge 檔案檢索.

        每個 markdown 檔案的 heading 引用 Travian Support 官方文章；
        內容會截斷到 4000 字以免超出 prompt 預算。
        """
        content = self.markdown_topics.get(topic_key)
        if not content:
            return []

        # Extract first-level heading for title
        lines = content.splitlines()
        title = topic_key.replace("_", " ").title()
        for line in lines[:5]:
            if line.startswith("# "):
                title = line[2:].strip()
                break

        # Truncate to keep prompt budget manageable
        truncated = content[:4000]
        if len(content) > 4000:
            truncated += "\n\n... (詳見 docs/knowledge/ 對應檔案)"

        return [
            {
                "title": title,
                "content": truncated,
                "relevance": "high",
                "source_file": f"docs/knowledge/{_MARKDOWN_TOPICS[topic_key]}",
            }
        ]

    # ========== 格式化方法 ==========

    def _format_tribe_summary(self, tribe_data: dict) -> str:
        """格式化部族摘要."""
        lines = [
            f"**{tribe_data['name_zh']} ({tribe_data['name_en']})**",
            f"描述: {tribe_data['description']}",
            f"玩法: {tribe_data['playstyle']}",
            "",
            "**優勢:**",
        ]
        for s in tribe_data.get("strengths", []):
            lines.append(f"- {s}")

        lines.append("")
        lines.append("**劣勢:**")
        for w in tribe_data.get("weaknesses", []):
            lines.append(f"- {w}")

        special = tribe_data.get("special_building", {})
        if special:
            lines.append("")
            lines.append(f"**特殊建築:** {special.get('name')}")
            lines.append(f"效果: {special.get('effect')}")

        merchant = tribe_data.get("merchant", {})
        if merchant:
            lines.append("")
            lines.append(
                f"**商人:** 容量 {merchant.get('capacity')}，"
                f"速度 {merchant.get('speed')} 格/小時"
            )

        lines.append(f"**英雄加成:** {tribe_data.get('hero_bonus', 'N/A')}")

        return "\n".join(lines)

    def _format_tribe_comparison(self) -> str:
        """格式化部族比較."""
        return """**部族選擇建議:**

**新手推薦:**
- 羅馬: 可以雙蓋，發展速度最快
- 高盧: 防禦強，開局安全

**進攻型玩家:**
- 條頓: 早期掠奪之王，棍棒兵成本最低
- 匈奴: 騎兵快速掠奪
- 維京: 狂戰士獨特能力

**防禦型玩家:**
- 埃及: 經濟最強，防禦穩定
- 高盧: 快速增援，1.5倍密藏室

**後期發展:**
- 斯巴達: 最強單位，神殿可恢復60%部隊"""

    def _format_tribe_troops(self, tribe_data: dict) -> str:
        """格式化部族兵種列表."""
        lines = [f"**{tribe_data['name_zh']}兵種:**\n"]

        for _troop_key, troop in tribe_data.get("troops", {}).items():
            lines.append(
                f"- **{troop['name_zh']}** ({troop['type']}): "
                f"攻擊{troop['attack']}/步防{troop['defense_infantry']}/"
                f"騎防{troop['defense_cavalry']} | "
                f"速度{troop['speed']} | 糧{troop['upkeep']}"
            )

        return "\n".join(lines)

    def _format_troop_details(self, troop: dict) -> str:
        """格式化兵種詳細資料."""
        cost = troop.get("cost", {})
        return f"""**{troop["name_zh"]}**
類型: {troop["type"]}
攻擊力: {troop["attack"]}
步兵防禦: {troop["defense_infantry"]}
騎兵防禦: {troop["defense_cavalry"]}
速度: {troop["speed"]} 格/小時
載重: {troop["capacity"]}
糧食消耗: {troop["upkeep"]}
成本: 木{cost.get("wood", 0)}/磚{cost.get("clay", 0)}/鐵{cost.get("iron", 0)}/糧{cost.get("crop", 0)}
訓練時間: {troop["training_time"]}
用途: {troop["role"]}"""

    def _format_building_details(self, building: dict) -> str:
        """格式化建築物詳細資料."""
        lines = [
            f"**{building['name_zh']} ({building['name_en']})**",
            f"類別: {building['category']}",
            f"最高等級: {building['max_level']}",
            f"描述: {building['description']}",
        ]

        if "requirements" in building:
            lines.append("需求: " + ", ".join(building["requirements"]))

        return "\n".join(lines)

    def _format_building_order(self) -> str:
        """格式化建築順序建議."""
        return """**早期建築優先順序:**

1. 主建築 → 10級（縮短建造時間，可拆除建築）
2. 所有資源田 → 2級
3. 集結點 → 1級
4. 倉庫/糧倉 → 適當等級
5. 資源田 → 5級
6. 研究院 → 10級（開城鎮廳必需）
7. 城鎮廳 → 1級以上（舉辦慶典）
8. 行宮 → 10級（訓練拓荒者）

**資源村建議:**
- 主建築 14-20級
- 所有資源田 8-10級
- 最小化其他建築"""

    def _format_strategy(self, strategy: dict) -> str:
        """格式化策略資訊."""
        lines = []

        if "title" in strategy:
            lines.append(f"**{strategy['title']}**")

        if "description" in strategy:
            lines.append(strategy["description"])
            lines.append("")

        if "key_points" in strategy:
            lines.append("**重點:**")
            for point in strategy["key_points"]:
                lines.append(f"- {point}")
            lines.append("")

        # 處理其他字典內容
        for key, value in strategy.items():
            if key in ["title", "description", "key_points"]:
                continue
            if isinstance(value, dict):
                lines.append(f"**{key}:**")
                lines.append(self._format_dict(value))
            elif isinstance(value, list):
                lines.append(f"**{key}:**")
                for item in value:
                    if isinstance(item, dict):
                        lines.append(self._format_dict(item))
                    else:
                        lines.append(f"- {item}")
                lines.append("")

        return "\n".join(lines)

    def _format_dict(self, d: dict, indent: int = 0) -> str:
        """格式化字典內容."""
        lines = []
        prefix = "  " * indent

        for key, value in d.items():
            if isinstance(value, dict):
                lines.append(f"{prefix}**{key}:**")
                lines.append(self._format_dict(value, indent + 1))
            elif isinstance(value, list):
                lines.append(f"{prefix}{key}:")
                for item in value:
                    lines.append(f"{prefix}  - {item}")
            else:
                lines.append(f"{prefix}- {key}: {value}")

        return "\n".join(lines)


# 單例實例
knowledge_base = TravianKnowledgeBase()


def retrieve_knowledge(
    query: str, player_context: dict | None = None, max_results: int = 5
) -> list[dict]:
    """便捷函數：檢索知識."""
    return knowledge_base.retrieve(query, player_context, max_results)


def format_knowledge_for_prompt(knowledge_list: list[dict]) -> str:
    """將知識列表格式化為適合放入 prompt 的字串."""
    if not knowledge_list:
        return ""

    lines = ["## 相關知識參考\n"]

    for i, item in enumerate(knowledge_list, 1):
        lines.append(f"### {i}. {item['title']}")
        lines.append(item["content"])
        lines.append("")

    return "\n".join(lines)

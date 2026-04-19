# Travco 競品分析 + 知識庫驗證報告

> 日期：2026-04-19
> 研究對象：travcotools.com（以 Plus 帳號 + TNC 聯盟 Leader 身分探索，39 個子頁面）、Travian 官方 Support、Lumi/Eggstra/Dave 攻略、frisovandijk.com、home.deds.nl/~tardis 工具、Google Sheets 參考
> 驗證範圍：`docs/knowledge/*.md`、`docs/PRD.md`
> 作者：Claude (IDEATE 流程)

---

## 0. Executive Summary（一頁）

### 0.1 問題摘要

使用者要求「Travian Tools 做到 Travco 的所有功能」，並同意「可以全部打掉重做」，但必須保留**個人工具（計算器、AI 顧問、遊戲知識庫）**。

### 0.2 三個核心洞察

1. **Travco 的定位 ≠ Travian Tools 的定位**。Travco 是**聯盟作戰協調平台**（報告、拉防、攻擊規劃、宝物、Farmlist、Discord bot）；Travian Tools 是**個人智能工具**（計算器、AI、知識庫）。兩者功能 **<10% 重疊**。如果要「做到 Travco 全部功能」，這不是補功能，是**新增一整個產品層**。

2. **現有 `docs/knowledge/*.md` 有多處關鍵缺口**。我們缺：地圖位置策略、階段化 siege 目標、3-chiefs setup、Great Celebrations / Townhall、NPC 村、Cropper 專屬 build order、CP 效率排序、攻城戰術（19 cata 殺村、loyalty 125、hero follow-home 防禦）。攻略中的 ROI 表、Oasis HM10/15/20 選擇邏輯、Feeder 傳貿路線計算也沒在我們的知識庫。

3. **計算器覆蓋度 Travian Tools 已經比 frisovandijk 廣**，但缺了幾個關鍵：**Optimal Village Builder**（輸入 cropper+oasis 出 build order）、**Crop Scouter**（從消耗推敵 Cropper 類型）、**Feeder Traderoute 精算**、**Number of Merchant Trips**、**Smithy Efficiency**。

### 0.3 推薦走向

**不建議全部打掉重做**。建議分三層疊加：
- **L1 個人智能工具**（保留並強化）：計算器套件、AI 顧問、知識庫 — 這是差異化核心
- **L2 聯盟協調平台**（新蓋）：Travco 的核心價值在這一層（拉防、攻擊規劃、宝物）
- **L3 自動化執行**（PRD 已定義但未做）：半自動建造、提醒、排程

L2 是最大的新建工程量，但也是對齊 Travco 的必要條件。L1+L3 是差異化。

---

## 1. Travco 功能完整盤點（39 子頁面）

### 1.1 訂閱層級（2026-04 實地驗證）

| 層級 | 月費 | 核心功能 | 鎖定功能 |
|---|---|---|---|
| Basic（免費） | 0 € | 報告來襲、存战报、成员、村庄管理、送請防御、分析來襲 | |
| **Plus** | 2.99 € | Basic + 搶羊名單分析 + 擴充 + 村莊圖表 + 無限群組 + CSV + 個人攻擊計劃 + 佯攻部隊計算 + 攻擊前提醒 + TS 等級 + TS 優化器 + 手動攻擊報告 | |
| **Professional** | 6.99 € | Plus + 宝物 + 聯攻攻擊計劃 + 資源接收者/PUSH + Discord bot + 發送防御數據庫 + CSV 導出 | |

### 1.2 主選單 10 大區塊

#### 村庄概览 `/alliances/<tag>/home/`
- 聯盟所有村莊資料表：座標、人口、TS 等級、兵力（off/def）、在線時間
- 欄位：村庄 / 竞技场 / 人口 / 攻擊力 / 防禦力 等

#### 防御（核心）
| 子頁 | URL | 功能 |
|---|---|---|
| 来袭攻击 | `/defense/personal/<tag>/` | 個人來袭攻擊列表（波數、影響次數、最近影響時間） |
| 攻击玩家 | `/defense/planning/<tag>/attacking-heroes/` | 攻擊來源玩家分析 |
| 普通拉防 | `/defense/<tag>/` | 聯盟內活躍拉防呼叫 |
| 插防 | `/defense/in-between-attacks/<tag>/` | 攻擊間隙的防禦呼叫 |
| 常驻 | `/defense/permanent/<tag>/` | 長期駐防 |
| 請求拉防 ×3 | `/defense/requested/<tag>/...` | 向成員請求的防禦（普通/插防/常駐） |
| 防御规划 | `/defense/planning/<tag>/` | 拉防/攻擊者/防守者總覽 + 過濾器（Real/Fake/Catapults/Rams/Hero/Conquer） |

**核心流程**：防守者發送拉防請求 → Leader 分配 → 成員承接 → 備註追蹤

#### 攻击（核心）
| 子頁 | URL | 功能 |
|---|---|---|
| 我的攻击 | `/attacks/personal/<tag>-<user>/` | 自己發送的攻擊總覽 + 佯攻部隊計算 |
| 个人目标 | `/attacks/personal/target/...` | 自己攻擊目標清單（座標、優先級、攻擊類型、備註） |
| 个人攻击计划 | `/attacks/personal/plan/...` | 計劃列表（名稱、波次、投石數、影響時間） |
| 聯攻目標 | `/attacks/group/target/<tag>/` | 聯盟攻擊目標（+ 標籤分類） |
| 標記村莊 | `/alliances/<tag>/villages/?ordering=-off_strength` | 所有聯盟成員村莊按 off 力量排序 |
| 聯攻攻击计划 🔒Pro | `/attacks/group/plan/<tag>/` | Professional 專屬 |

**計劃詳情三個分頁**（每個 plan）：
- `/attacks/personal/plan/<id>/attackers/` — 參與攻擊的成員村莊 + off/cav 兵力
- `/attacks/personal/plan/<id>/targets/` — 目標清單
- `/attacks/plan/<id>/planning/` — **波次編輯器**（每個目標 → 每個攻擊者 → 每波兵力 + 時間）

**核心流程**：Leader 創建 plan → 加目標 → 指派 attackers → 為每個 target-attacker 編每一波 → TS 優化器計算發兵時間 → 成員執行

#### 宝物 (Artifacts)
| 子頁 | 存取 | 功能 |
|---|---|---|
| 我的村莊 | Plus | 打寶村的英雄靴/投石速度/TS/財庫大小 |
| 我的攻擊 | Plus | 我對宝物村的攻擊 |
| 聯盟村莊 | Pro | 全聯盟宝物村的上述欄位 |
| 宝物村莊 | Pro | **所有宝物村資料庫**（類型、等級、座標） |
| 宝物規劃 | Pro | 分配誰打哪個宝物 |

#### 推资 (Supply)
- PUSH（送糧進度 + 商人追蹤）
- 接收 PUSH（目標村設定）

#### 聯盟排行榜
- 成員（積分排序）
- 村莊（人口/攻擊/防禦排序）
- Troops（每個成員每個兵種即時數量）

#### 戰報
- 創建（上傳/貼文）
- 個人战报
- 聯盟战报
- 喜歡的攻擊報告

#### 領導功能（Leader-only）
- 設置（時區、描述、Discord bot 整合）
- 邀請成員（連結管理）
- 成員信息（身份、時區、入盟時間）
- **在線時間熱力圖**（24h × 每天）
- **15 種細粒度權限**（管理/防御/攻擊/宝物/通用）
- 未加入成員

#### 數據庫
- 英雄數據（公開）
- 拉防數據 🔒Pro
- 插防數據 🔒Pro
- 常駐數據 🔒Pro

#### 工具
- 搶羊名單（Farmlist analyser）— 成功率、平均搶到、距離、標籤
- 附近聯盟兵力（按座標/距離/兵種搜尋）
- 查找死羊（Inactive search，公開工具）

### 1.3 Travco 獨家核心機制

1. **三種拉防類型**：普通（attack 來前）、插防（attack 間隙）、常駐（長期）— 每種有「送方」「收方」兩面流程
2. **攻擊計劃波次編輯器**：目標矩陣 × 攻擊者矩陣 × 波次 × TS 優化器 — 聯盟作戰的作業系統
3. **Farmlist Analyser**：每個羊每次打的成功率、平均搶到、最後一次時間、佯攻部隊計算
4. **15 種權限（rank）系統**：Leader/General/Trusted/自定 → 控制誰能規劃攻擊、拉防、看數據
5. **Discord bot**：重要事件（來袭、完成、請求）幾秒內推播到 Discord 頻道
6. **Hero Detection**：分辨真假攻擊（英雄變化偵測）
7. **TS Optimizer**：根據所有攻擊者的 TS 等級、距離、目標時間，計算每個村莊最優發兵時間

---

## 2. frisovandijk.com 9 個計算器（Lumi 攻略推薦）

| 計算器 | 分類 | 輸入 | 輸出 |
|---|---|---|---|
| Optimal Village Builder | VILLAGE | cropper 類型（1-1-1-15 / 3-3-3-9 / 3-4-4-7）+ 3 個 oasis 配置 + Egyptians + Gold +25% + 目標 lvl | **最佳建造順序**（包含 bonus buildings 插入時機） |
| Return on Investment | ECO | from lvl + to lvl + gold | **Payback days** |
| Feeder Traderoutes | ECO | Party type + Town Hall lvl + 重複週期（1-24h） | **每條貿易路線資源量** |
| Number of Merchant Trips | ECO | — | 商隊趟數計算 |
| Total Resources | ECO | — | 累計資源估算 |
| Troop Training | TROOPS | 兵種 + 目標數量 + 建築等級 | 時間 + 成本 |
| Troop Costs | TROOPS | — | 訓練總成本 |
| Smithy Efficiency | TROOPS | smithy level | 升級效益 |
| Crop Scouter | TROOPS | — | **從消耗反推對手 Cropper 類型**（偵查用） |

---

## 3. 現有 Knowledge 驗證（逐項對照）

### 3.1 `travian-mechanics.md` 驗證

#### ✅ 正確
- 資源產出、Oasis/Plus/town bonus 建築
- 幾何成本公式 `Cost = Base × Factor^(L-1)`
- Culture Points 概念
- 4 類兵種（Infantry/Cavalry/Scouts/Siege）
- 建造佇列規則（1 / 2 Plus / Roman 1+1）

#### ❌ 需要修正
| 問題 | 現在寫的 | 應該是 |
|---|---|---|
| 種族數量 | 5 個（Roman/Gaul/Teuton/Hun/Egyptian） | **7 個**（加 Spartans, Vikings） |
| Teuton plunder | 「Crannies only protect 80%」 | 實際機制已多次改版，需查 2025 最新版；Teuton 現在是 Hero Cranny Dip 道具效果 -20% |

#### ❌ 重大缺失（必須補）
1. **Hero 完整系統**：adventures（獎勵機率）、experience（升等加點：力/離/資源/攻擊/防禦）、items（右手/左手/頭盔/護甲/靴子/馬匹）、revival（復活成本）
2. **Artifacts 完整系統**：類型（Small/Large/Unique）、效果（建築耐久、部隊速度、倉儲、大倉、Boots、Eyes、Brewery、Wonder 建造）、發布時間（~Day 90-100）、徵得條件（Architect 100%）
3. **Tournament Square** 長程加成公式（>30 tiles 開始生效，每 tile 減速）
4. **Troop speed 表**：每個兵種 tiles/hour（+ Hero book + TS bonus）
5. **Hospital** 治癒機制（Academy 15 + MB 10 解鎖，40% 傷兵回復，2× 速度）
6. **Farm List** 機制（Gold Club 功能，多 target 單擊，refresh 頻率）
7. **Trade Routes**（Gold Club，最多 6 routes/village，Market level 需求）
8. **Siege 機制**：
   - **19 catapult attacks 殺一個滿城（Lumi 明確指出）**
   - 催毀建築類型：Random / Chosen（Lvl >= X） / Wall / 城門
   - Ram 每等級傷害 %
9. **Wall durability 表**（不只是 defense bonus %）：
   - Roman City Wall: 高 bonus 低 durability（ram 秒殺）
   - Teuton Earth Wall: 低 bonus 高 durability（近乎不可摧）
   - Gaul Palisade: 均衡
10. **Loyalty 機制完整**：
    - 起始 100%，上限 **125%**（via Town Hall celebrations）
    - Chief 一波降 **20-30%**
    - 恢復 **+1%/hour**
    - Loyalty 0 觸發易主
11. **Town Hall 慶典**：
    - Small Celebration：500 CP、24h
    - Great Celebration：2000 CP、60h（Townhall 10 解鎖）
    - 打折 50% persuasion（Teuton Brewery 副作用）
12. **NPC Merchant**：3 gold 換任意比例資源
13. **Cranny**：保護量（Gaul 雙倍）、多 cranny 疊加
14. **Waiting Loop**（Plus + Master Builder）

### 3.2 `template-definitions.md` 驗證

**核心問題**：Slot 預算完全沒算，把「理想清單」塞進 20 個 slot 硬體限制。

#### 錯誤 1：Capital 建築太多

目前列：MB + Rally + WH + Granary + 5 bonus + Stonemason + Palace + Barracks + Academy + Smithy + HM + **11 個建築**

Lumi 攻略：Capital 只應放 **MB + Mill + Bakery + Market + Trade Office + (Stonemason) + 必要 Palace**，約 7-8 slots。剩下 slots **讓給 WH × 7-12 + Granary × 2-3** 撐 level 18-19 fields 的 storage 需求。

**結論：Capital 不該建 Barracks / Stable / Workshop / Academy / Smithy。**

參考 Lumi 具體數字：
- Crop 17s → WH×5 + Granary×1 = 6 slots
- Crop 18s → WH×7 + Granary×2 = 9 slots
- Crop 19s → **WH×12 + Granary×3 = 15 slots**

#### 錯誤 2：Feeder 漏關鍵 CP 建築 + 兵舍不該建

目前列：MB + Rally×1 + WH + Granary + 5 bonus + Residence + Market + Trade Office + HM + Cranny = 13 建築 — OK

**缺**：
- **Townhall**（Great Celebrations 核心 — 被 Lumi 稱為 CP 的「資本複利」）
- **Embassy 20**（高 CP/cost 比例）
- **Academy 20**（CP 好但要衡量）

**多餘**：
- Residence 到 10（除非設計成 chief source，否則不必到 10）
- HM 看是否要 oasis 才建（Lumi：feeder 建 HM 後拿 oasis **要刪掉**，不然英雄冒險在 feeder 附近刷）

#### 錯誤 3：Offense Hammer 太理想化

目前列：MB + Rally + WH + Granary + 6 兵種建築 + Academy + Smithy + TS + Great Barracks + Great Stable + Residence + 5 bonus = 超過 20 slots！

Lumi 攻略：Hammer 核心 18-20 slots：
- MB + Barracks + Stable + Hospital + TS + Workshop（6）
- WH×2 + Granary×3-4（5-6）
- Market + Trade Office（2）
- Residence/Palace（1）
- 5 bonus 建築（optional）= 只在有 slots 時才建
- **Great Barracks/Great Stable 只在大型 Hammer 才考慮**

#### 錯誤 4：Defense 漏 Market/Trade Office/Town Hall

目前列：MB + Wall + Barracks + Stable + Academy + Smithy + Residence + Hospital + Trapper = 9 建築

**缺**：Market + Trade Office（從 cap/feeder 運糧關鍵）、Town Hall（慶典 = Loyalty 125%）、3-5 storage

#### ❌ 完全缺失的 Template：NPC Village

Lumi 強調「每個帳號必備」。功能：儲存 + NPC 換資源 + 分配。建築：
- MB + Market + Trade Office + (Town Hall)
- 其餘全部 WH + Granary（1:3 比例 = 5 × WH + 15 × Granary？其實 5-6 WH + 10-12 Granary）

### 3.3 `template-strategies.md` 驗證

此文件寫得最完整，cost interleaving 策略很好。但：
- Defense templates 分 3 種族（Roman/Gaul/Teuton）但沒 Egyptian/Hun/Spartan/Viking
- 沒對應 Slot Budget
- 沒 3-chiefs setup 教學
- 沒階段化的 siege 目標

### 3.4 `building-requirements.md` 驗證

基本正確，但：
- **Palace prereq**：寫「Embassy 1, MB 5」— 正確
- **Residence-Palace 互斥**：寫到了 ✓
- **Great Barracks/Stable**：寫「non-capital」— 正確
- **Great Workshop**：**完全沒提**（Workshop 20 解鎖）
- **Water Ditch**（Egyptian 圍城建築）沒提
- **Command Center**（Hun）沒提
- **Waterworks**（Egyptian）沒提
- **Horse Drinking Trough**（Roman）沒提（template-strategies.md 有提到但 requirements 沒）

### 3.5 `travian-index.md` 驗證

是爬取的官方 Support 目錄，資料正確。但只是索引，沒把每篇內文 summarize — 對 AI RAG 檢索來說，**內容不足**。建議擴展為每篇文章的結構化 summary（公式、數值、規則）。

### 3.6 `PRD.md` 驗證

#### ✅ 正確
- F1-F5 架構分類合理
- Clean Architecture 技術選型
- 階段劃分（新手/早期/中期/中後期/神器期/終局）概念對
- Nodriver 反偵測選型

#### ❌ 需要修正
1. **征服波數**（F2.7）：「至少需要 4-5 波酋長/貴族」
   - 實際：3-chief plan = **3 個 chief 同一波**即可完成，或 Palace 20 + 2×3-chief = 可獨立 6 波 solo chiefing
   - 每波降 20-30 loyalty 沒錯，但 party 可升回 125
2. **戰鬥誤差**（F2.3）：「< 5%」— 實際公式複雜，含 morale、tribal bonus、hero bonus、wall durability、cata 目標選擇 → 5% 很嚴格，建議放寬到 10-15%
3. **階段判斷**（F3.1）：
   - 「中後期 Day 31-100」— Lumi 定義：早期 Day 1-45, 中期 Day 45-90, 末期 Day 90+ — **不一致**
   - 「神器期 ~Day 100+」— 實際 Day 90 左右就發布
4. **城牆加成表**（F2.3 附表）：只寫了加成 %，沒寫 durability。這是 Teuton vs Roman 防禦策略的核心分野
5. **文化點公式**（7.1 沒特別講）：該詳細說明「Townhall 10 + Great Celebration 24/7」= 相當於多一個滿城的 CP

### 3.7 `PROJECT-REQUIREMENTS.md`（124K 未全讀）

建議做一次完整 audit — 這份文件太大容易有散落在角落的過時資訊。

---

## 4. Travian Tools vs Travco 功能比對矩陣

圖例：✅ 已做 | 🟡 設計有、未實作 | ❌ 無 | 🔵 不需要做（定位差異）

| 功能分類 | 具體功能 | Travian Tools | Travco |
|---|---|---|---|
| **計算器** | 建築升級、ROI、戰鬥、糧食、距離、波次、征服、訓練 | ✅ (12+) | ❌ |
| **計算器** | Optimal Village Builder（cropper build order） | ❌ | ❌ |
| **計算器** | Crop Scouter（反推敵 cropper） | ❌ | ❌ |
| **計算器** | Feeder Traderoute 精算 | ❌ | ❌ |
| **計算器** | Smithy Efficiency | ❌ | ❌ |
| **計算器** | Fake Troops Calculator（佯攻部隊） | 🟡 | ✅ |
| **計算器** | Attack TS Optimizer | 🟡 | ✅ |
| **資料庫** | 建築/兵種/資源/部落 | ✅ | ❌ |
| **資料庫** | 模板庫（開局、各村類型） | 🟡 設計有 | ❌ |
| **資料庫** | 英雄數據（玩家） | 🟡 | ✅ |
| **資料庫** | 拉防/插防/常駐數據（Pro） | ❌ | ✅🔒 |
| **同步** | 瀏覽器擴充解析 dorf1/dorf2 | ✅ | ✅ (Plus) |
| **同步** | 戰報解析 | ✅ | ✅ |
| **同步** | Map.sql 解析 | ✅ | ✅ |
| **AI 顧問** | Claude RAG 策略建議 | ✅ | ❌ |
| **AI 顧問** | 帳號健康檢查 | ✅ | ❌ |
| **AI 顧問** | 階段判斷 | 🟡 | ❌ |
| **統計** | 玩家/聯盟排名、征服活動、名稱變更、死羊 | ✅ | ✅ |
| **統計** | Troops 總覽（每兵種即時） | ❌ | ✅ |
| **統計** | 成員在線熱力圖（24h×7d） | ❌ | ✅ |
| **防禦** | 拉防呼叫（普通/插防/常駐） | ❌ | ✅ |
| **防禦** | 請求/回應防禦流程 | ❌ | ✅ |
| **防禦** | 防禦規劃 dashboard | ❌ | ✅ |
| **防禦** | 發送防御數據庫（Pro） | ❌ | ✅🔒 |
| **攻擊** | 個人攻擊計劃（目標、attackers、波次編輯器） | 🟡 | ✅ |
| **攻擊** | 聯攻計劃（Pro） | ❌ | ✅🔒 |
| **攻擊** | 攻擊前提醒 | 🟡 | ✅ |
| **宝物** | 打寶村資料（靴子、投石速度、TS、財庫） | ❌ | ✅ |
| **宝物** | 宝物村資料庫 | ❌ | ✅🔒 |
| **宝物** | 宝物規劃 | ❌ | ✅🔒 |
| **Supply/Push** | PUSH 目標 + 商人追蹤 | ❌ | ✅ |
| **Supply/Push** | 接收 PUSH | ❌ | ✅ |
| **Farmlist** | Farmlist Analyser（成功率/平均搶/距離/標籤） | ❌ | ✅ (Plus) |
| **Farmlist** | 搶羊優化（多村、多 target、inv/cav 分派） | ❌ | 🟡 |
| **聯盟工具** | 權限系統（15 種細粒度） | ❌ | ✅ |
| **聯盟工具** | Discord bot 整合 | ❌ | ✅🔒 |
| **聯盟工具** | 邀請/成員/身份組管理 | ❌ | ✅ |
| **聯盟工具** | 聯盟時區設定 | ❌ | ✅ |
| **群組** | 多組群（dual, neighbor group, confed） | ❌ | ✅ |
| **群組** | Dual 帳號最多 5 位 | ❌ | ✅ |
| **工具** | Inactive Search（公開） | ✅ | ✅ |
| **工具** | 附近聯盟兵力搜尋 | ❌ | ✅ |
| **半自動執行** | 執行佇列 / 建造 / 訓練 / 排程提醒 | 🟡 設計有 | ❌ |
| **半自動執行** | Nodriver 反偵測 | 🟡 | ❌ |

**統計**：
- Travian Tools 獨家：**13 項**（計算器套件 + AI + 半自動）
- Travco 獨家：**25 項**（作戰協調 + 聯盟管理）
- 交集：**9 項**（資料同步、统计、Farmlist 部分）

---

## 5. Knowledge 補強優先清單

### P0（必改，現有資訊錯）
1. `template-definitions.md` **重寫** — slot budget 為先，建築清單為後
2. `PRD.md` F2.7 征服波數描述修正（3-chief / Palace 20 / 6 chiefs solo）
3. `travian-mechanics.md` 種族數量（5 → 7）
4. 階段定義統一：早期 Day 1-45 / 中期 Day 45-90 / 末期 Day 90+（Lumi 標準）

### P1（必加，核心空白）
5. NPC Village Template（新模板）
6. Hero 完整機制（adventures、items、experience、revival）
7. Artifacts 完整機制（類型、效果、徵得）
8. Siege 機制（19 cata 殺村、ram 傷害、loyalty 125）
9. Wall durability 表
10. Loyalty 完整機制
11. Town Hall 慶典（CP 複利）
12. Tournament Square 長程加成公式

### P2（推薦加）
13. Cropper 類型專屬 build order（15c / 9c / 7c / 6c × Egyptian / 非 Egyptian × 3 oasis 配置）
14. Oasis HM10/15/20 選擇邏輯（ROI 表）
15. CP 建築效率排序（MB 20 / Market 20 / Academy 20 / Embassy 20 / Townhall 10 = 529 CP baseline）
16. 地圖位置策略（greyzone / circle / boonies）
17. Farming strategies（microraid / oasis / natar）
18. 階段化 siege 目標（Day 45: 500+500+3-chief；Day 70: 2k+1k+3-chief）
19. 3-chiefs setup 建築需求
20. 反攻擊技巧（follow-home 防禦、gap timing）

### P3（有時間再加）
21. `travian-index.md` 擴展為每篇 Support 文章的 structured summary
22. `PROJECT-REQUIREMENTS.md` 全文 audit
23. Hero items 每個 tier/tribe 完整資料
24. Great Warehouse/Granary 機制
25. Waiting Loop（Plus）
26. Master Builder 機制

---

## 6. 對齊 Travco 的功能新蓋清單（分階段）

### Phase A — 核心作戰協調（必做才能叫「對齊 Travco」）

**A1. 聯盟/群組系統**（基礎設施，擋其他所有聯盟功能）
- 聯盟 CRUD、邀請連結、成員管理、離開
- 15 種權限 rank 系統（可編輯/指派）
- 群組類型：Alliance / Confederacy / Neighbor group

**A2. 防禦呼叫系統**
- 3 種拉防類型（普通/插防/常駐）的創建、接受、拒絕流程
- 來袭攻擊 dashboard（波數、影響、備註）
- 發送防禦追蹤
- 過濾器（Real/Fake/Cata/Ram/Hero/Conquer）

**A3. 攻擊計劃系統**
- Plan CRUD：名稱、波次數、投石數、影響時間
- 三分頁：attackers / targets / planning（波次編輯器）
- TS Optimizer：輸入所有 attackers 的 TS 等級 + 目標座標 → 計算各自發兵時間
- Fake Troops Calculator（佯攻部隊算）

**A4. 攻擊目標系統**
- 個人目標 / 聯攻目標（座標、優先級、類型、備註）
- 標籤分類
- 標記村莊（按 off 力量排序聯盟村）

### Phase B — 宝物作戰系統（Pro 對齊）
- 打寶村資料（英雄靴子、投石速度、TS 等級、財庫大小）
- 宝物村資料庫
- 宝物規劃（分配 attacker）

### Phase C — Farmlist Analyser
- 名單匯入 / 標籤系統
- 每個 target 的成功率 / 平均搶到 / 最後打 / 距離 / 估旅行時間
- 建議清單

### Phase D — Supply/Push 系統
- PUSH 創建（送方/收方）
- 商人追蹤（配合瀏覽器擴充）
- 進度 dashboard

### Phase E — Discord 整合
- Bot 連接
- 事件推播（來袭、拉防請求、完成）
- 頻道綁定

### Phase F — 聯盟管理增強
- 成員在線熱力圖（24h × 7d）
- Troops 總覽（每兵種即時）
- 未加入成員偵測

### 工時粗估（參考，由 AI 分析並非實際估算）

| Phase | 粗估工時（1 人 full-stack） | 必要度 |
|---|---|---|
| A. 作戰協調核心 | 6-10 週 | 必做 |
| B. 宝物系統 | 2-3 週 | 高 |
| C. Farmlist | 2-3 週 | 高 |
| D. Supply/Push | 2 週 | 中 |
| E. Discord bot | 1-2 週 | 中 |
| F. 聯盟管理增強 | 1-2 週 | 中 |
| **合計** | **14-22 週** | |

---

## 7. 產品方向建議

### 7.1 推薦策略：**三層疊加 + L1 作為差異化**

```
┌────────────────────────────────────────────────┐
│ L3 半自動執行（Nodriver）                      │  ← 差異化
│   排程、提醒、執行佇列、建造、訓練              │
├────────────────────────────────────────────────┤
│ L2 聯盟作戰協調（對齊 Travco）                  │  ← 流量入口
│   作戰計劃、拉防系統、宝物、Farmlist、Discord  │
├────────────────────────────────────────────────┤
│ L1 個人智能工具（強化我們已有）                 │  ← 差異化
│   AI 顧問、計算器套件、遊戲知識庫              │
└────────────────────────────────────────────────┘
                     ↑
              共用資料層（dorf1/dorf2 同步、Map.sql、戰報）
```

**理由**：
- **L1 差異化**：計算器 + AI + RAG 是 Travco 沒有的核心競爭力。付費玩家已經有 Travco 做協調，他們會為「只有我能幫你做決策」付費。
- **L2 流量入口**：聯盟要協調作戰，只能用 Travco。如果不蓋 L2，目標玩家族群不會切換平台。
- **L3 差異化**：半自動執行是 Travco **明確沒有的**（違反 Travian 使用條款，但灰色地帶）— 這是另一個付費點。

### 7.2 不推薦：「打掉重做成 Travco clone」

**代價**：
- 放棄 AI 顧問 + 計算器套件這兩個 Travian Tools 唯一已經做得比競品好的部分
- 14-22 週蓋一個「沒 Discord bot 沒社群、沒人用」的山寨 Travco
- Travco 已經 7 年迭代（2019-2026），追趕產品曲線不利

### 7.3 MVP 建議順序

1. **第 1 階段（4-6 週）**：補完 L1 缺的計算器（Optimal Village Builder + Crop Scouter + TS Optimizer + Fake Troops）+ 修正 Knowledge bugs
2. **第 2 階段（6-10 週）**：L2 Phase A（作戰協調核心）— 這是「對齊 Travco」的最小可行版本
3. **第 3 階段（6-8 週）**：L2 Phase B-F（宝物、Farmlist、Supply、Discord、聯盟管理）
4. **第 4 階段（持續）**：L3 半自動執行

---

## 8. 下一步決策點（給使用者）

1. 驗證報告第 3 章的錯誤清單 — 是否同意修正？（最重要：template-definitions 重寫）
2. 第 5 章補強清單的 P0-P2 — 要不要開對應 ticket？
3. 第 6 章新蓋清單 — 要不要進 `superpowers:writing-plans` 流程拆 ticket？
4. 第 7 章產品方向 — 是否接受「三層疊加」而不是「打掉重做」？

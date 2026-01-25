/**
 * Travian Tools - Content Script
 * 在 Travian 遊戲頁面中執行，負責抓取頁面數據
 */

// 配置
const CONFIG = {
  API_BASE_URL: 'http://localhost:8000/api/v1',
  DEBUG: true,
};

// 工具函數
const log = (...args) => {
  if (CONFIG.DEBUG) {
    console.log('[Travian Tools]', ...args);
  }
};

/**
 * 解析資源數量
 */
function parseResources() {
  const resources = {
    wood: 0,
    clay: 0,
    iron: 0,
    crop: 0,
  };

  try {
    // 嘗試新版 Travian Legends 的選擇器
    const stockBar = document.getElementById('stockBar');
    if (stockBar) {
      const lumber = stockBar.querySelector('.lumber .value, [class*="lumber"] .value');
      const clay = stockBar.querySelector('.clay .value, [class*="clay"] .value');
      const iron = stockBar.querySelector('.iron .value, [class*="iron"] .value');
      const crop = stockBar.querySelector('.crop .value, [class*="crop"] .value');

      if (lumber) resources.wood = parseInt(lumber.textContent.replace(/\D/g, ''), 10) || 0;
      if (clay) resources.clay = parseInt(clay.textContent.replace(/\D/g, ''), 10) || 0;
      if (iron) resources.iron = parseInt(iron.textContent.replace(/\D/g, ''), 10) || 0;
      if (crop) resources.crop = parseInt(crop.textContent.replace(/\D/g, ''), 10) || 0;

      log('Resources from stockBar:', resources);
      return resources;
    }

    // 舊版選擇器
    const l1 = document.getElementById('l1');
    const l2 = document.getElementById('l2');
    const l3 = document.getElementById('l3');
    const l4 = document.getElementById('l4');

    if (l1) resources.wood = parseInt(l1.textContent.replace(/\D/g, ''), 10) || 0;
    if (l2) resources.clay = parseInt(l2.textContent.replace(/\D/g, ''), 10) || 0;
    if (l3) resources.iron = parseInt(l3.textContent.replace(/\D/g, ''), 10) || 0;
    if (l4) resources.crop = parseInt(l4.textContent.replace(/\D/g, ''), 10) || 0;

    log('Resources from l1-l4:', resources);
  } catch (e) {
    log('Error parsing resources:', e);
  }

  return resources;
}

/**
 * 解析產量
 */
function parseProduction() {
  const production = {
    wood: 0,
    clay: 0,
    iron: 0,
    crop: 0,
  };

  try {
    const productionTable = document.getElementById('production');
    if (productionTable) {
      const cells = productionTable.querySelectorAll('td.num');
      if (cells.length >= 4) {
        production.wood = parseInt(cells[0].textContent.replace(/\D/g, ''), 10) || 0;
        production.clay = parseInt(cells[1].textContent.replace(/\D/g, ''), 10) || 0;
        production.iron = parseInt(cells[2].textContent.replace(/\D/g, ''), 10) || 0;
        production.crop = parseInt(cells[3].textContent.replace(/\D/g, ''), 10) || 0;
      }
    }
  } catch (e) {
    log('Error parsing production:', e);
  }

  return production;
}

/**
 * 解析資源田 (dorf1.php)
 * Travian Legends 使用 data-aid 和 data-gid 屬性
 * gid1=木材, gid2=泥土, gid3=鐵礦, gid4=農田
 */
function parseResourceFields() {
  const fields = [];

  try {
    // 查找資源田容器中的所有建築槽位
    const container = document.getElementById('resourceFieldContainer');
    if (!container) {
      log('Resource field container not found');
      return fields;
    }

    // 資源田位置 1-18
    for (let i = 1; i <= 18; i++) {
      // 使用 buildingSlot{i} class 或 data-aid 屬性查找
      const field = container.querySelector(`.buildingSlot${i}, [data-aid="${i}"]`);
      if (field) {
        const labelLayer = field.querySelector('.labelLayer');
        const level = labelLayer
          ? parseInt(labelLayer.textContent.replace(/\D/g, ''), 10) || 0
          : 0;

        // 根據 data-gid 或 class 判斷資源類型
        // gid1=木材, gid2=泥土, gid3=鐵礦, gid4=農田
        let resourceType = 'unknown';
        const gid = field.getAttribute('data-gid');
        if (gid === '1' || field.classList.contains('gid1')) resourceType = 'wood';
        else if (gid === '2' || field.classList.contains('gid2')) resourceType = 'clay';
        else if (gid === '3' || field.classList.contains('gid3')) resourceType = 'iron';
        else if (gid === '4' || field.classList.contains('gid4')) resourceType = 'crop';

        fields.push({
          position: i,
          resource_type: resourceType,
          level: level,
        });

        log(`Field ${i}: ${resourceType} level ${level}`);
      }
    }
  } catch (e) {
    log('Error parsing resource fields:', e);
  }

  return fields;
}

/**
 * 解析建築 (dorf2.php)
 * Travian Legends 使用 data-gid 屬性或 gid{N} class 來標識建築類型
 */
function parseBuildings() {
  const buildings = [];

  try {
    // 查找村莊中心容器
    const villageMap = document.getElementById('villageContent') || document.getElementById('village_map');

    // 建築位置 19-40
    for (let i = 19; i <= 40; i++) {
      // 嘗試多種選擇器
      const building = document.getElementById(`a${i}`)
        || document.querySelector(`.aid${i}`)
        || document.querySelector(`[data-aid="${i}"]`)
        || (villageMap && villageMap.querySelector(`.buildingSlot${i}`));

      if (building) {
        const labelLayer = building.querySelector('.labelLayer');
        const level = labelLayer
          ? parseInt(labelLayer.textContent.replace(/\D/g, ''), 10) || 0
          : 0;

        // 從 data-gid 或 class 取得建築 ID
        let buildingId = 'building_0'; // 預設為空地

        // 方法 1: data-gid 屬性
        const gid = building.getAttribute('data-gid');
        if (gid && gid !== '0') {
          buildingId = `building_${gid}`;
        } else {
          // 方法 2: gid{N} class
          const gidMatch = building.className.match(/gid(\d+)/);
          if (gidMatch && gidMatch[1] !== '0') {
            buildingId = `building_${gidMatch[1]}`;
          } else {
            // 方法 3: g{N} class (舊版)
            const gMatch = building.className.match(/\bg(\d+)\b/);
            if (gMatch && gMatch[1] !== '0') {
              buildingId = `building_${gMatch[1]}`;
            }
          }
        }

        // 檢查是否正在升級
        const isUpgrading = building.classList.contains('underConstruction')
          || building.classList.contains('upgrading');

        // 只有已建造的建築或空地才加入
        buildings.push({
          position: i,
          building_id: buildingId,
          level: level,
          is_upgrading: isUpgrading,
        });

        log(`Building slot ${i}: gid=${gid}, class=${building.className.substring(0, 100)}, buildingId=${buildingId}, level=${level}`);
      }
    }
  } catch (e) {
    log('Error parsing buildings:', e);
  }

  return buildings;
}

/**
 * 取得當前村莊名稱
 */
function getVillageName() {
  try {
    // 新版 Travian Legends - 從 active 村莊取得名稱
    const activeVillage = document.querySelector('.villageList .listEntry.active');
    if (activeVillage) {
      const nameEl = activeVillage.querySelector('.name');
      if (nameEl) {
        const name = nameEl.textContent.trim();
        log('Found village name from villageList:', name);
        return name;
      }
    }

    // 備用選擇器
    const selectors = [
      '#villageNameField',
      '.villageName',
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const name = el.textContent.trim();
        if (name) {
          log('Found village name:', name, 'using selector:', selector);
          return name;
        }
      }
    }
  } catch (e) {
    log('Error getting village name:', e);
  }
  return null;
}

/**
 * 解析座標文字，處理 Unicode minus sign (U+2212) 和其他特殊字元
 */
function parseCoordinateText(text) {
  if (!text) return 0;
  // 先將 Unicode minus sign (U+2212: −) 轉換為 ASCII minus (U+002D: -)
  // 同時處理其他可能的 dash 字元
  const normalized = text
    .replace(/\u2212/g, '-')  // Unicode minus sign
    .replace(/\u2013/g, '-')  // en dash
    .replace(/\u2014/g, '-')  // em dash
    .replace(/[^\d-]/g, '');  // 只保留數字和減號
  return parseInt(normalized, 10) || 0;
}

/**
 * 取得當前座標
 */
function getCoordinates() {
  try {
    // 新版 Travian Legends - 從 active 村莊取得座標
    const activeVillage = document.querySelector('.villageList .listEntry.active');
    if (activeVillage) {
      const xEl = activeVillage.querySelector('.coordinateX');
      const yEl = activeVillage.querySelector('.coordinateY');
      if (xEl && yEl) {
        const coords = {
          x: parseCoordinateText(xEl.textContent),
          y: parseCoordinateText(yEl.textContent),
        };
        log('Found coordinates from active village:', coords);
        return coords;
      }
    }

    // 備用：嘗試從 x 和 y 分開的元素中取得
    const xEl = document.querySelector('.coordinateX');
    const yEl = document.querySelector('.coordinateY');
    if (xEl && yEl) {
      const coords = {
        x: parseCoordinateText(xEl.textContent),
        y: parseCoordinateText(yEl.textContent),
      };
      log('Found coordinates from separate elements:', coords);
      return coords;
    }
  } catch (e) {
    log('Error getting coordinates:', e);
  }
  return null;
}

/**
 * 取得所有村莊列表
 */
function getAllVillages() {
  const villages = [];

  try {
    const villageEntries = document.querySelectorAll('.villageList .listEntry.village');

    villageEntries.forEach((entry) => {
      const did = entry.getAttribute('data-did');
      const nameEl = entry.querySelector('.name');
      const xEl = entry.querySelector('.coordinateX');
      const yEl = entry.querySelector('.coordinateY');

      if (did && nameEl) {
        villages.push({
          village_id: did,
          name: nameEl.textContent.trim(),
          coordinate_x: parseCoordinateText(xEl?.textContent),
          coordinate_y: parseCoordinateText(yEl?.textContent),
          is_active: entry.classList.contains('active'),
        });
      }
    });

    log('Found villages:', villages);
  } catch (e) {
    log('Error getting all villages:', e);
  }

  return villages;
}

/**
 * 判斷當前頁面類型
 */
function getPageType() {
  const url = window.location.href;
  if (url.includes('dorf1.php')) return 'village_overview';
  if (url.includes('dorf2.php')) return 'village_center';
  if (url.includes('build.php') && url.includes('gid=16')) return 'rally_point';
  if (url.includes('hero.php')) return 'hero';
  if (url.includes('reports.php')) return 'reports';
  if (url.includes('berichte.php')) return 'reports'; // 德文版
  if (url.includes('map.php')) return 'map';
  return 'unknown';
}

/**
 * 解析報告列表頁面
 */
function parseReportsList() {
  const reports = [];

  try {
    // 找報告表格
    const reportRows = document.querySelectorAll('.reports tr, #overview table tr, .report-list tr');

    reportRows.forEach((row) => {
      // 跳過表頭
      if (row.querySelector('th')) return;

      const link = row.querySelector('a[href*="berichte.php"], a[href*="reports.php"]');
      if (!link) return;

      const href = link.getAttribute('href');
      const reportIdMatch = href.match(/id=(\d+)/);
      if (!reportIdMatch) return;

      const reportId = reportIdMatch[1];

      // 判斷報告類型 - 根據圖示 class
      let reportType = 'unknown';
      const iconEl = row.querySelector('.iReport, .reportIcon, [class*="report"]');
      if (iconEl) {
        const iconClass = iconEl.className;
        if (iconClass.includes('attack') || iconClass.includes('del1')) reportType = 'attack_incoming';
        else if (iconClass.includes('defense') || iconClass.includes('del2')) reportType = 'defense';
        else if (iconClass.includes('spy') || iconClass.includes('del3')) reportType = 'spy';
        else if (iconClass.includes('trade') || iconClass.includes('del4')) reportType = 'trade';
        else if (iconClass.includes('reinforce') || iconClass.includes('del5')) reportType = 'reinforcement';
        else if (iconClass.includes('adventure')) reportType = 'adventure';
      }

      // 取得標題
      const title = link.textContent.trim();

      // 取得時間
      let timestamp = null;
      const timeCell = row.querySelector('.dat, .time, td:last-child');
      if (timeCell) {
        timestamp = timeCell.textContent.trim();
      }

      // 是否已讀
      const isRead = !row.classList.contains('new') && !row.querySelector('.newMessage');

      reports.push({
        report_id: reportId,
        report_type: reportType,
        title: title,
        timestamp: timestamp,
        is_read: isRead,
        url: href,
      });
    });
  } catch (e) {
    log('Error parsing reports list:', e);
  }

  return reports;
}

/**
 * 解析單一報告詳情
 */
function parseReportDetail() {
  const report = {
    report_id: null,
    report_type: 'unknown',
    title: '',
    timestamp: null,
    attacker: null,
    defender: null,
    resources_stolen: null,
    units_lost: null,
    battle_result: null,
  };

  try {
    // 從 URL 取得報告 ID
    const urlParams = new URLSearchParams(window.location.search);
    report.report_id = urlParams.get('id');

    // 取得標題
    const titleEl = document.querySelector('.reportTitle, h1.titleInHeader, #reportDetail h1');
    if (titleEl) {
      report.title = titleEl.textContent.trim();
    }

    // 判斷報告類型
    const reportContainer = document.querySelector('#reportDetail, .report, .reportContainer');
    if (reportContainer) {
      const html = reportContainer.innerHTML.toLowerCase();
      if (html.includes('attack') || html.includes('攻擊') || html.includes('angriff')) {
        report.report_type = 'attack';
      } else if (html.includes('spy') || html.includes('偵查') || html.includes('spionage')) {
        report.report_type = 'spy';
      } else if (html.includes('trade') || html.includes('商人') || html.includes('handel')) {
        report.report_type = 'trade';
      } else if (html.includes('reinforce') || html.includes('增援')) {
        report.report_type = 'reinforcement';
      }
    }

    // 解析攻擊者/防守者
    const attackerEl = document.querySelector('.attacker, .attackerTable, [class*="attacker"]');
    if (attackerEl) {
      const playerLink = attackerEl.querySelector('a[href*="profile"]');
      const villageLink = attackerEl.querySelector('a[href*="position"]');
      report.attacker = {
        player_name: playerLink?.textContent.trim() || 'Unknown',
        village_name: villageLink?.textContent.trim() || 'Unknown',
      };
    }

    const defenderEl = document.querySelector('.defender, .defenderTable, [class*="defender"]');
    if (defenderEl) {
      const playerLink = defenderEl.querySelector('a[href*="profile"]');
      const villageLink = defenderEl.querySelector('a[href*="position"]');
      report.defender = {
        player_name: playerLink?.textContent.trim() || 'Unknown',
        village_name: villageLink?.textContent.trim() || 'Unknown',
      };
    }

    // 解析掠奪資源
    const carryEl = document.querySelector('.carry, .resource, [class*="bounty"]');
    if (carryEl) {
      const resources = carryEl.querySelectorAll('.r1, .r2, .r3, .r4, [class*="resource"]');
      if (resources.length >= 4) {
        report.resources_stolen = {
          wood: parseInt(resources[0]?.textContent.replace(/\D/g, ''), 10) || 0,
          clay: parseInt(resources[1]?.textContent.replace(/\D/g, ''), 10) || 0,
          iron: parseInt(resources[2]?.textContent.replace(/\D/g, ''), 10) || 0,
          crop: parseInt(resources[3]?.textContent.replace(/\D/g, ''), 10) || 0,
        };
      }
    }

    // 時間戳記
    const timeEl = document.querySelector('.time, .reportTime, [class*="time"]');
    if (timeEl) {
      report.timestamp = timeEl.textContent.trim();
    }

  } catch (e) {
    log('Error parsing report detail:', e);
  }

  return report;
}

/**
 * 取得當前村莊 ID
 */
function getCurrentVillageId() {
  try {
    const activeVillage = document.querySelector('.villageList .listEntry.active');
    if (activeVillage) {
      return activeVillage.getAttribute('data-did');
    }
  } catch (e) {
    log('Error getting village ID:', e);
  }
  return null;
}

/**
 * 取得村莊人口
 * Travian Legends 的人口通常在村莊列表的每個村莊項目中
 */
function getPopulation() {
  try {
    // 方法 1: 從 villageList 中的 active 村莊取得人口
    const activeVillage = document.querySelector('.villageList .listEntry.active');
    if (activeVillage) {
      // Travian Legends 2024+ 版本的人口元素選擇器
      const selectors = [
        '.inhabitants',
        '.population',
        '.pop',
        '.villagePopulation',
        '.points',           // 有時候人口會在 points 元素
        '[class*="inhabitants"]',
        '[class*="population"]',
        'span.value',        // 常見的值元素
      ];

      for (const selector of selectors) {
        const popEl = activeVillage.querySelector(selector);
        if (popEl) {
          const pop = parseInt(popEl.textContent.replace(/\D/g, ''), 10);
          if (pop > 0) {
            log('Found population from villageList with selector:', selector, pop);
            return pop;
          }
        }
      }

      // 嘗試解析所有子元素中的數字
      const allSpans = activeVillage.querySelectorAll('span, div');
      for (const span of allSpans) {
        // 跳過座標元素
        if (span.classList.contains('coordinateX') || span.classList.contains('coordinateY')) continue;
        if (span.classList.contains('name')) continue;

        const text = span.textContent.trim();
        // 尋找純數字（可能是人口）
        if (/^\d+$/.test(text)) {
          const num = parseInt(text, 10);
          // 人口通常 > 0 且 < 100000
          if (num > 0 && num < 100000) {
            log('Found potential population from span:', num, 'class:', span.className);
            return num;
          }
        }
      }

      log('Active village full text:', activeVillage.textContent);
    }

    // 方法 2: 從 sidebarBoxVillagelist 取得（舊版介面）
    const sidebarBox = document.getElementById('sidebarBoxVillagelist');
    if (sidebarBox) {
      const activeInSidebar = sidebarBox.querySelector('.active, .selected');
      if (activeInSidebar) {
        const popEl = activeInSidebar.querySelector('.inhabitants, .pop, [class*="pop"]');
        if (popEl) {
          const pop = parseInt(popEl.textContent.replace(/\D/g, ''), 10);
          if (pop > 0) {
            log('Found population from sidebarBox:', pop);
            return pop;
          }
        }
      }
    }

    // 方法 3: 從頁面 header 或其他位置取得
    const globalSelectors = [
      '#stockBarButton .inhabitants',
      '.sidebar .population',
      '#villageInfo .inhabitants',
      '.villageInfo .pop',
    ];

    for (const selector of globalSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const pop = parseInt(el.textContent.replace(/\D/g, ''), 10);
        if (pop > 0) {
          log('Found population from global selector:', selector, pop);
          return pop;
        }
      }
    }

    // 除錯：輸出 villageList 結構
    log('Population not found, dumping HTML for debugging');
    const villageList = document.querySelector('.villageList');
    if (villageList) {
      log('VillageList outerHTML:', villageList.outerHTML.substring(0, 1000));
    }
  } catch (e) {
    log('Error getting population:', e);
  }
  return 0;
}

/**
 * 檢查當前村莊是否為首都
 */
function isCapitalVillage() {
  try {
    // 方法 1: 檢查 active 村莊是否有首都標記
    const activeVillage = document.querySelector('.villageList .listEntry.active');
    if (activeVillage) {
      // Travian 通常用 capital class 或圖示標記首都
      if (activeVillage.classList.contains('capital')) {
        log('Found capital from class');
        return true;
      }

      // 檢查首都圖示
      const capitalIcon = activeVillage.querySelector('.capital, .capitalIcon, [class*="capital"], .isCapital');
      if (capitalIcon) {
        log('Found capital icon');
        return true;
      }

      // 檢查特殊標記或屬性
      if (activeVillage.getAttribute('data-capital') === 'true') {
        return true;
      }
    }

    // 方法 2: 從頁面內容判斷（如果在村莊詳情頁）
    const capitalIndicators = [
      '.capitalIndicator',
      '#villageInfo .capital',
      '[class*="mainVillage"]',
    ];

    for (const selector of capitalIndicators) {
      if (document.querySelector(selector)) {
        log('Found capital indicator:', selector);
        return true;
      }
    }
  } catch (e) {
    log('Error checking capital:', e);
  }
  return false;
}

/**
 * 解析軍隊數據
 * 從 dorf1.php 或 dorf2.php 的軍隊概覽取得
 */
function parseTroops() {
  const troops = [];
  const foundTroops = new Map(); // 用來合併同類型兵種

  try {
    log('Starting troop parsing...');

    // 方法 1: Travian Legends 標準格式 - 從 troops 容器取得
    // 通常在 dorf1/dorf2 頁面的右側欄或底部
    const troopContainers = document.querySelectorAll(
      '#troops, .troops, .troopContainer, .troop_details, ' +
      '.villageInfoContainer .troops, #troopInfo, .troopsHome, ' +
      '[class*="troops"], [id*="troops"]'
    );

    log('Found troop containers:', troopContainers.length);

    for (const container of troopContainers) {
      log('Processing container:', container.className || container.id);

      // 方法 1a: 標準表格格式 (每行一種兵)
      const rows = container.querySelectorAll('tr, .troopRow');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          // 從第一個 cell 找兵種圖示
          const firstCell = cells[0];
          const img = firstCell.querySelector('img, i, [class*="unit"]');
          if (img) {
            const troopId = extractTroopId(img);
            // 從第二個 cell 找數量
            const countText = cells[1].textContent.trim();
            const count = parseInt(countText.replace(/\D/g, ''), 10) || 0;

            if (troopId && count > 0) {
              addTroop(foundTroops, troopId, count, 'home', false);
            }
          }
        }
      }

      // 方法 1b: 橫向格式 (圖示+數字並排)
      const unitElements = container.querySelectorAll('.unit, [class*="unitSmall"], [class*="unit"]');
      for (const unitEl of unitElements) {
        const troopId = extractTroopId(unitEl);
        // 找相鄰的數量元素
        const countEl = unitEl.nextElementSibling
          || unitEl.parentElement?.querySelector('.val, .count, .num, span:not([class*="unit"])')
          || unitEl.querySelector('.val, .count, .num');

        if (troopId && countEl) {
          const count = parseInt(countEl.textContent.replace(/\D/g, ''), 10) || 0;
          if (count > 0) {
            addTroop(foundTroops, troopId, count, 'home', false);
          }
        }
      }
    }

    // 方法 2: 從 sidebar 或 overview 區塊取得
    const sidebarTroops = document.querySelector('#sidebarBoxInfobox .troops, .sidebar .troops');
    if (sidebarTroops) {
      log('Found sidebar troops');
      parseTroopContainer(sidebarTroops, foundTroops, 'home', false);
    }

    // 方法 3: 從兵營/馬廄等建築頁面取得訓練中的兵種
    const trainingContainers = document.querySelectorAll(
      '.buildingInnerBox .troop, .training, [class*="queue"], ' +
      '.buildingDetails .troops, .trainQueue'
    );
    for (const container of trainingContainers) {
      log('Found training container');
      parseTroopContainer(container, foundTroops, 'training', true);
    }

    // 方法 4: 集結點頁面 (gid=16)
    if (window.location.href.includes('gid=16') || window.location.href.includes('build.php')) {
      const rallyTroops = document.querySelector('.troopOverview, #troopInfo, .troopsStationed');
      if (rallyTroops) {
        log('Found rally point troops');
        parseTroopContainer(rallyTroops, foundTroops, 'home', false);
      }
    }

    // 轉換 Map 為陣列
    for (const [troopId, data] of foundTroops) {
      troops.push({
        troop_id: troopId,
        count: data.count,
        location: data.location,
        is_training: data.is_training,
      });
    }

    log('Parsed troops:', troops);

    // 如果沒找到軍隊，輸出除錯資訊
    if (troops.length === 0) {
      log('No troops found. Dumping potential troop elements for debugging:');
      const allWithUnit = document.querySelectorAll('[class*="unit"], [class*="troop"]');
      log('Elements with unit/troop class:', allWithUnit.length);
      if (allWithUnit.length > 0 && allWithUnit.length < 20) {
        allWithUnit.forEach((el, i) => {
          log(`  [${i}] class: ${el.className}, text: ${el.textContent.substring(0, 50)}`);
        });
      }
    }
  } catch (e) {
    log('Error parsing troops:', e);
  }

  return troops;
}

/**
 * 從元素提取兵種 ID
 */
function extractTroopId(element) {
  if (!element) return null;

  // 從 class 提取 (u1, u2, unit1, unit2, etc.)
  const className = element.className || '';
  let match = className.match(/\bu(\d+)\b/);
  if (match) return `troop_${match[1]}`;

  match = className.match(/unit(\d+)/);
  if (match) return `troop_${match[1]}`;

  // 從 src 提取 (unit/u1.gif, etc.)
  const src = element.src || element.getAttribute('src') || '';
  match = src.match(/u(\d+)/);
  if (match) return `troop_${match[1]}`;

  // 從 data 屬性提取
  const dataUnit = element.getAttribute('data-unit') || element.getAttribute('data-troop');
  if (dataUnit) return `troop_${dataUnit}`;

  // 從 background-image 提取
  const style = element.style?.backgroundImage || '';
  match = style.match(/u(\d+)/);
  if (match) return `troop_${match[1]}`;

  return null;
}

/**
 * 解析兵種容器
 */
function parseTroopContainer(container, foundTroops, location, isTraining) {
  if (!container) return;

  // 找所有可能的兵種元素
  const elements = container.querySelectorAll(
    '.unit, [class*="unit"], img[src*="unit"], ' +
    'td:first-child img, .troopIcon, [class*="troop"]'
  );

  for (const el of elements) {
    const troopId = extractTroopId(el);
    if (!troopId) continue;

    // 尋找數量
    let count = 0;

    // 嘗試從父元素或相鄰元素找數量
    const parent = el.closest('tr, .troopRow, td, .unit-container');
    if (parent) {
      const countEl = parent.querySelector('.val, .count, .num, td:nth-child(2), span:last-child');
      if (countEl && countEl !== el) {
        count = parseInt(countEl.textContent.replace(/\D/g, ''), 10) || 0;
      }
    }

    // 嘗試從相鄰元素找
    if (count === 0 && el.nextElementSibling) {
      count = parseInt(el.nextElementSibling.textContent.replace(/\D/g, ''), 10) || 0;
    }

    if (troopId && count > 0) {
      addTroop(foundTroops, troopId, count, location, isTraining);
    }
  }
}

/**
 * 添加兵種到 Map (合併同類型)
 */
function addTroop(map, troopId, count, location, isTraining) {
  if (map.has(troopId)) {
    const existing = map.get(troopId);
    existing.count += count;
  } else {
    map.set(troopId, { count, location, is_training: isTraining });
  }
  log(`Added/Updated troop: ${troopId}, count: ${count}, location: ${location}`);
}

/**
 * 收集當前頁面數據
 */
function collectPageData() {
  const pageType = getPageType();
  const coordinates = getCoordinates();

  const data = {
    page_type: pageType,
    timestamp: new Date().toISOString(),
    village_id: getCurrentVillageId(),
    village_name: getVillageName(),
    coordinates: coordinates,
    coordinate_x: coordinates?.x,
    coordinate_y: coordinates?.y,
    population: getPopulation(),
    is_capital: isCapitalVillage(),
    resources: parseResources(),
    production: parseProduction(),
    troops: parseTroops(),
  };

  if (pageType === 'village_overview') {
    data.resource_fields = parseResourceFields();
  } else if (pageType === 'village_center') {
    data.buildings = parseBuildings();
  } else if (pageType === 'reports') {
    // 判斷是報告列表還是報告詳情
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('id')) {
      data.report_detail = parseReportDetail();
    } else {
      data.reports = parseReportsList();
    }
  }

  return data;
}

/**
 * 監聽來自 popup 或 background 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received message:', request);

  switch (request.action) {
    case 'collect_data':
      const data = collectPageData();
      log('Collected data:', data);
      sendResponse({ success: true, data });
      break;

    case 'get_page_type':
      sendResponse({ success: true, page_type: getPageType() });
      break;

    case 'collect_reports':
      const reports = parseReportsList();
      log('Collected reports:', reports);
      sendResponse({ success: true, reports });
      break;

    case 'collect_report_detail':
      const reportDetail = parseReportDetail();
      log('Collected report detail:', reportDetail);
      sendResponse({ success: true, report: reportDetail });
      break;

    case 'get_all_villages':
      const villages = getAllVillages();
      log('All villages:', villages);
      sendResponse({ success: true, villages });
      break;

    case 'ping':
      sendResponse({ success: true, message: 'pong' });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }

  return true; // 保持 message channel 開啟以便異步回應
});

// 初始化
log('Content script loaded on', window.location.href);
log('Page type:', getPageType());

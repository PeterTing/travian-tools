# Travian Building Requirements

This document outlines the maximum levels and prerequisites for every building in Travian. This directly powers the simulator and queue validation logic to ensure the bot never queues illegal building orders.

## Resource Fields

| GID | Name | Max Level | Max Level (Capital) | Prerequisites |
|-----|------|-----------|---------------------|---------------|
| 1 | Woodcutter | 10 | 20 | None |
| 2 | Clay Pit | 10 | 20 | None |
| 3 | Iron Mine | 10 | 20 | None |
| 4 | Cropland | 10 | 20 | None |

## Infrastructure & Economy

| GID | Name | Max Level | Prerequisites | Notes |
|-----|------|-----------|---------------|-------|
| 5 | Sawmill | 5 | Woodcutter 10, Main Building 5 | |
| 6 | Brickyard | 5 | Clay Pit 10, Main Building 5 | |
| 7 | Iron Foundry | 5 | Iron Mine 10, Main Building 5 | |
| 8 | Grain Mill | 5 | Cropland 5 | |
| 9 | Bakery | 5 | Cropland 10, Main Building 5, Grain Mill 5 | Highly restricted max level |
| 10 | Warehouse | 20 | Main Building 1 | Multiple allowed after Lv20 |
| 11 | Granary | 20 | Main Building 1 | Multiple allowed after Lv20 |
| 15 | Main Building | 20 | None | Speeds up construction |
| 17 | Marketplace | 20 | Main Building 3, Warehouse 1, Granary 1 | |
| 18 | Embassy | 20 | Main Building 1 | |
| 23 | Cranny | 10 | None | Multiple allowed after Lv10 |
| 24 | Town Hall | 20 | Main Building 10, Academy 10 | |
| 25 | Residence | 20 | Main Building 5 | Exclusive with Palace |
| 26 | Palace | 20 | Embassy 1, Main Building 5 | Exclusive with Residence |
| 27 | Treasury | 20 | Main Building 10 | |
| 28 | Trade Office | 20 | Marketplace 20, Stable 10 | |
| 34 | Stonemason's Lodge | 20 | Main Building 5, Palace 3 | Capital only |

## Military & Defense

| GID | Name | Max Level | Prerequisites | Notes |
|-----|------|-----------|---------------|-------|
| 13 | Smithy | 20 | Main Building 3, Academy 1 | |
| 14 | Tournament Square| 20 | Rally Point 15 | |
| 16 | Rally Point | 20 | None | |
| 19 | Barracks | 20 | Rally Point 1, Main Building 3 | |
| 20 | Stable | 20 | Smithy 3, Academy 5 | |
| 21 | Workshop | 20 | Academy 10, Main Building 5 | |
| 22 | Academy | 20 | Barracks 3, Main Building 3 | |
| 29 | Great Barracks | 20 | Barracks 20 | Not in Capital |
| 30 | Great Stable | 20 | Stable 20 | Not in Capital |
| 31 | City Wall | 20 | None | Roman only |
| 32 | Earth Wall | 20 | None | Teuton only |
| 33 | Palisade | 20 | None | Gaul only |
| 36 | Trapper | 20 | Rally Point 1 | Gaul only. Multiple after Lv20 |
| 37 | Hero's Mansion | 20 | Main Building 3, Rally Point 1 | |
| 46 | Hospital | 20 | Academy 15, Main Building 10 | |

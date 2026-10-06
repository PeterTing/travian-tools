/** 由 backend/tests/fixtures/ocr 經 parse_rally_ocr 產生（P0-07），給前端測試用 */
import type { OcrRallyResponse } from '@/services/ocrApi'

export const ocrLowResResponse = {
  "ok": true,
  "page_type": "rally_point",
  "data": {
    "village_id": null,
    "village_name": "HandsomeTing的村莊",
    "server_time": null,
    "incoming": [
      {
        "kind": "incoming_raid",
        "role": "敞方村",
        "headline": "Raider 搶奪 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9670,
        "arrival_time": "13:10:28",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            266,
            549,
            379
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                56,
                306,
                106,
                323
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.8967,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9670,
              "reasons": [],
              "box": [
                139,
                353,
                218,
                372
              ],
              "image_index": 0,
              "raw": "在2:41:10時",
              "score": 0.9901,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:28",
              "reasons": [],
              "box": [
                478,
                353,
                549,
                372
              ],
              "image_index": 0,
              "raw": "於13:10:28",
              "score": 0.9979,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9672,
        "arrival_time": "13:10:30",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            379,
            550,
            493
          ],
          "fields": {
            "coords": {
              "status": "low",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [
                "CROP_RECHECK_MISMATCH"
              ],
              "box": [
                56,
                418,
                105,
                435
              ],
              "image_index": 0,
              "raw": "(−45j12)",
              "score": 0.8964,
              "options": [
                {
                  "value": {
                    "x": -45,
                    "y": 12
                  },
                  "label": "(−45|12)",
                  "note": null
                }
              ],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9672,
              "reasons": [],
              "box": [
                139,
                466,
                219,
                487
              ],
              "image_index": 0,
              "raw": "在2:41:12時",
              "score": 0.992,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:30",
              "reasons": [],
              "box": [
                478,
                466,
                550,
                487
              ],
              "image_index": 0,
              "raw": "於13:10:30",
              "score": 0.9997,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敞方二村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -48,
        "coordinate_y": 12,
        "timer_seconds": 12568,
        "arrival_time": "13:58:46",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            493,
            549,
            614
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -48,
                "y": 12
              },
              "reasons": [],
              "box": [
                56,
                533,
                106,
                549
              ],
              "image_index": 0,
              "raw": "(−48 |12)",
              "score": 0.8968,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 12568,
              "reasons": [],
              "box": [
                139,
                580,
                218,
                599
              ],
              "image_index": 0,
              "raw": "在3:29:28時",
              "score": 0.9905,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:58:46",
              "reasons": [],
              "box": [
                478,
                580,
                549,
                599
              ],
              "image_index": 0,
              "raw": "於13:58:46",
              "score": 0.9987,
              "options": [],
              "confirmed": false
            }
          }
        }
      }
    ],
    "incoming_reinforcements": [],
    "outgoing": [],
    "returning": [],
    "garrison_own": [],
    "garrison_stationed": [],
    "reinforcing_others": [],
    "movements": [
      {
        "kind": "incoming_raid",
        "role": "敞方村",
        "headline": "Raider 搶奪 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9670,
        "arrival_time": "13:10:28",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            266,
            549,
            379
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                56,
                306,
                106,
                323
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.8967,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9670,
              "reasons": [],
              "box": [
                139,
                353,
                218,
                372
              ],
              "image_index": 0,
              "raw": "在2:41:10時",
              "score": 0.9901,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:28",
              "reasons": [],
              "box": [
                478,
                353,
                549,
                372
              ],
              "image_index": 0,
              "raw": "於13:10:28",
              "score": 0.9979,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9672,
        "arrival_time": "13:10:30",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            379,
            550,
            493
          ],
          "fields": {
            "coords": {
              "status": "low",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [
                "CROP_RECHECK_MISMATCH"
              ],
              "box": [
                56,
                418,
                105,
                435
              ],
              "image_index": 0,
              "raw": "(−45j12)",
              "score": 0.8964,
              "options": [
                {
                  "value": {
                    "x": -45,
                    "y": 12
                  },
                  "label": "(−45|12)",
                  "note": null
                }
              ],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9672,
              "reasons": [],
              "box": [
                139,
                466,
                219,
                487
              ],
              "image_index": 0,
              "raw": "在2:41:12時",
              "score": 0.992,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:30",
              "reasons": [],
              "box": [
                478,
                466,
                550,
                487
              ],
              "image_index": 0,
              "raw": "於13:10:30",
              "score": 0.9997,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敞方二村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -48,
        "coordinate_y": 12,
        "timer_seconds": 12568,
        "arrival_time": "13:58:46",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            56,
            493,
            549,
            614
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -48,
                "y": 12
              },
              "reasons": [],
              "box": [
                56,
                533,
                106,
                549
              ],
              "image_index": 0,
              "raw": "(−48 |12)",
              "score": 0.8968,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 12568,
              "reasons": [],
              "box": [
                139,
                580,
                218,
                599
              ],
              "image_index": 0,
              "raw": "在3:29:28時",
              "score": 0.9905,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:58:46",
              "reasons": [],
              "box": [
                478,
                580,
                549,
                599
              ],
              "image_index": 0,
              "raw": "於13:58:46",
              "score": 0.9987,
              "options": [],
              "confirmed": false
            }
          }
        }
      }
    ]
  },
  "warnings": [],
  "server_time": null,
  "ocr": {
    "engine": "rapidocr-3.9.2/PP-OCRv6-small",
    "images": [
      {
        "image_index": 0,
        "width": 585,
        "height": 1265,
        "bytes": 0,
        "ocr_ms": 2000,
        "round_trip_ms": 2100
      }
    ],
    "elapsed_ms": 2100,
    "low_count": 1,
    "missing_count": 0,
    "dropped_unreadable": 0,
    "overlap_removed": 0,
    "map_checked": false,
    "capture_at_suggested": null,
    "time_source": "client"
  }
} as unknown as OcrRallyResponse

export const ocrCutResponse = {
  "ok": true,
  "page_type": "rally_point",
  "data": {
    "village_id": null,
    "village_name": "HandsomeTing的村莊",
    "server_time": null,
    "incoming": [
      {
        "kind": "incoming_raid",
        "role": "敵方村",
        "headline": "Raider 搶奪 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9670,
        "arrival_time": "13:10:28",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            113,
            538,
            1096,
            769
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                113,
                613,
                211,
                647
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.9572,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9670,
              "reasons": [],
              "box": [
                281,
                708,
                436,
                745
              ],
              "image_index": 0,
              "raw": "在 2:41:10 時",
              "score": 0.9719,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:28",
              "reasons": [],
              "box": [
                957,
                708,
                1096,
                745
              ],
              "image_index": 0,
              "raw": "於 13:10:28",
              "score": 0.9713,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9672,
        "arrival_time": "13:10:30",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            113,
            769,
            1096,
            996
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                113,
                839,
                211,
                874
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.939,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9672,
              "reasons": [],
              "box": [
                281,
                934,
                436,
                972
              ],
              "image_index": 0,
              "raw": "在 2:41:12 時",
              "score": 0.9804,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:30",
              "reasons": [],
              "box": [
                959,
                935,
                1096,
                970
              ],
              "image_index": 0,
              "raw": "於13:10:30",
              "score": 0.9999,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方二村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -48,
        "coordinate_y": 12,
        "timer_seconds": null,
        "arrival_time": null,
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            114,
            996,
            864,
            1100
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -48,
                "y": 12
              },
              "reasons": [],
              "box": [
                114,
                1066,
                211,
                1099
              ],
              "image_index": 0,
              "raw": "(−48 |12)",
              "score": 0.9084,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "missing",
              "value": null,
              "reasons": [
                "TRUNCATED_AT_EDGE"
              ],
              "box": null,
              "image_index": null,
              "raw": null,
              "score": null,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "missing",
              "value": null,
              "reasons": [
                "TRUNCATED_AT_EDGE"
              ],
              "box": null,
              "image_index": null,
              "raw": null,
              "score": null,
              "options": [],
              "confirmed": false
            }
          }
        }
      }
    ],
    "incoming_reinforcements": [],
    "outgoing": [],
    "returning": [],
    "garrison_own": [],
    "garrison_stationed": [],
    "reinforcing_others": [],
    "movements": [
      {
        "kind": "incoming_raid",
        "role": "敵方村",
        "headline": "Raider 搶奪 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9670,
        "arrival_time": "13:10:28",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            113,
            538,
            1096,
            769
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                113,
                613,
                211,
                647
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.9572,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9670,
              "reasons": [],
              "box": [
                281,
                708,
                436,
                745
              ],
              "image_index": 0,
              "raw": "在 2:41:10 時",
              "score": 0.9719,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:28",
              "reasons": [],
              "box": [
                957,
                708,
                1096,
                745
              ],
              "image_index": 0,
              "raw": "於 13:10:28",
              "score": 0.9713,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -45,
        "coordinate_y": 12,
        "timer_seconds": 9672,
        "arrival_time": "13:10:30",
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            113,
            769,
            1096,
            996
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -45,
                "y": 12
              },
              "reasons": [],
              "box": [
                113,
                839,
                211,
                874
              ],
              "image_index": 0,
              "raw": "(−45|12)",
              "score": 0.939,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "ok",
              "value": 9672,
              "reasons": [],
              "box": [
                281,
                934,
                436,
                972
              ],
              "image_index": 0,
              "raw": "在 2:41:12 時",
              "score": 0.9804,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "ok",
              "value": "13:10:30",
              "reasons": [],
              "box": [
                959,
                935,
                1096,
                970
              ],
              "image_index": 0,
              "raw": "於13:10:30",
              "score": 0.9999,
              "options": [],
              "confirmed": false
            }
          }
        }
      },
      {
        "kind": "incoming_attack",
        "role": "敵方二村",
        "headline": "Raider 攻擊 HandsomeTing的村莊",
        "coordinate_x": -48,
        "coordinate_y": 12,
        "timer_seconds": null,
        "arrival_time": null,
        "troops": [],
        "section": "incoming",
        "ocr": {
          "image_index": 0,
          "block_box": [
            114,
            996,
            864,
            1100
          ],
          "fields": {
            "coords": {
              "status": "ok",
              "value": {
                "x": -48,
                "y": 12
              },
              "reasons": [],
              "box": [
                114,
                1066,
                211,
                1099
              ],
              "image_index": 0,
              "raw": "(−48 |12)",
              "score": 0.9084,
              "options": [],
              "confirmed": false
            },
            "countdown": {
              "status": "missing",
              "value": null,
              "reasons": [
                "TRUNCATED_AT_EDGE"
              ],
              "box": null,
              "image_index": null,
              "raw": null,
              "score": null,
              "options": [],
              "confirmed": false
            },
            "arrival": {
              "status": "missing",
              "value": null,
              "reasons": [
                "TRUNCATED_AT_EDGE"
              ],
              "box": null,
              "image_index": null,
              "raw": null,
              "score": null,
              "options": [],
              "confirmed": false
            }
          }
        }
      }
    ]
  },
  "warnings": [],
  "server_time": null,
  "ocr": {
    "engine": "rapidocr-3.9.2/PP-OCRv6-small",
    "images": [
      {
        "image_index": 0,
        "width": 1170,
        "height": 1100,
        "bytes": 0,
        "ocr_ms": 2000,
        "round_trip_ms": 2100
      }
    ],
    "elapsed_ms": 2100,
    "low_count": 0,
    "missing_count": 2,
    "dropped_unreadable": 0,
    "overlap_removed": 0,
    "map_checked": false,
    "capture_at_suggested": null,
    "time_source": "client"
  }
} as unknown as OcrRallyResponse

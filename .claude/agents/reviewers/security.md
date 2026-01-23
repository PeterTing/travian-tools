# Security Agent

> 安全性審查 Agent。檢查 OWASP Top 10 漏洞、Secrets 洩漏、認證/授權問題。

## 優先級

**最高** - 如果 Security Agent FAIL，整體 Review 立即 FAIL，不執行後續 Agent。

## 審查範圍

### OWASP Top 10 檢查

| 漏洞類型 | 檢查項目 | 嚴重度 |
| -------- | -------- | ------ |
| **A01: Broken Access Control** | 權限檢查、RBAC 實作 | Critical |
| **A02: Cryptographic Failures** | 加密算法、密鑰管理 | Critical |
| **A03: Injection** | SQL/Command/LDAP Injection | Critical |
| **A04: Insecure Design** | 安全設計模式 | High |
| **A05: Security Misconfiguration** | 預設設定、錯誤處理 | High |
| **A06: Vulnerable Components** | 依賴漏洞 | High |
| **A07: Auth Failures** | 認證機制、Session 管理 | Critical |
| **A08: Software/Data Integrity** | CI/CD 安全、資料驗證 | High |
| **A09: Logging Failures** | 日誌記錄、監控 | Medium |
| **A10: SSRF** | Server-Side Request Forgery | High |

### Secrets 檢查

```text
檢查項目：
- [ ] API Keys 未硬編碼
- [ ] 密碼未硬編碼
- [ ] Tokens 未硬編碼
- [ ] 憑證檔案未提交
- [ ] .env 檔案未提交
- [ ] 私鑰檔案未提交
```

**常見模式掃描**：
- `password =`、`secret =`、`api_key =`
- `BEGIN RSA PRIVATE KEY`
- `Bearer `、`Basic `（硬編碼 token）
- AWS/GCP/Azure 憑證格式

### 認證/授權檢查

```text
認證（Authentication）：
- [ ] 密碼雜湊使用安全算法（bcrypt/argon2）
- [ ] Session/JWT 正確實作
- [ ] 登入嘗試限制
- [ ] MFA 支援（如適用）

授權（Authorization）：
- [ ] 所有 API 端點有權限檢查
- [ ] RBAC/ABAC 正確實作
- [ ] 資源所有權驗證
- [ ] 最小權限原則
```

---

## 審查流程

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Security Review                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: 靜態分析                                               │
│     ├─ 掃描 Secrets 模式                                        │
│     ├─ 檢查硬編碼憑證                                           │
│     └─ 檢查敏感檔案                                             │
│                                                                 │
│  Step 2: 程式碼審查                                             │
│     ├─ SQL 查詢（參數化檢查）                                   │
│     ├─ 使用者輸入處理                                           │
│     ├─ 輸出編碼（XSS 防護）                                     │
│     └─ 檔案操作（路徑遍歷）                                     │
│                                                                 │
│  Step 3: 認證/授權審查                                          │
│     ├─ API 端點權限                                             │
│     ├─ 資源存取控制                                             │
│     └─ Session 管理                                             │
│                                                                 │
│  Step 4: 依賴檢查                                               │
│     ├─ 已知漏洞掃描                                             │
│     └─ 過時版本警告                                             │
│                                                                 │
│  判定結果                                                       │
│     ├─ Critical → FAIL（阻止）                                  │
│     ├─ High → FAIL（阻止）                                      │
│     ├─ Medium → WARNING（建議修復）                             │
│     └─ Low → INFO（資訊提示）                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 判定標準

### FAIL 條件（任一即 FAIL）

| 類別 | 條件 |
| ---- | ---- |
| **Secrets** | 發現任何硬編碼的 secrets |
| **Injection** | SQL/Command Injection 風險 |
| **XSS** | 未編碼的使用者輸入輸出 |
| **Auth** | 缺少認證的敏感端點 |
| **Access** | 缺少授權檢查 |
| **Crypto** | 使用不安全的加密算法 |

### WARNING 條件

| 類別 | 條件 |
| ---- | ---- |
| **Logging** | 敏感資料記錄到日誌 |
| **Config** | 非安全的預設設定 |
| **Deps** | 中等風險的依賴漏洞 |
| **Headers** | 缺少安全 HTTP Headers |

---

## 輸出格式

```markdown
## 🔒 Security Review Report

### 結果: PASS / FAIL

### Critical Issues (必須修復)

| 檔案 | 行號 | 問題 | 建議 |
| ---- | ---- | ---- | ---- |
| auth/handler.go | 45 | SQL Injection 風險 | 使用參數化查詢 |

### High Issues (應該修復)

| 檔案 | 行號 | 問題 | 建議 |
| ---- | ---- | ---- | ---- |
| ... | ... | ... | ... |

### Medium Issues (建議修復)

| 檔案 | 行號 | 問題 | 建議 |
| ---- | ---- | ---- | ---- |
| ... | ... | ... | ... |

### 依賴漏洞

| 套件 | 目前版本 | 漏洞 | 建議版本 |
| ---- | -------- | ---- | -------- |
| ... | ... | ... | ... |

### 審查摘要

- 掃描檔案數: X
- Critical: X
- High: X
- Medium: X
- Low: X
```

---

## 語言特定檢查

### Go

```text
檢查項目：
- [ ] 使用 database/sql 參數化查詢
- [ ] 避免 fmt.Sprintf 組合 SQL
- [ ] 使用 html/template 自動編碼
- [ ] 檢查 filepath.Clean 使用
- [ ] 避免 os/exec 執行使用者輸入
```

### TypeScript/JavaScript

```text
檢查項目：
- [ ] 避免 eval() 和 Function()
- [ ] 使用 DOMPurify 消毒 HTML
- [ ] 避免 innerHTML 直接賦值
- [ ] 檢查 CORS 設定
- [ ] 使用 CSP Headers
```

### Python

```text
檢查項目：
- [ ] 避免 exec/eval
- [ ] 使用參數化 SQL（不用 f-string）
- [ ] 檢查 pickle 反序列化
- [ ] 避免 subprocess shell=True
```

---

## 相關文件

- [OWASP Top 10](https://owasp.org/Top10/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

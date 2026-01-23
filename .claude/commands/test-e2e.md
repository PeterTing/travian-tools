# E2E Testing Command

自動化端到端測試命令 - 使用 Playwright 測試關鍵用戶流程

## Usage

```
/project:test-e2e [flow-name]
```

## 參考 Skills 和 Agents

執行 E2E 測試時參考：

| 類型 | 名稱 | 檔案位置 | 用途 |
|------|------|---------|------|
| **Skill** | webapp-testing | `.claude/skills/webapp-testing/` | Playwright E2E 測試通用指南 |
| **Agent** | Test Agent | `.claude/agents/reviewers/test.md` | 測試覆蓋率檢查、關鍵流程驗證 |
| **Agent** | Frontend Expert | `.claude/agents/experts/frontend.md` | 元件互動規範、頁面結構 |

## 參數

- `flow-name` (可選): 指定要測試的流程
  - `auth` - 認證流程（登入、註冊、登出）
  - `query` - 查詢執行流程
  - `dashboard` - 儀表板互動
  - 不指定則執行所有測試

## 觸發場景

當用戶要求以下操作時啟動此 command:
- "執行 E2E 測試"
- "測試登入流程"
- "測試用戶操作"
- "執行 Playwright 測試"
- 在 `/project:done` 時自動執行

## 執行流程

### Phase 1: 环境检查

1. 检查 Playwright 是否已安装
   ```bash
   cd frontend && pnpm list @playwright/test
   ```

2. 如果未安装，询问用户是否安装：
   ```bash
   pnpm install -D @playwright/test
   npx playwright install
   ```

3. 检查 `playwright.config.ts` 是否存在
   - 如果不存在，生成配置文件

### Phase 2: 服务器管理

1. 检查 dev server 是否运行
   ```bash
   curl -s http://localhost:3000 > /dev/null || echo "Server not running"
   ```

2. 如果未运行，启动 dev server：
   ```bash
   # 方式 1: Docker Compose (推荐)
   docker-compose up -d

   # 方式 2: 手动启动
   cd backend && go run cmd/server/main.go &
   cd frontend && pnpm run dev &
   ```

3. 等待服务器就绪（最多 30 秒）
   ```bash
   timeout 30 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 1; done'
   ```

### Phase 3: 测试执行

1. 根据参数运行对应测试：
   ```bash
   cd frontend

   # 运行所有测试
   pnpm run test:e2e

   # 运行特定流程
   pnpm run test:e2e tests/e2e/auth/

   # Headed 模式（显示浏览器）
   pnpm run test:e2e:headed
   ```

2. 生成测试报告：
   ```bash
   npx playwright show-report
   ```

### Phase 4: 结果分析

1. **成功**：
   ```
   ✅ E2E 测试通过

   📊 测试结果：
   - 总测试数：15
   - 通过：15
   - 失败：0
   - 跳过：0
   - 运行时间：45s

   🎯 覆盖的流程：
   - ✅ 登录流程 (5 tests)
   - ✅ 注册流程 (3 tests)
   - ✅ 登出流程 (2 tests)
   - ✅ Token refresh (5 tests)

   📸 截图：test-results/screenshots/
   📄 报告：playwright-report/index.html
   ```

2. **失败**：
   ```
   ❌ E2E 测试失败

   📊 测试结果：
   - 总测试数：15
   - 通过：12
   - 失败：3
   - 跳过：0

   ❌ 失败的测试：
   1. tests/e2e/auth/login.spec.ts:15
      - 错误：Timeout waiting for button[type="submit"]
      - 截图：test-results/login-failed.png

   2. tests/e2e/auth/login.spec.ts:28
      - 错误：Expected URL to contain "dashboard", got "login"
      - Console logs：
        - Error: Invalid credentials

   3. tests/e2e/auth/register.spec.ts:42
      - 错误：Element not found: input[name="confirmPassword"]

   💡 建议：
   - 检查 UI 元素是否存在
   - 检查 API 响应是否正确
   - 检查是否有 console errors
   - 查看截图：test-results/
   ```

3. **超时**：
   ```
   ⏱️  E2E 测试超时

   原因：服务器未在 30 秒内启动

   💡 检查：
   - docker-compose logs
   - backend/server 是否运行
   - frontend/dev server 是否运行
   - 端口 3000, 8000 是否被占用
   ```

## 测试文件结构

```text
frontend/tests/e2e/
├── auth/
│   ├── login.spec.ts           # 登录流程测试
│   ├── register.spec.ts        # 注册流程测试
│   ├── logout.spec.ts          # 登出流程测试
│   └── token-refresh.spec.ts   # Token 刷新测试
├── query/                       # Phase 2
│   ├── connect.spec.ts
│   ├── execute.spec.ts
│   └── export.spec.ts
├── dashboard/                   # Phase 2
│   ├── create.spec.ts
│   └── widgets.spec.ts
└── fixtures/
    └── test-data.ts            # 测试数据
```

## 测试编写指南

### 基础模板

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // 1. 导航到页面
    await page.goto('http://localhost:3000/feature')

    // 2. 等待页面加载完成 (Critical!)
    await page.waitForLoadState('networkidle')
  })

  test('should do something', async ({ page }) => {
    // 3. 执行操作
    await page.fill('input[name="field"]', 'value')
    await page.click('button[type="submit"]')

    // 4. 验证结果
    await expect(page.locator('h1')).toContainText('Success')

    // 5. 可选：截图
    await page.screenshot({ path: 'test-results/success.png' })
  })

  test('should handle error', async ({ page }) => {
    // 测试错误情况
    await page.fill('input[name="field"]', 'invalid')
    await page.click('button[type="submit"]')

    // 验证错误消息
    await expect(page.locator('.error-message')).toBeVisible()
  })
})
```

### 最佳实践

#### 1. 使用 data-testid

```typescript
// ✅ 推荐：使用 data-testid
await page.locator('[data-testid="login-button"]').click()

// ❌ 避免：使用脆弱的选择器
await page.locator('div > div > button:nth-child(3)').click()
```

```tsx
// Component 中添加 data-testid
<button data-testid="login-button" type="submit">
  登录
</button>
```

#### 2. 等待策略

```typescript
// ✅ 推荐：等待 networkidle
await page.waitForLoadState('networkidle')

// ✅ 推荐：等待特定元素
await page.waitForSelector('[data-testid="dashboard"]')

// ❌ 避免：固定时间等待
await page.waitForTimeout(5000)
```

#### 3. 错误处理

```typescript
test('should handle network error', async ({ page }) => {
  // 监听 console errors
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })

  // 执行操作
  await page.click('[data-testid="submit"]')

  // 验证没有 console errors
  expect(errors).toHaveLength(0)
})
```

#### 4. 截图和追踪

```typescript
test('important flow', async ({ page }) => {
  // 开始追踪
  await page.context().tracing.start({ screenshots: true, snapshots: true })

  // 执行操作
  // ...

  // 失败时保存追踪
  await page.context().tracing.stop({ path: 'test-results/trace.zip' })
})
```

## 与 Test Agent 整合

E2E 测试会被 Test Agent 检查：

### Test Agent 审查项目

```bash
# 检查 Playwright 配置
[[ -f "frontend/playwright.config.ts" ]] || echo "❌ Missing: playwright.config.ts"

# 检查关键流程测试
for flow in auth query dashboard; do
  [[ -d "frontend/tests/e2e/$flow" ]] || echo "⚠️  Missing E2E tests: $flow"
done

# 运行 E2E 测试
cd frontend && pnpm run test:e2e

# 检查测试结果
if [ $? -ne 0 ]; then
  echo "❌ E2E tests failed"
  exit 1
fi
```

### FAIL 条件

- 关键用户流程缺少 E2E 测试（auth 是必须的）
- E2E 测试执行失败
- 测试覆盖率 < 60% (Phase 1: auth only)

## GitHub Actions 整合

```yaml
# .github/workflows/test.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd frontend && pnpm ci

      - name: Install Playwright
        run: cd frontend && npx playwright install --with-deps

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -s http://localhost:3000; do sleep 2; done'

      - name: Run E2E tests
        run: cd frontend && pnpm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7
```

## Troubleshooting

### 问题 1：服务器未启动

```bash
# 检查端口占用
lsof -i :3000
lsof -i :8000

# 查看 Docker 日志
docker-compose logs frontend
docker-compose logs backend

# 手动启动服务
docker-compose up
```

### 问题 2：浏览器未安装

```bash
# 安装所有浏览器
npx playwright install

# 只安装 Chromium
npx playwright install chromium
```

### 问题 3：测试不稳定

```typescript
// 增加超时时间
test.setTimeout(60000)

// 增加重试次数
test.describe.configure({ retries: 2 })

// 使用更可靠的选择器
await page.locator('[data-testid="button"]').click()
```

### 问题 4：截图没有生成

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'on', // 总是截图
    // 或
    screenshot: 'only-on-failure', // 仅失败时截图
  },
})
```

## 相关文件

- Skill 文档：`.claude/skills/webapp-testing/SKILL.md`
- Playwright 配置：`frontend/playwright.config.ts`
- 测试目录：`frontend/tests/e2e/`
- Test Agent：`.claude/agents/reviewers/test.md`

## 相关 Tickets

- TICKET-002: 用户注册（登录流程 E2E 测试）
- TICKET-003: 用户登录 + JWT（Token 相关 E2E 测试）
- Phase 2: 查询、Dashboard E2E 测试

---

**Skill 来源**: Anthropic Skills - `webapp-testing`
**整合日期**: 2026-01-20
**维护者**: InsightHub Team

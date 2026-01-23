# Web Application Testing Skill

## Overview

This toolkit enables automated testing of local web applications using Playwright with Python. The system manages server lifecycles and provides utilities for frontend verification, UI debugging, and browser inspection.

## Core Capabilities

**Testing Features:**
- Frontend functionality verification
- UI behavior debugging
- Browser screenshot capture
- Browser console log viewing
- Dynamic and static web application support

**Server Management:**
The `with_server.py` helper script orchestrates application servers, supporting both single and multiple concurrent server instances (useful for backend/frontend pairs).

## Usage Workflow

The documentation outlines a decision tree approach:

1. **Static HTML** → Read file directly to extract selectors, then write Playwright scripts
2. **Dynamic Applications** → Either start servers via helper script or connect to running instances
3. **Reconnaissance Pattern** → Screenshot/inspect DOM after networkidle, identify selectors, execute actions

## Critical Best Practices

**Essential requirement:** "Wait for `page.wait_for_load_state('networkidle')` before inspection" on dynamic applications. Inspecting prematurely produces incomplete results.

**Recommended approach:** Treat bundled scripts in `scripts/` as black-box utilities by consulting `--help` first rather than reading source code to preserve context window.

## Reference Materials

Available examples demonstrate element discovery, static HTML automation, and console logging patterns—foundational patterns for building custom test scripts.

---

## InsightHub E2E Testing Guide

### Test Structure

```typescript
// frontend/tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')
  })

  test('should login successfully', async ({ page }) => {
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test1234')

    // Submit
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForURL('**/dashboard')

    // Verify
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})
```

### Critical User Flows to Test

1. **Authentication** (`tests/e2e/auth/`)
   - Login flow
   - Register flow
   - Logout flow
   - Token refresh

2. **Query Execution** (`tests/e2e/query/`) - Phase 2
   - Connect to database
   - Execute query
   - View results
   - Export results

3. **Dashboard** (`tests/e2e/dashboard/`) - Phase 2
   - Create dashboard
   - Add widgets
   - View metrics

### Best Practices

- Always wait for `networkidle` before assertions
- Use data-testid attributes for reliable selectors
- Take screenshots on failure
- Capture console errors
- Run in headless mode in CI

### Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

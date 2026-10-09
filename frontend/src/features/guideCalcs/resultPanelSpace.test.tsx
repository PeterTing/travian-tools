import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CalcResultPanel, { PANEL_HEIGHT_VAR } from './components/CalcResultPanel'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pages = import.meta.glob(['/src/features/guideCalcs/components/*.tsx', '/src/pages/**/*.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const css = readFileSync(resolve(__dirname, 'components/calc.module.css'), 'utf8')

const rule = (selector: string) => {
  const m = css.match(new RegExp(`(^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  return m ? m[2] : ''
}

describe('固定在底部的結果列不蓋住輸入', () => {
  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('the panel publishes its current height: collapsed, then expanded (follows the panel), unmount clears it', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 183.4 } as DOMRect)
    const root = document.documentElement
    const { unmount } = render(
      <CalcResultPanel title="結果" primary="0h 0m 0s" secondary="0 格">
        <p>明細</p>
      </CalcResultPanel>,
    )
    expect(root.style.getPropertyValue(PANEL_HEIGHT_VAR)).toBe('184px')

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 400 } as DOMRect)
    fireEvent.click(screen.getByTestId('calc-result-toggle'))
    // 展開明細：留白跟著面板現在的高度（設計師擋件：捲到底時最後一個輸入不被蓋住）
    expect(root.style.getPropertyValue(PANEL_HEIGHT_VAR)).toBe('400px')

    unmount()
    expect(root.style.getPropertyValue(PANEL_HEIGHT_VAR)).toBe('')
  })

  it('a ResizeObserver keeps it in sync while the panel changes height (e.g. a chip note opens)', () => {
    let cb: ResizeObserverCallback | null = null
    const orig = globalThis.ResizeObserver
    globalThis.ResizeObserver = class {
      constructor(c: ResizeObserverCallback) { cb = c }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    try {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 180 } as DOMRect)
      render(<CalcResultPanel title="結果" primary="1" secondary="2"><p>明細</p></CalcResultPanel>)
      expect(document.documentElement.style.getPropertyValue(PANEL_HEIGHT_VAR)).toBe('180px')
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 306 } as DOMRect)
      cb!([], {} as ResizeObserver)
      expect(document.documentElement.style.getPropertyValue(PANEL_HEIGHT_VAR)).toBe('306px')
    } finally {
      globalThis.ResizeObserver = orig
    }
  })

  it('shared input-area padding = collapsed panel height + 16px (wrapper and panelSpace)', () => {
    expect(rule('.wrapper')).toContain('padding-bottom: calc(var(--calc-panel-h, 12rem) + 16px)')
    expect(rule('.panelSpace')).toContain('padding-bottom: calc(var(--calc-panel-h, 12rem) + 16px)')
  })

  it('every page that uses CalcResultPanel sits in the shared padded layout', () => {
    const users = Object.entries(pages).filter(
      ([path, src]) =>
        !path.endsWith('CalcResultPanel.tsx') && !path.includes('.test.') && /import CalcResultPanel\b/.test(src),
    )
    expect(users.length).toBeGreaterThanOrEqual(9)
    for (const [path, src] of users) {
      expect(/className=\{s\.wrapper\}|RESULT_PANEL_SPACE_CLASS/.test(src), path).toBe(true)
    }
  })
})

import { describe, it, expect } from 'vitest'

describe('Tooling baseline (F-002)', () => {
  it('runs tests in Vitest with expect assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('supports DOM environment via jsdom', () => {
    const el = document.createElement('div')
    el.textContent = 'Kinka PWA'
    expect(el).toHaveTextContent('Kinka PWA')
  })

  it('loads environment variables or default fallback', () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
    expect(apiUrl).toBeDefined()
    expect(apiUrl).toContain('http')
  })
})

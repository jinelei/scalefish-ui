import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (t: Theme) => void
  cycleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('light', resolved === 'light')
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    const t = getInitialTheme()
    return t === 'system' ? getSystemTheme() : t
  })

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    const r = t === 'system' ? getSystemTheme() : t
    setResolved(r)
    applyTheme(r)
  }, [])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['system', 'light', 'dark']
    const idx = order.indexOf(theme)
    setTheme(order[(idx + 1) % order.length])
  }, [theme, setTheme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (theme === 'system') {
        const r = getSystemTheme()
        setResolved(r)
        applyTheme(r)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    applyTheme(resolved)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

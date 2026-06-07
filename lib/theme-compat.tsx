import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (theme === 'system' && prefersDark),
  )
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'docvue-theme',
}: {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    return (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme
  })

  useEffect(() => {
    localStorage.setItem(storageKey, theme)
    applyTheme(theme)
  }, [storageKey, theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeState,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

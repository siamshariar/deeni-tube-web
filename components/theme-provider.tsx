'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes'
import { THEME_COLORS } from '@/lib/theme-colors'

// The browser's bar on phones has the page's colour, also when the theme chosen here isn't the phone's own and when it
// changes (the viewport's theme-color only follows the phone's setting)
function ThemeColor() {
  const { resolvedTheme } = useTheme()
  React.useEffect(() => {
    if (resolvedTheme !== 'dark' && resolvedTheme !== 'light') return
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', THEME_COLORS[resolvedTheme]))
  }, [resolvedTheme])
  return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColor />
      {children}
    </NextThemesProvider>
  )
}

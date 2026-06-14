'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { argbFromHex, themeFromSourceColor, hexFromArgb } from '@material/material-color-utilities'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  colorHex: string
  setColorHex: (c: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  colorHex: '#6750A4',
  setColorHex: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('system')
  const [colorHex, setColorHex] = useState<string>('#6750A4') // Default violet

  // Load from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('studentdash-theme-mode') as ThemeMode
    if (savedMode) setMode(savedMode)
    const savedColor = localStorage.getItem('studentdash-theme-color')
    if (savedColor) setColorHex(savedColor)
  }, [])

  // Save changes
  useEffect(() => {
    localStorage.setItem('studentdash-theme-mode', mode)
    localStorage.setItem('studentdash-theme-color', colorHex)
  }, [mode, colorHex])

  // Apply CSS variables
  useEffect(() => {
    const applyTheme = () => {
      let isDark = false
      if (mode === 'dark') isDark = true
      else if (mode === 'light') isDark = false
      else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      }

      const argb = argbFromHex(colorHex)
      const theme = themeFromSourceColor(argb)
      const scheme = isDark ? theme.schemes.dark : theme.schemes.light

      const root = document.documentElement

      // Helper to set CSS var from ARGB
      const setVar = (name: string, valueArgb: number) => {
        root.style.setProperty(name, hexFromArgb(valueArgb))
      }

      setVar('--md-primary', scheme.primary)
      setVar('--md-on-primary', scheme.onPrimary)
      setVar('--md-primary-container', scheme.primaryContainer)
      setVar('--md-on-primary-container', scheme.onPrimaryContainer)
      
      setVar('--md-secondary', scheme.secondary)
      setVar('--md-on-secondary', scheme.onSecondary)
      setVar('--md-secondary-container', scheme.secondaryContainer)
      setVar('--md-on-secondary-container', scheme.onSecondaryContainer)
      
      setVar('--md-tertiary', scheme.tertiary)
      setVar('--md-on-tertiary', scheme.onTertiary)
      setVar('--md-tertiary-container', scheme.tertiaryContainer)
      setVar('--md-on-tertiary-container', scheme.onTertiaryContainer)
      
      setVar('--md-error', scheme.error)
      setVar('--md-on-error', scheme.onError)
      setVar('--md-error-container', scheme.errorContainer)
      setVar('--md-on-error-container', scheme.onErrorContainer)
      
      setVar('--md-background', scheme.background)
      setVar('--md-on-background', scheme.onBackground)
      setVar('--md-surface', scheme.surface)
      setVar('--md-on-surface', scheme.onSurface)
      setVar('--md-surface-variant', scheme.surfaceVariant)
      setVar('--md-on-surface-variant', scheme.onSurfaceVariant)
      setVar('--md-outline', scheme.outline)
      setVar('--md-outline-variant', scheme.outlineVariant)

      // Access extra surface colors from the internal json object if available
      const rawScheme = scheme.toJSON() as any
      if (rawScheme.surfaceContainer) {
        setVar('--md-surface-container', rawScheme.surfaceContainer)
        setVar('--md-surface-container-high', rawScheme.surfaceContainerHigh)
        setVar('--md-surface-container-highest', rawScheme.surfaceContainerHighest)
        // Add surface-container-lowest manually if needed
        root.style.setProperty('--md-surface-container-lowest', isDark ? '#0f0d13' : '#ffffff')
      } else {
         // Fallback if the version of material-color-utilities is older
         setVar('--md-surface-container', isDark ? theme.palettes.neutral.tone(12) : theme.palettes.neutral.tone(94))
         setVar('--md-surface-container-high', isDark ? theme.palettes.neutral.tone(17) : theme.palettes.neutral.tone(92))
         setVar('--md-surface-container-highest', isDark ? theme.palettes.neutral.tone(22) : theme.palettes.neutral.tone(90))
         root.style.setProperty('--md-surface-container-lowest', isDark ? '#0f0d13' : '#ffffff')
      }

      // Update theme-color meta tag for Edge-to-Edge mobile status bar
      let metaThemeColor = document.getElementById('meta-theme-color')
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta')
        metaThemeColor.setAttribute('name', 'theme-color')
        metaThemeColor.setAttribute('id', 'meta-theme-color')
        document.head.appendChild(metaThemeColor)
      }
      metaThemeColor.setAttribute('content', hexFromArgb(scheme.background))
    }

    applyTheme()

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme()
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [mode, colorHex])

  return (
    <ThemeContext.Provider value={{ mode, setMode, colorHex, setColorHex }}>
      {children}
    </ThemeContext.Provider>
  )
}

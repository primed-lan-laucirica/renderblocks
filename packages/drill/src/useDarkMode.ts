import { useCallback, useEffect, useState } from 'react'

/**
 * Same contract as the other games' hooks: shared 'darkMode' localStorage key
 * and the .dark class on <html>, so the theme follows the kid across games.
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) {
      return stored === 'true'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', String(isDark))
  }, [isDark])

  const toggle = useCallback(() => {
    setIsDark((prev) => !prev)
  }, [])

  return { isDark, toggle }
}

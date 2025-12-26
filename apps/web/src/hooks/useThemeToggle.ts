import { useEffect, useState } from 'react'

const LIGHT_BG = '#f8fafc'
const DARK_BG = '#020617'

export function useThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isReady) return
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    root.style.backgroundColor = isDark ? DARK_BG : LIGHT_BG
    root.style.color = isDark ? LIGHT_BG : DARK_BG
    localStorage.setItem('pokebench-theme', isDark ? 'dark' : 'light')
  }, [isDark, isReady])

  return { isDark, setIsDark }
}

import { useEffect, useState } from 'react'

export function useScrollRevealBand() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastScrollY = window.scrollY

    function handleScroll() {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY

      if (currentScrollY < 80) {
        setVisible(true)
        lastScrollY = currentScrollY
        return
      }

      if (Math.abs(delta) < 8) return
      setVisible(delta < 0)
      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return visible
}

import { useEffect, useRef, useState } from 'react'

export const scrollRevealTransitionClass =
  'will-change-transform transition-[transform,opacity,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'

export function scrollRevealStateClass(visible: boolean, direction: 'down' | 'up' = 'up') {
  if (visible) return 'translate-y-0 opacity-100'
  return direction === 'down'
    ? 'pointer-events-none translate-y-[calc(100%+0.75rem)] opacity-0'
    : 'pointer-events-none -translate-y-[calc(100%+0.75rem)] opacity-0'
}

export function useScrollRevealBand({
  hideAfter = 112,
  revealNearTop = 40,
}: {
  hideAfter?: number
  revealNearTop?: number
} = {}) {
  const [visible, setVisible] = useState(true)
  const visibleRef = useRef(true)

  useEffect(() => {
    let lastScrollY = Math.max(window.scrollY, 0)
    let direction: 'down' | 'up' = 'up'
    let directionalTravel = 0
    let frame = 0

    function updateVisible(nextVisible: boolean) {
      if (visibleRef.current === nextVisible) return
      visibleRef.current = nextVisible
      setVisible(nextVisible)
    }

    function measureScroll() {
      frame = 0
      const currentScrollY = Math.max(window.scrollY, 0)
      const delta = currentScrollY - lastScrollY
      lastScrollY = currentScrollY

      if (currentScrollY <= revealNearTop) {
        directionalTravel = 0
        direction = 'up'
        updateVisible(true)
        return
      }

      if (Math.abs(delta) < 0.5) return
      const nextDirection = delta > 0 ? 'down' : 'up'
      if (nextDirection !== direction) {
        direction = nextDirection
        directionalTravel = 0
      }
      directionalTravel += Math.abs(delta)

      if (direction === 'down' && currentScrollY > hideAfter && directionalTravel >= 28) {
        directionalTravel = 0
        updateVisible(false)
      } else if (direction === 'up' && directionalTravel >= 14) {
        directionalTravel = 0
        updateVisible(true)
      }
    }

    function handleScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(measureScroll)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [hideAfter, revealNearTop])

  return visible
}

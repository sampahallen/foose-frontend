import { useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

type LongPressOptions = {
  moveTolerancePx?: number
  thresholdMs?: number
}

export function useLongPress(onLongPress: () => void, { moveTolerancePx = 10, thresholdMs = 450 }: LongPressOptions = {}) {
  const timerRef = useRef<number | null>(null)
  const startRef = useRef({ x: 0, y: 0 })
  const firedRef = useRef(false)
  const [pressed, setPressed] = useState(false)

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function onPointerDown(event: PointerEvent) {
    startRef.current = { x: event.clientX, y: event.clientY }
    clearTimer()
    setPressed(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      firedRef.current = true
      onLongPress()
    }, thresholdMs)
  }

  function onPointerMove(event: PointerEvent) {
    if (timerRef.current === null) return
    const dx = event.clientX - startRef.current.x
    const dy = event.clientY - startRef.current.y
    if (Math.hypot(dx, dy) > moveTolerancePx) clearTimer()
  }

  function onPointerUp() {
    clearTimer()
    setPressed(false)
  }

  function onClickCapture(event: MouseEvent) {
    if (!firedRef.current) return
    firedRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    onClickCapture,
    onPointerCancel: onPointerUp,
    onPointerDown,
    onPointerLeave: onPointerUp,
    onPointerMove,
    onPointerUp,
    pressed,
  }
}

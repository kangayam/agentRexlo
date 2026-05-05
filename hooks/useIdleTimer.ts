import { useEffect, useRef, useCallback } from 'react'

const IDLE_MS = 28 * 60 * 1000
const WARN_MS =  2 * 60 * 1000

export function useIdleTimer(
  onWarn:   () => void,
  onLogout: () => void
) {
  const idleTimer = useRef<ReturnType<typeof setTimeout>>()
  const warnTimer = useRef<ReturnType<typeof setTimeout>>()

  const reset = useCallback(() => {
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    idleTimer.current = setTimeout(() => {
      onWarn()
      warnTimer.current = setTimeout(onLogout, WARN_MS)
    }, IDLE_MS)
  }, [onWarn, onLogout])

  useEffect(() => {
    const events = [
      'mousemove', 'mousedown', 'keypress',
      'scroll', 'touchstart', 'click',
    ]
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearTimeout(idleTimer.current)
      clearTimeout(warnTimer.current)
    }
  }, [reset])
}

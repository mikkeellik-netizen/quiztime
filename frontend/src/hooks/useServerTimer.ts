import { useState, useEffect } from 'react'

export function useServerTimer(expiresAt: string | null, timerSec: number = 30): number {
  const [secondsLeft, setSecondsLeft] = useState(timerSec)

  useEffect(() => {
    if (!expiresAt) return

    const tick = () => {
      const left = Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000)
      setSecondsLeft(Math.ceil(left))
    }

    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [expiresAt])

  return secondsLeft
}

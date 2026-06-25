'use client'
import { useRef, useCallback } from 'react'

export function useDebounce(fn: () => void | Promise<void>, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a ref to the latest fn so the trigger closure doesn't go stale
  const fnRef = useRef(fn)
  fnRef.current = fn

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { fnRef.current() }, delay)
  }, [delay])

  return { trigger }
}

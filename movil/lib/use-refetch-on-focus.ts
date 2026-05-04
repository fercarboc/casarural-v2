import { useEffect, useRef } from 'react'

export function useRefetchOnFocus(refetch: () => void) {
  const refetchRef = useRef(refetch)
  useEffect(() => { refetchRef.current = refetch })

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') refetchRef.current()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])
}

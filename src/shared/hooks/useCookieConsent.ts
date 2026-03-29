import { useState, useEffect, createContext, useContext } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ConsentLevel = 'all' | 'essential' | null

export interface CookieConsentState {
  consent: ConsentLevel
  hasDecided: boolean
  acceptAll: () => void
  acceptEssential: () => void
  resetConsent: () => void
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

export const CookieConsentContext = createContext<CookieConsentState | null>(null)

export function useCookieConsentContext(): CookieConsentState {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsentContext must be used within CookieConsentContext.Provider')
  return ctx
}

// ─── Hook principal ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'cookieConsent'

export function useCookieConsent(): CookieConsentState {
  const [consent, setConsent] = useState<ConsentLevel>(null)
  const [hasDecided, setHasDecided] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentLevel | null
    if (stored === 'all' || stored === 'essential') {
      setConsent(stored)
      setHasDecided(true)
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, 'all')
    setConsent('all')
    setHasDecided(true)
  }

  const acceptEssential = () => {
    localStorage.setItem(STORAGE_KEY, 'essential')
    setConsent('essential')
    setHasDecided(true)
  }

  const resetConsent = () => {
    localStorage.removeItem(STORAGE_KEY)
    setConsent(null)
    setHasDecided(false)
  }

  return { consent, hasDecided, acceptAll, acceptEssential, resetConsent }
}

export type CookieConsentContextType = ReturnType<typeof useCookieConsent>

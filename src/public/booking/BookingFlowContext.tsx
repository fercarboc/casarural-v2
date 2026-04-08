import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react'

export type RateType = 'FLEXIBLE' | 'NON_REFUNDABLE'

export type PropertyRow = {
  id: string
  nombre: string
}

export type UnitRow = {
  id: string
  nombre: string
  slug: string
  capacidad_base: number
  capacidad_maxima: number
  orden?: number | null
  activa: boolean
}

export type SuggestedUnit = {
  id: string
  slug: string
  nombre: string
  capacidad_base: number
  capacidad_maxima: number
  num_huespedes_asignados: number
  importe_alojamiento: number
  importe_limpieza: number
  importe_extras: number
  importe_total_unidad: number
  desglose?: any
}

export type SuggestedCombination = {
  ranking: number
  tipo: 'RECOMENDADA' | 'ALTERNATIVA' | 'COMPLETA'
  unidades: SuggestedUnit[]
  total_capacidad_base: number
  total_capacidad_maxima: number
  total_huespedes_asignados: number
  precio_total: number
  precio_por_huesped: number
  es_exacta_capacidad_base: boolean
  exceso_capacidad: number
  num_unidades: number
}

export type RemotePriceUnit = {
  unidad_id: string
  unidad_nombre: string
  unidad_slug: string
  nights: number
  num_huespedes: number
  extra_guests: number
  season: string
  temporada_id: string | null
  precio_noche: number
  extra_huesped: number
  importe_alojamiento: number
  importe_extra: number
  limpieza: number
  descuento: number
  subtotal: number
  total: number
  desglose: any
}

export type RemotePriceBreakdown = {
  ok?: boolean
  mode: 'single' | 'multi'
  property_id?: string
  checkIn?: string
  checkOut?: string
  nights: number
  num_huespedes: number
  rate_type: string
  unidades: RemotePriceUnit[]
  importe_alojamiento: number
  importe_extras: number
  importe_limpieza: number
  descuento_aplicado: number
  importe_total: number
  importe_senal: number | null
  importe_resto: number | null
}

export type DayAvailability = {
  blocked: number
  total: number
}

type BookingFlowState = {
  property: PropertyRow | null
  units: UnitRow[]
  checkIn: string | null
  checkOut: string | null
  guests: number
  suggestions: SuggestedCombination[]
  selectedCombination: SuggestedCombination | null
  rateType: RateType
  priceBreakdown: RemotePriceBreakdown | null
  availabilityByDate: Record<string, DayAvailability>
}

type BookingFlowContextValue = BookingFlowState & {
  setProperty: (value: PropertyRow | null) => void
  setUnits: (value: UnitRow[]) => void
  setCheckIn: (value: string | null) => void
  setCheckOut: (value: string | null) => void
  setGuests: (value: number) => void
  setSuggestions: (value: SuggestedCombination[]) => void
  setSelectedCombination: (value: SuggestedCombination | null) => void
  setRateType: (value: RateType) => void
  setPriceBreakdown: (value: RemotePriceBreakdown | null) => void
  setAvailabilityByDate: (value: Record<string, DayAvailability>) => void
  resetSearchResults: () => void
  resetAll: () => void
}

const STORAGE_KEY = 'casarural-v2-booking-flow'

const initialState: BookingFlowState = {
  property: null,
  units: [],
  checkIn: null,
  checkOut: null,
  guests: 2,
  suggestions: [],
  selectedCombination: null,
  rateType: 'FLEXIBLE',
  priceBreakdown: null,
  availabilityByDate: {},
}

const BookingFlowContext = createContext<BookingFlowContextValue | null>(null)

export function BookingFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingFlowState>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return initialState
      return { ...initialState, ...JSON.parse(raw) }
    } catch {
      return initialState
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore storage errors
    }
  }, [state])

  const setProperty = useCallback((value: PropertyRow | null) => {
    setState((prev) => ({ ...prev, property: value }))
  }, [])

  const setUnits = useCallback((value: UnitRow[]) => {
    setState((prev) => ({ ...prev, units: value }))
  }, [])

  const setCheckIn = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, checkIn: value }))
  }, [])

  const setCheckOut = useCallback((value: string | null) => {
    setState((prev) => ({ ...prev, checkOut: value }))
  }, [])

  const setGuests = useCallback((value: number) => {
    setState((prev) => ({ ...prev, guests: value }))
  }, [])

  const setSuggestions = useCallback((value: SuggestedCombination[]) => {
    setState((prev) => ({ ...prev, suggestions: value }))
  }, [])

  const setSelectedCombination = useCallback((value: SuggestedCombination | null) => {
    setState((prev) => ({ ...prev, selectedCombination: value }))
  }, [])

  const setRateType = useCallback((value: RateType) => {
    setState((prev) => ({ ...prev, rateType: value }))
  }, [])

  const setPriceBreakdown = useCallback((value: RemotePriceBreakdown | null) => {
    setState((prev) => ({ ...prev, priceBreakdown: value }))
  }, [])

  const setAvailabilityByDate = useCallback((value: Record<string, DayAvailability>) => {
    setState((prev) => ({ ...prev, availabilityByDate: value }))
  }, [])

  const resetSearchResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      suggestions: [],
      selectedCombination: null,
      priceBreakdown: null,
    }))
  }, [])

  const resetAll = useCallback(() => {
    setState(initialState)
  }, [])

  const value = useMemo<BookingFlowContextValue>(
    () => ({
      ...state,
      setProperty,
      setUnits,
      setCheckIn,
      setCheckOut,
      setGuests,
      setSuggestions,
      setSelectedCombination,
      setRateType,
      setPriceBreakdown,
      setAvailabilityByDate,
      resetSearchResults,
      resetAll,
    }),
    [
      state,
      setProperty,
      setUnits,
      setCheckIn,
      setCheckOut,
      setGuests,
      setSuggestions,
      setSelectedCombination,
      setRateType,
      setPriceBreakdown,
      setAvailabilityByDate,
      resetSearchResults,
      resetAll,
    ]
  )

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>
}

export function useBookingFlow() {
  const ctx = useContext(BookingFlowContext)
  if (!ctx) {
    throw new Error('useBookingFlow must be used inside BookingFlowProvider')
  }
  return ctx
}
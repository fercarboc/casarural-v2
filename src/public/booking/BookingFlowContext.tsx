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

// ─── Tipos que devuelve suggest-combinations ──────────────────────────────────

export type SuggestedUnit = {
  unidad_id: string           // era: id
  nombre: string
  slug: string
  capacidad_base: number
  capacidad_maxima: number
  extras_asignados: number
  num_huespedes_asignados: number
  // Campos opcionales que puede incluir la versión debug/detallada
  importe_alojamiento?: number
  importe_extras?: number
  importe_limpieza?: number
  es_especial?: boolean
  temporada_nombre?: string
}

export type SuggestedCombination = {
  unidades: SuggestedUnit[]

  // Capacidad
  suma_capacidades_base: number
  suma_capacidades_maximas: number
  extras_total: number
  exceso_capacidad: number

  // Importes
  importe_alojamiento: number
  importe_extras: number
  importe_limpieza: number
  importe_base: number
  descuento: number
  importe_neto: number
  importe_total: number       // era: precio_total
  importe_senal: number
  importe_resto: number

  // Métricas
  precio_por_persona: number          // era: precio_por_huesped
  precio_por_persona_noche: number
  num_unidades: number
  es_sin_extras: boolean
  es_capacidad_exacta: boolean
  noches: number
  min_noches_restriccion?: number
  warnings: string[]
}

// ─── Tipos que devuelve calculate-price ───────────────────────────────────────

export type PriceUnit = {
  unidad_id: string
  nombre: string
  capacidad_base: number
  capacidad_maxima: number
  num_huespedes_asignados: number
  extras_asignados: number
  precio_noche: number
  extra_huesped_noche: number
  tarifa_limpieza: number
  noches: number
  importe_alojamiento: number
  importe_extras: number
  importe_limpieza: number
  importe_subtotal: number
  es_especial: boolean
  temporada_nombre: string
  temporada_id: string | null
  min_noches: number
}

export type RemotePriceBreakdown = {
  property_id: string
  fecha_entrada: string
  fecha_salida: string
  noches: number
  num_huespedes: number
  tarifa: string

  suma_capacidades_base: number
  suma_capacidades_maximas: number
  extras_total: number

  unidades: PriceUnit[]

  importe_alojamiento_total: number   // era: importe_alojamiento
  importe_extras_total: number        // era: importe_extras
  importe_limpieza_total: number      // era: importe_limpieza
  importe_base: number
  descuento_aplicado: number
  importe_neto: number
  importe_total: number

  porcentaje_senal: number
  importe_senal: number
  importe_resto: number

  precio_por_persona: number
  precio_por_persona_noche: number

  warnings: string[]
}

export type DayAvailability = {
  blocked: number
  total: number
}

// ─── Estado del flujo ─────────────────────────────────────────────────────────

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
      // availabilityByDate no se persiste — siempre se recarga desde el servidor
      const { availabilityByDate: _ignored, ...toPersist } = state
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
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
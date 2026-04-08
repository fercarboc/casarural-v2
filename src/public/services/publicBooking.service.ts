export interface BookingContextUnit {
  id: string
  property_id: string
  nombre: string
  slug: string
  descripcion_corta: string | null
  capacidad_base: number | null
  capacidad_maxima: number | null
  activa: boolean
  orden: number | null
}

export interface BookingContextProperty {
  id: string
  nombre: string
  slug: string
  checkin_time: string | null
  checkout_time: string | null
  mascotas_permitidas: boolean | null
  suplemento_mascota: number | null
  fumar_permitido: boolean | null
  non_refundable_discount_pct: number | null
  flexible_deposit_pct: number | null
}

export interface BookingContextResponse {
  ok: boolean
  property?: BookingContextProperty
  units?: BookingContextUnit[]
  error?: string
}

export async function fetchPublicBookingContext(params: {
  slug?: string
  property_id?: string
  unidad_slug?: string
  unidad_id?: string
}): Promise<BookingContextResponse> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_booking_context`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(params),
    },
  )

  const data = (await res.json()) as BookingContextResponse

  if (!res.ok) {
    throw new Error(data.error || 'Error cargando contexto de reserva')
  }

  return data
}

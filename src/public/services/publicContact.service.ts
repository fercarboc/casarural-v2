export interface CreateContactPayload {
  nombre: string
  email: string
  telefono?: string | null
  asunto?: string
  mensaje: string
  property_id?: string | null
}

export interface CreateContactResponse {
  ok: boolean
  id?: string
  error?: string
}

export async function createPublicContact(
  payload: CreateContactPayload,
): Promise<CreateContactResponse> {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public_contact_create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    },
  )

  const data = (await res.json()) as CreateContactResponse

  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Error enviando consulta')
  }

  return data
}

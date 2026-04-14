// src/services/properties.service.ts
import { supabase } from '../integrations/supabase/client'

export interface PropertySummary {
  id:      string
  nombre:  string
  slug:    string
  activa:  boolean
  created_at: string
}

export async function listProperties(): Promise<PropertySummary[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('id, nombre, slug, activa, created_at')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createProperty(params: {
  nombre:         string
  slug:           string
  admin_email:    string
  admin_password: string
}): Promise<{ property: { id: string; nombre: string; slug: string }; user: { id: string; email: string } }> {
  const { data, error } = await supabase.functions.invoke('admin-create-property', {
    body: params,
  })

  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al crear la propiedad')
  return { property: data.property, user: data.user }
}

export async function togglePropertyActiva(id: string, activa: boolean): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({ activa })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

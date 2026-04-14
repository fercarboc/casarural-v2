// src/services/users.service.ts
import { supabase } from '../integrations/supabase/client'

export interface PropertyUser {
  id: string
  user_id: string
  property_id?: string
  email: string
  rol: string
  created_at: string
}

export async function createUser(params: {
  email: string
  password: string
  rol: string
}): Promise<{ id: string; email: string; rol: string }> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: params,
  })

  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al crear el usuario')
  return data.user
}

export async function listPropertyUsers(property_id: string): Promise<PropertyUser[]> {
  const { data, error } = await supabase.functions.invoke('admin-list-users', {
    body: { property_id },
  })

  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al listar usuarios')
  return data.users ?? []
}
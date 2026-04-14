// src/services/domains.service.ts
import { supabase } from '../integrations/supabase/client'

export interface CustomDomain {
  id:         string
  domain:     string
  verified:   boolean
  created_at: string
}

export async function listDomains(property_id: string): Promise<CustomDomain[]> {
  const { data, error } = await supabase.functions.invoke('admin-manage-domains', {
    body: { action: 'list', property_id },
  })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al listar dominios')
  return data.domains ?? []
}

export async function addDomain(property_id: string, domain: string): Promise<CustomDomain> {
  const { data, error } = await supabase.functions.invoke('admin-manage-domains', {
    body: { action: 'add', property_id, domain },
  })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al añadir dominio')
  return data.domain
}

export async function removeDomain(property_id: string, domain_id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-manage-domains', {
    body: { action: 'remove', property_id, domain_id },
  })
  if (error) throw new Error(error.message)
  if (!data?.ok) throw new Error(data?.error ?? 'Error al eliminar dominio')
}

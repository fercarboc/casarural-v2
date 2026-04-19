// src/modules/cleaning/services/cleaningResourceService.ts

import { supabase } from '../../../integrations/supabase/client'
import type { CleaningStaff, CleaningProvider, CleaningService } from '../types/cleaning.types'

export const cleaningResourceService = {
  // ── Staff ────────────────────────────────────────────────────────────────────

  async getStaff(propertyId: string, includeInactive = false): Promise<CleaningStaff[]> {
    let q = supabase
      .from('cleaning_staff')
      .select('*')
      .eq('property_id', propertyId)
      .order('name')
    if (!includeInactive) q = q.eq('active', true)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async createStaff(data: Omit<CleaningStaff, 'id' | 'created_at'>): Promise<CleaningStaff> {
    const { data: row, error } = await supabase
      .from('cleaning_staff')
      .insert(data)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  async updateStaff(id: string, data: Partial<CleaningStaff>): Promise<CleaningStaff> {
    const { data: row, error } = await supabase
      .from('cleaning_staff')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  async deactivateStaff(id: string): Promise<void> {
    const { error } = await supabase
      .from('cleaning_staff')
      .update({ active: false })
      .eq('id', id)
    if (error) throw error
  },

  // ── Providers ────────────────────────────────────────────────────────────────

  async getProviders(propertyId: string, includeInactive = false): Promise<CleaningProvider[]> {
    let q = supabase
      .from('cleaning_providers')
      .select('*')
      .eq('property_id', propertyId)
      .order('name')
    if (!includeInactive) q = q.eq('active', true)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },

  async createProvider(data: Omit<CleaningProvider, 'id' | 'created_at'>): Promise<CleaningProvider> {
    const { data: row, error } = await supabase
      .from('cleaning_providers')
      .insert(data)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  async updateProvider(id: string, data: Partial<CleaningProvider>): Promise<CleaningProvider> {
    const { data: row, error } = await supabase
      .from('cleaning_providers')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return row
  },

  async deactivateProvider(id: string): Promise<void> {
    const { error } = await supabase
      .from('cleaning_providers')
      .update({ active: false })
      .eq('id', id)
    if (error) throw error
  },

  // ── Services catalogue ────────────────────────────────────────────────────────

  async getServices(propertyId: string, mode?: CleaningService['mode']): Promise<CleaningService[]> {
    let q = supabase
      .from('cleaning_services')
      .select('*')
      .eq('property_id', propertyId)
      .eq('active', true)
      .order('name')
    if (mode && mode !== 'BOTH') {
      q = q.in('mode', [mode, 'BOTH'])
    }
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
}

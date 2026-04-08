import { supabase } from '../integrations/supabase/client'
import type {
  CustomerCommunication,
  CustomerCommunicationsFilters,
} from '../shared/types/customerCommunication.types'

export const customerCommunicationsService = {
  async listByCustomer(
    filters: CustomerCommunicationsFilters
  ): Promise<CustomerCommunication[]> {
    const { propertyId, customerEmail, limit = 100 } = filters

    const { data, error } = await supabase
      .from('customer_communications')
      .select(`
        id,
        property_id,
        related_consulta_id,
        type,
        status,
        subject,
        body_html,
        body_text,
        customer_email,
        customer_name,
        attachment_name,
        attachment_url,
        created_at,
        metadata
      `)
      .eq('property_id', propertyId)
      .eq('customer_email', customerEmail)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(error.message || 'No se pudieron cargar las comunicaciones')
    }

    return (data ?? []) as CustomerCommunication[]
  },
}
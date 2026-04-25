import { supabase } from '../integrations/supabase/client'

export type FormatoExport = 'XML' | 'CSV' | 'AMBOS'
export type EstadoExport  = 'GENERANDO' | 'COMPLETADO' | 'ERROR'

export interface InvoiceExport {
  id: string
  property_id: string
  fecha_desde: string
  fecha_hasta: string
  total_facturas: number
  total_importe: number
  formato: FormatoExport
  xml_url: string | null
  csv_url: string | null
  estado: EstadoExport
  error_msg: string | null
  created_at: string
}

export interface GenerateExportParams {
  propertyId: string
  fechaDesde: string
  fechaHasta: string
  formato: FormatoExport
}

export interface GenerateExportResult {
  export_id: string
  total_facturas: number
  total_importe: number
  xml_url: string | null
  csv_url: string | null
}

export const invoiceExportService = {
  async generateExport(params: GenerateExportParams): Promise<GenerateExportResult> {
    const { data, error } = await supabase.functions.invoke('generate-invoice-export', {
      body: {
        propertyId: params.propertyId,
        fechaDesde: params.fechaDesde,
        fechaHasta: params.fechaHasta,
        formato: params.formato,
      },
    })

    if (error) throw error
    if (data?.error) throw new Error(data.error)

    return data as GenerateExportResult
  },

  async getExports(propertyId: string): Promise<InvoiceExport[]> {
    const { data, error } = await supabase
      .from('invoice_exports')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as InvoiceExport[]
  },
}

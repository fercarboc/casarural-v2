import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  propertyId: string
  fechaDesde: string  // YYYY-MM-DD
  fechaHasta: string  // YYYY-MM-DD
  formato: 'XML' | 'CSV' | 'AMBOS'
}

interface FacturaRow {
  id: string
  numero_factura: string
  fecha_emision: string
  nombre_cliente: string
  nif_cliente: string | null
  base_imponible: number
  cuota_iva: number
  total: number
  hash_actual: string | null
  hash_anterior: string | null
  tipo_factura: string
  estado: string
  estado_aeat: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase    = createClient(supabaseUrl, serviceKey)

    const body: RequestBody = await req.json()
    const { propertyId, fechaDesde, fechaHasta, formato } = body

    if (!propertyId || !fechaDesde || !fechaHasta || !formato) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Obtener propiedad
    const { data: property } = await supabase
      .from('properties')
      .select('id, name, legal_business_name, legal_tax_id, address')
      .eq('id', propertyId)
      .single()

    // 2. Obtener facturas del rango
    const { data: facturas, error: fErr } = await supabase
      .from('facturas')
      .select(`
        id, numero_factura, fecha_emision, nombre_cliente, nif_cliente,
        base_imponible, cuota_iva, total, hash_actual, hash_anterior,
        tipo_factura, estado, estado_aeat
      `)
      .eq('property_id', propertyId)
      .gte('fecha_emision', fechaDesde)
      .lte('fecha_emision', fechaHasta)
      .not('estado', 'in', '(ANULADA)')
      .order('fecha_emision', { ascending: true })

    if (fErr) throw fErr

    const rows: FacturaRow[] = facturas ?? []
    const totalImporte = rows.reduce((s, f) => s + Number(f.total), 0)

    // 3. Crear registro en invoice_exports
    const { data: exportRecord, error: exportErr } = await supabase
      .from('invoice_exports')
      .insert({
        property_id:   propertyId,
        fecha_desde:   fechaDesde,
        fecha_hasta:   fechaHasta,
        total_facturas: rows.length,
        total_importe:  totalImporte,
        formato,
        estado: 'GENERANDO',
      })
      .select()
      .single()

    if (exportErr) throw exportErr
    const exportId = exportRecord.id

    // 4. Insertar items de trazabilidad
    if (rows.length > 0) {
      const items = rows.map(f => ({
        export_id:      exportId,
        factura_id:     f.id,
        numero_factura: f.numero_factura,
        fecha_emision:  f.fecha_emision,
        nombre_cliente: f.nombre_cliente,
        nif_cliente:    f.nif_cliente,
        base_imponible: Number(f.base_imponible),
        iva_importe:    Number(f.cuota_iva),
        total:          Number(f.total),
        hash_actual:    f.hash_actual,
      }))
      await supabase.from('invoice_export_items').insert(items)
    }

    const emisorNombre = property?.legal_business_name ?? property?.name ?? 'Casa Rural'
    const emisorNif    = property?.legal_tax_id ?? ''
    const now          = new Date().toISOString()

    let xmlUrl: string | null = null
    let csvUrl: string | null = null

    // 5. Generar XML
    if (formato === 'XML' || formato === 'AMBOS') {
      const xml = buildXml(emisorNombre, emisorNif, fechaDesde, fechaHasta, now, rows)
      const xmlPath = `${propertyId}/${exportId}.xml`
      const { error: xmlErr } = await supabase.storage
        .from('fiscal-exports')
        .upload(xmlPath, new Blob([xml], { type: 'application/xml' }), { upsert: true })
      if (!xmlErr) {
        const { data: pub } = supabase.storage.from('fiscal-exports').getPublicUrl(xmlPath)
        xmlUrl = pub.publicUrl
      }
    }

    // 6. Generar CSV
    if (formato === 'CSV' || formato === 'AMBOS') {
      const csv = buildCsv(rows)
      const csvPath = `${propertyId}/${exportId}.csv`
      const { error: csvErr } = await supabase.storage
        .from('fiscal-exports')
        .upload(csvPath, new Blob([csv], { type: 'text/csv' }), { upsert: true })
      if (!csvErr) {
        const { data: pub } = supabase.storage.from('fiscal-exports').getPublicUrl(csvPath)
        csvUrl = pub.publicUrl
      }
    }

    // 7. Actualizar registro como COMPLETADO
    await supabase
      .from('invoice_exports')
      .update({ estado: 'COMPLETADO', xml_url: xmlUrl, csv_url: csvUrl })
      .eq('id', exportId)

    return new Response(
      JSON.stringify({
        export_id:     exportId,
        total_facturas: rows.length,
        total_importe:  totalImporte,
        xml_url:        xmlUrl,
        csv_url:        csvUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Generadores de contenido ──────────────────────────────────────────────────

function buildXml(
  emisorNombre: string,
  emisorNif: string,
  desde: string,
  hasta: string,
  generadoEn: string,
  facturas: FacturaRow[]
): string {
  const esc = (s: string | null | undefined) =>
    (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const totalBase = facturas.reduce((s, f) => s + Number(f.base_imponible), 0)
  const totalIva  = facturas.reduce((s, f) => s + Number(f.cuota_iva), 0)
  const totalImp  = facturas.reduce((s, f) => s + Number(f.total), 0)

  const lineas = facturas.map(f => `
    <Factura>
      <NumeroFactura>${esc(f.numero_factura)}</NumeroFactura>
      <FechaEmision>${esc(f.fecha_emision)}</FechaEmision>
      <TipoFactura>${esc(f.tipo_factura)}</TipoFactura>
      <NombreCliente>${esc(f.nombre_cliente)}</NombreCliente>
      <NifCliente>${esc(f.nif_cliente)}</NifCliente>
      <BaseImponible>${Number(f.base_imponible).toFixed(2)}</BaseImponible>
      <CuotaIVA>${Number(f.cuota_iva).toFixed(2)}</CuotaIVA>
      <Total>${Number(f.total).toFixed(2)}</Total>
      <EstadoAEAT>${esc(f.estado_aeat)}</EstadoAEAT>
      <HashActual>${esc(f.hash_actual)}</HashActual>
    </Factura>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Exportación fiscal VeriFactu — generada ${generadoEn} -->
<!-- PENDIENTE: integración directa AEAT — no enviar este fichero sin certificado digital -->
<ExportacionFiscal xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Cabecera>
    <Version>1.0</Version>
    <Emisor>
      <Nombre>${esc(emisorNombre)}</Nombre>
      <NIF>${esc(emisorNif)}</NIF>
    </Emisor>
    <PeriodoDesde>${esc(desde)}</PeriodoDesde>
    <PeriodoHasta>${esc(hasta)}</PeriodoHasta>
    <FechaGeneracion>${generadoEn}</FechaGeneracion>
    <TotalFacturas>${facturas.length}</TotalFacturas>
    <TotalBaseImponible>${totalBase.toFixed(2)}</TotalBaseImponible>
    <TotalCuotaIVA>${totalIva.toFixed(2)}</TotalCuotaIVA>
    <TotalImporte>${totalImp.toFixed(2)}</TotalImporte>
  </Cabecera>
  <Facturas>${lineas}
  </Facturas>
</ExportacionFiscal>`
}

function buildCsv(facturas: FacturaRow[]): string {
  const header = [
    'Numero', 'Fecha', 'Tipo', 'Cliente', 'NIF',
    'Base', 'IVA', 'Total', 'Estado', 'Hash'
  ].join(';')

  const csv = (s: string | null | undefined) => {
    const v = String(s ?? '')
    return v.includes(';') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v
  }

  const rows = facturas.map(f =>
    [
      csv(f.numero_factura),
      csv(f.fecha_emision),
      csv(f.tipo_factura),
      csv(f.nombre_cliente),
      csv(f.nif_cliente),
      Number(f.base_imponible).toFixed(2).replace('.', ','),
      Number(f.cuota_iva).toFixed(2).replace('.', ','),
      Number(f.total).toFixed(2).replace('.', ','),
      csv(f.estado_aeat),
      csv(f.hash_actual),
    ].join(';')
  )

  return [header, ...rows].join('\r\n')
}

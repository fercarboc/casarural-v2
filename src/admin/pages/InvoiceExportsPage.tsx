import React, { useState, useEffect } from 'react'
import {
  FileDown, Download, Loader2, CheckCircle2, XCircle,
  Clock, FileSpreadsheet, FileCode2, AlertTriangle,
} from 'lucide-react'
import { useAdminTenant } from '../context/AdminTenantContext'
import { supabase } from '../../integrations/supabase/client'
import {
  invoiceExportService,
  type InvoiceExport,
  type FormatoExport,
} from '../../services/invoiceExport.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function firstOfYear() {
  return `${new Date().getFullYear()}-01-01`
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: InvoiceExport['estado'] }) {
  if (estado === 'COMPLETADO') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
      <CheckCircle2 size={11} /> Completado
    </span>
  )
  if (estado === 'ERROR') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
      <XCircle size={11} /> Error
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">
      <Clock size={11} /> Generando…
    </span>
  )
}

function FormatoBadge({ formato }: { formato: FormatoExport }) {
  const map: Record<FormatoExport, string> = { XML: 'XML', CSV: 'CSV', AMBOS: 'XML + CSV' }
  return (
    <span className="rounded-md bg-brand-600/10 px-2 py-0.5 text-[11px] font-medium text-brand-400">
      {map[formato]}
    </span>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function InvoiceExportsPage() {
  const { property_id: propertyId } = useAdminTenant()

  const [exports, setExports]     = useState<InvoiceExport[]>([])
  const [loading, setLoading]     = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const [fechaDesde, setFechaDesde] = useState(firstOfYear())
  const [fechaHasta, setFechaHasta] = useState(today())
  const [formato, setFormato]       = useState<FormatoExport>('AMBOS')

  async function loadExports() {
    if (!propertyId) return
    try {
      const data = await invoiceExportService.getExports(propertyId)
      setExports(data)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar exportaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadExports() }, [propertyId])

  async function handleGenerate(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!propertyId) return
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const result = await invoiceExportService.generateExport({
        propertyId, fechaDesde, fechaHasta, formato,
      })
      setSuccess(
        `Exportación generada: ${result.total_facturas} factura${result.total_facturas !== 1 ? 's' : ''} · ${fmtEur(result.total_importe)}`
      )
      await loadExports()
    } catch (e: any) {
      setError(e.message ?? 'Error al generar la exportación')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/15">
          <FileDown size={20} className="text-brand-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Exportaciones fiscales</h1>
          <p className="text-sm text-slate-500">Genera ficheros XML y CSV de facturas para trazabilidad AEAT / VeriFactu</p>
        </div>
      </div>

      {/* Aviso AEAT */}
      <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-300/80 leading-relaxed">
          <strong className="text-amber-300">Uso local únicamente.</strong> Los ficheros generados sirven como archivo de trazabilidad VeriFactu.
          El envío directo a la AEAT requiere certificado digital y está pendiente de implementación.
        </p>
      </div>

      {/* Formulario de generación */}
      <div className="rounded-2xl border border-sidebar-border bg-admin-card p-6">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Nueva exportación
        </h2>
        <form onSubmit={handleGenerate} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              required
              className="w-full rounded-xl border border-sidebar-border bg-sidebar-bg px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              required
              className="w-full rounded-xl border border-sidebar-border bg-sidebar-bg px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Formato</label>
            <select
              value={formato}
              onChange={e => setFormato(e.target.value as FormatoExport)}
              className="w-full rounded-xl border border-sidebar-border bg-sidebar-bg px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
            >
              <option value="AMBOS">XML + CSV</option>
              <option value="XML">Sólo XML</option>
              <option value="CSV">Sólo CSV</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-50"
            >
              {generating
                ? <><Loader2 size={14} className="animate-spin" /> Generando…</>
                : <><FileDown size={14} /> Generar</>}
            </button>
          </div>
        </form>

        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <XCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="rounded-2xl border border-sidebar-border bg-admin-card">
        <div className="border-b border-sidebar-border px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            Historial de exportaciones
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : exports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <FileDown size={28} className="text-slate-600" />
            <p className="text-sm text-slate-500">Aún no hay exportaciones. Genera la primera arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            {exports.map(ex => (
              <ExportRow key={ex.id} ex={ex} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ExportRow({ ex }: { ex: InvoiceExport }) {
  const [downloading, setDownloading] = useState<'xml' | 'csv' | null>(null)

  async function handleDownload(path: string, type: 'xml' | 'csv') {
    setDownloading(type)
    try {
      const { data, error } = await supabase.storage
        .from('fiscal-exports')
        .createSignedUrl(path, 3600)
      if (error) throw error
      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = path.split('/').pop() ?? `export.${type}`
      a.click()
    } catch (e: any) {
      alert(`Error al descargar: ${e.message}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-200">
            {fmtDate(ex.fecha_desde)} — {fmtDate(ex.fecha_hasta)}
          </span>
          <FormatoBadge formato={ex.formato} />
          <EstadoBadge estado={ex.estado} />
        </div>
        <p className="text-xs text-slate-500">
          {ex.total_facturas} factura{ex.total_facturas !== 1 ? 's' : ''} · {fmtEur(ex.total_importe)}
          {' · '}
          {new Date(ex.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
        {ex.error_msg && (
          <p className="text-xs text-red-400">{ex.error_msg}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {ex.xml_url && (
          <button
            onClick={() => handleDownload(ex.xml_url!, 'xml')}
            disabled={downloading === 'xml'}
            className="flex items-center gap-1.5 rounded-xl border border-sidebar-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-sidebar-hover disabled:opacity-50"
          >
            {downloading === 'xml'
              ? <Loader2 size={13} className="animate-spin" />
              : <FileCode2 size={13} />}
            XML
            <Download size={11} className="text-slate-500" />
          </button>
        )}
        {ex.csv_url && (
          <button
            onClick={() => handleDownload(ex.csv_url!, 'csv')}
            disabled={downloading === 'csv'}
            className="flex items-center gap-1.5 rounded-xl border border-sidebar-border px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-sidebar-hover disabled:opacity-50"
          >
            {downloading === 'csv'
              ? <Loader2 size={13} className="animate-spin" />
              : <FileSpreadsheet size={13} />}
            CSV
            <Download size={11} className="text-slate-500" />
          </button>
        )}
      </div>
    </div>
  )
}

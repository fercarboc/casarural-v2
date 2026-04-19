// src/admin/pages/RentalDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  User,
  FileText,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Power,
  Upload,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAdminTenant } from '../context/AdminTenantContext'
import {
  rentalService,
  type Rental,
  type RentalEstado,
  type RentalDocument,
  type RentalIncident,
  type RentalRenewal,
  RENTAL_ESTADO_LABEL,
  RENTAL_ESTADO_CLS,
  RENTAL_NEXT_STATES,
} from '../../services/rental.service'
import { cleaningScheduleService } from '../../modules/cleaning/services/cleaningScheduleService'
import type { CleaningSchedule } from '../../modules/cleaning/types/cleaning.types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

type Tab = 'resumen' | 'inquilino' | 'documentos' | 'incidencias' | 'renovaciones' | 'limpieza'

const FREQ_LABEL: Record<CleaningSchedule['frequency'], string> = {
  WEEKLY:   'Semanal',
  BIWEEKLY: 'Quincenal',
  MONTHLY:  'Mensual',
}

const DAY_LABEL: Record<string, string> = {
  MON: 'Lun', TUE: 'Mar', WED: 'Mié', THU: 'Jue',
  FRI: 'Vie', SAT: 'Sáb', SUN: 'Dom',
}

const DOC_TIPO_LABEL: Record<string, string> = {
  DNI: 'DNI / NIE / Pasaporte',
  NOMINA: 'Nómina',
  CONTRATO_LABORAL: 'Contrato laboral',
  DECLARACION_RENTA: 'Declaración de la renta',
  VIDA_LABORAL: 'Vida laboral',
  JUSTIFICANTE_BANCO: 'Justificante bancario',
  MATRICULA: 'Matrícula universitaria',
  AVALISTA: 'Avalista',
  REFERENCIA_ANTERIOR: 'Referencia de arrendador',
  OTRO: 'Otro',
}

const DOC_ESTADO_CLS: Record<string, string> = {
  PENDIENTE:  'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  VALIDADO:   'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  RECHAZADO:  'bg-red-500/10 text-red-300 border border-red-500/20',
}

const inputCls = 'w-full rounded-lg border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-400 focus:outline-none'

// ── Componente principal ───────────────────────────────────────────────────────

export const RentalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { property_id } = useAdminTenant()

  const [rental, setRental] = useState<Rental | null>(null)
  const [docs, setDocs] = useState<RentalDocument[]>([])
  const [incidents, setIncidents] = useState<RentalIncident[]>([])
  const [renewals, setRenewals] = useState<RentalRenewal[]>([])
  const [schedules, setSchedules] = useState<CleaningSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('resumen')

  // Estado change
  const [changingEstado, setChangingEstado] = useState(false)
  const [notasEstado, setNotasEstado] = useState('')

  // New incident
  const [newIncident, setNewIncident] = useState({ titulo: '', descripcion: '' })
  const [savingIncident, setSavingIncident] = useState(false)

  // New renewal
  const [newRenewal, setNewRenewal] = useState({ fecha_inicio: '', fecha_fin: '', duracion_meses: '', nuevo_precio: '', notas: '' })
  const [savingRenewal, setSavingRenewal] = useState(false)

  // Document upload
  const [uploadDocType, setUploadDocType] = useState('DNI')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // New cleaning schedule
  const [newSchedule, setNewSchedule] = useState({
    frequency: 'WEEKLY' as CleaningSchedule['frequency'],
    start_date: '',
    end_date: '',
    days_of_week: [] as string[],
    preferred_time: '',
    billable: false,
    price: '',
  })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const [r, d, i, ren, sch] = await Promise.all([
        rentalService.getRentalById(id),
        rentalService.getDocuments(id),
        rentalService.getIncidents(id),
        rentalService.getRenewals(id),
        cleaningScheduleService.getSchedules(property_id, { rental_id: id }),
      ])
      setRental(r)
      setDocs(d)
      setIncidents(i)
      setRenewals(ren)
      setSchedules(sch)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar el contrato')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleChangeEstado(newEstado: RentalEstado) {
    if (!rental) return
    setChangingEstado(true)
    try {
      const updated = await rentalService.changeEstado(rental.id, rental.estado, newEstado, notasEstado || undefined)
      setRental(updated)
      setNotasEstado('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setChangingEstado(false)
    }
  }

  async function handleValidateDoc(doc: RentalDocument, estado: 'VALIDADO' | 'RECHAZADO') {
    try {
      const updated = await rentalService.validateDocument(doc.id, estado)
      setDocs(prev => prev.map(d => d.id === updated.id ? updated : d))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm('¿Eliminar este documento?')) return
    try {
      await rentalService.deleteDocument(docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleCreateIncident() {
    if (!rental || !newIncident.titulo.trim()) return
    setSavingIncident(true)
    try {
      const created = await rentalService.createIncident({
        property_id,
        rental_id: rental.id,
        titulo: newIncident.titulo.trim(),
        descripcion: newIncident.descripcion.trim() || null,
        estado: 'ABIERTA',
      })
      setIncidents(prev => [created, ...prev])
      setNewIncident({ titulo: '', descripcion: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingIncident(false)
    }
  }

  async function handleCreateRenewal() {
    if (!rental || !newRenewal.fecha_inicio) return
    setSavingRenewal(true)
    try {
      const created = await rentalService.createRenewal({
        property_id,
        rental_id: rental.id,
        fecha_inicio: newRenewal.fecha_inicio,
        fecha_fin: newRenewal.fecha_fin || null,
        duracion_meses: newRenewal.duracion_meses ? parseInt(newRenewal.duracion_meses) : null,
        nuevo_precio: newRenewal.nuevo_precio ? parseFloat(newRenewal.nuevo_precio) : null,
        notas: newRenewal.notas.trim() || null,
      })
      setRenewals(prev => [created, ...prev])
      setNewRenewal({ fecha_inicio: '', fecha_fin: '', duracion_meses: '', nuevo_precio: '', notas: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingRenewal(false)
    }
  }

  async function handleUploadDoc() {
    if (!rental || !uploadFile) return
    setUploading(true)
    try {
      const { data: { session } } = await (await import('../../integrations/supabase/client')).supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('rental_id', rental.id)
      fd.append('document_type', uploadDocType)
      fd.append('property_id', property_id)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-rental-document`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd },
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al subir')
      setDocs(prev => [json.document, ...prev])
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleCreateSchedule() {
    if (!rental || !newSchedule.start_date) return
    setSavingSchedule(true)
    try {
      const created = await cleaningScheduleService.createSchedule({
        property_id,
        unit_id: rental.unidad_id,
        rental_id: rental.id,
        frequency: newSchedule.frequency,
        start_date: newSchedule.start_date,
        end_date: newSchedule.end_date || null,
        days_of_week: newSchedule.days_of_week.length > 0 ? newSchedule.days_of_week : null,
        preferred_time: newSchedule.preferred_time || null,
        billable: newSchedule.billable,
        price: newSchedule.price ? parseFloat(newSchedule.price) : null,
      })
      setSchedules(prev => [created, ...prev])
      setNewSchedule({ frequency: 'WEEKLY', start_date: '', end_date: '', days_of_week: [], preferred_time: '', billable: false, price: '' })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleToggleSchedule(s: CleaningSchedule) {
    try {
      await cleaningScheduleService.toggleSchedule(s.id, !s.active)
      setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, active: !s.active } : x))
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm('¿Eliminar este horario de limpieza?')) return
    try {
      await cleaningScheduleService.deleteSchedule(id)
      setSchedules(prev => prev.filter(x => x.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-sidebar-border bg-sidebar-bg">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    )
  }

  if (!rental) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-sidebar-border bg-sidebar-bg text-slate-500">
        <AlertCircle size={24} />
        <p className="text-sm">Contrato no encontrado</p>
        <Link to="/admin/rentals" className="text-xs text-brand-400 hover:text-brand-300">← Volver a contratos</Link>
      </div>
    )
  }

  const nextStates = RENTAL_NEXT_STATES[rental.estado]

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <Link to="/admin/rentals" className="flex items-center gap-1 hover:text-slate-300">
                <ArrowLeft size={12} /> Contratos
              </Link>
              <ChevronRight size={10} />
              <span className="text-slate-300">{rental.cliente_nombre}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{rental.cliente_nombre}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {rental.unidad_nombre ?? '—'} · {fmtDate(rental.fecha_inicio)} — {fmtDate(rental.fecha_fin)}
              {rental.numero_contrato && <span className="ml-2 text-slate-500">· {rental.numero_contrato}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${RENTAL_ESTADO_CLS[rental.estado]}`}>
              {RENTAL_ESTADO_LABEL[rental.estado]}
            </span>
            <button onClick={load} className="rounded-xl border border-sidebar-border bg-admin-card p-2 text-slate-400 hover:bg-sidebar-hover">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-sidebar-border bg-sidebar-bg p-1.5">
        {([
          { id: 'resumen' as Tab,      icon: <FileText size={13} />,     label: 'Resumen' },
          { id: 'inquilino' as Tab,    icon: <User size={13} />,          label: 'Inquilino' },
          { id: 'documentos' as Tab,   icon: <FileText size={13} />,      label: `Documentos${docs.length > 0 ? ` (${docs.length})` : ''}` },
          { id: 'incidencias' as Tab,  icon: <AlertTriangle size={13} />, label: `Incidencias${incidents.length > 0 ? ` (${incidents.length})` : ''}` },
          { id: 'renovaciones' as Tab, icon: <RefreshCw size={13} />,     label: 'Renovaciones' },
          { id: 'limpieza' as Tab,     icon: <Sparkles size={13} />,      label: `Limpieza${schedules.length > 0 ? ` (${schedules.length})` : ''}` },
        ] as { id: Tab; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'resumen' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            {/* Datos contrato */}
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Datos del contrato</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { l: 'Unidad',         v: rental.unidad_nombre ?? '—' },
                  { l: 'Precio mensual', v: fmtEur(rental.precio_mensual) },
                  { l: 'Fianza',         v: rental.fianza > 0 ? `${fmtEur(rental.fianza)} · ${rental.fianza_cobrada ? 'Cobrada' : 'Pendiente'}` : '—' },
                  { l: 'Forma de pago',  v: rental.forma_pago },
                  { l: 'Inicio',         v: fmtDate(rental.fecha_inicio) },
                  { l: 'Fin previsto',   v: fmtDate(rental.fecha_fin) },
                  { l: 'Duración',       v: rental.duracion_meses ? `${rental.duracion_meses} meses` : '—' },
                  { l: 'Ocupantes',      v: String(rental.num_ocupantes) },
                  { l: 'Gastos incluidos',  v: rental.incluye_gastos ? 'Sí' : 'No' },
                  { l: 'Limpieza incluida', v: rental.incluye_limpieza ? 'Sí' : 'No' },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="text-xs text-slate-500">{l}</p>
                    <p className="font-medium text-slate-200">{v}</p>
                  </div>
                ))}
              </div>
              {rental.notas_solicitud && (
                <div className="mt-4 rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                  <p className="text-xs text-slate-500">Notas de la solicitud</p>
                  <p className="mt-1 text-sm text-slate-300">{rental.notas_solicitud}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cambio de estado */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
              <h3 className="mb-4 text-sm font-semibold text-white">Cambiar estado</h3>
              <p className="mb-3 text-xs text-slate-500">Estado actual</p>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${RENTAL_ESTADO_CLS[rental.estado]}`}>
                {RENTAL_ESTADO_LABEL[rental.estado]}
              </span>

              {nextStates.length > 0 && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={notasEstado}
                    onChange={e => setNotasEstado(e.target.value)}
                    placeholder="Notas del cambio (opcional)…"
                    rows={2}
                    className={`${inputCls} resize-none text-xs`}
                  />
                  <div className="space-y-2">
                    {nextStates.map(s => (
                      <button
                        key={s}
                        onClick={() => handleChangeEstado(s)}
                        disabled={changingEstado}
                        className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-40 ${
                          s === 'CANCELADO'
                            ? 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                            : s === 'ACTIVO' || s === 'APROBADO'
                            ? 'bg-brand-600 text-white hover:bg-brand-700'
                            : 'border border-sidebar-border bg-admin-card text-slate-300 hover:bg-sidebar-hover'
                        }`}
                      >
                        {changingEstado ? <Loader2 size={12} className="mx-auto animate-spin" /> : `→ ${RENTAL_ESTADO_LABEL[s]}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'inquilino' && (
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-6">
          <h3 className="mb-5 text-sm font-semibold text-white">Datos del inquilino</h3>
          <div className="grid grid-cols-2 gap-5 text-sm md:grid-cols-3">
            {[
              { l: 'Nombre completo',  v: rental.cliente_nombre },
              { l: 'Email',           v: rental.cliente_email },
              { l: 'Teléfono',        v: rental.cliente_telefono ?? '—' },
              { l: 'DNI / NIE',       v: rental.cliente_dni ?? '—' },
              { l: 'Ocupantes',       v: String(rental.num_ocupantes) },
            ].map(({ l, v }) => (
              <div key={l} className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <p className="text-xs text-slate-500">{l}</p>
                <p className="mt-0.5 font-medium text-slate-100">{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'documentos' && (
        <div className="space-y-4">
        {/* Upload panel */}
        <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Subir documento</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Tipo de documento</label>
              <select
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                className={inputCls}
              >
                {Object.entries(DOC_TIPO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="mb-1 block text-xs text-slate-400">Archivo (PDF, imagen)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </div>
            <button
              onClick={handleUploadDoc}
              disabled={uploading || !uploadFile}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Subir
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg">
          <div className="border-b border-sidebar-border px-5 py-4">
            <h3 className="text-sm font-semibold text-white">Documentación del inquilino</h3>
          </div>
          {docs.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
              <FileText size={22} />
              <p className="text-xs">No hay documentos subidos todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-sidebar-border">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 text-sm">{DOC_TIPO_LABEL[doc.document_type] ?? doc.document_type}</p>
                    <p className="text-xs text-slate-500 truncate">{doc.file_name}</p>
                    {doc.notas_admin && <p className="text-xs text-slate-500 mt-0.5">Nota: {doc.notas_admin}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${DOC_ESTADO_CLS[doc.estado]}`}>
                    {doc.estado}
                  </span>
                  {doc.estado === 'PENDIENTE' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleValidateDoc(doc, 'VALIDADO')}
                        className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 hover:bg-emerald-500/30"
                        title="Validar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => handleValidateDoc(doc, 'RECHAZADO')}
                        className="rounded-lg bg-red-500/20 p-1.5 text-red-300 hover:bg-red-500/30"
                        title="Rechazar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                  <button onClick={() => handleDeleteDoc(doc.id)} className="rounded-lg p-1.5 text-slate-600 hover:bg-sidebar-hover hover:text-red-400">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}

      {tab === 'incidencias' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Nueva incidencia</h3>
            <div className="space-y-3">
              <input
                value={newIncident.titulo}
                onChange={e => setNewIncident(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Título de la incidencia *"
                className={inputCls}
              />
              <textarea
                value={newIncident.descripcion}
                onChange={e => setNewIncident(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción (opcional)…"
                rows={2}
                className={`${inputCls} resize-none`}
              />
              <button
                onClick={handleCreateIncident}
                disabled={savingIncident || !newIncident.titulo.trim()}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {savingIncident ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Registrar incidencia
              </button>
            </div>
          </div>

          {incidents.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="divide-y divide-sidebar-border">
                {incidents.map(inc => (
                  <div key={inc.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200 text-sm">{inc.titulo}</p>
                      {inc.descripcion && <p className="mt-0.5 text-xs text-slate-500">{inc.descripcion}</p>}
                      <p className="mt-1 text-[10px] text-slate-600">{fmtDate(inc.created_at)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      inc.estado === 'ABIERTA' ? 'bg-red-500/10 text-red-300 border border-red-500/20' :
                      inc.estado === 'EN_GESTION' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    }`}>
                      {inc.estado === 'ABIERTA' ? 'Abierta' : inc.estado === 'EN_GESTION' ? 'En gestión' : 'Cerrada'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'renovaciones' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Registrar renovación</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nueva fecha inicio *</label>
                <input type="date" value={newRenewal.fecha_inicio} onChange={e => setNewRenewal(p => ({ ...p, fecha_inicio: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nueva fecha fin</label>
                <input type="date" value={newRenewal.fecha_fin} onChange={e => setNewRenewal(p => ({ ...p, fecha_fin: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Duración (meses)</label>
                <input type="number" min={1} value={newRenewal.duracion_meses} onChange={e => setNewRenewal(p => ({ ...p, duracion_meses: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nuevo precio/mes (€)</label>
                <input type="number" min={0} step="0.01" value={newRenewal.nuevo_precio} onChange={e => setNewRenewal(p => ({ ...p, nuevo_precio: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="mt-3">
              <textarea value={newRenewal.notas} onChange={e => setNewRenewal(p => ({ ...p, notas: e.target.value }))} placeholder="Notas…" rows={2} className={`${inputCls} mt-1 resize-none`} />
            </div>
            <button
              onClick={handleCreateRenewal}
              disabled={savingRenewal || !newRenewal.fecha_inicio}
              className="mt-3 flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {savingRenewal ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Registrar renovación
            </button>
          </div>

          {renewals.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="divide-y divide-sidebar-border">
                {renewals.map(r => (
                  <div key={r.id} className="flex items-center gap-4 px-5 py-4 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-slate-200">{fmtDate(r.fecha_inicio)} — {fmtDate(r.fecha_fin)}</p>
                      {r.duracion_meses && <p className="text-xs text-slate-500">{r.duracion_meses} meses</p>}
                    </div>
                    {r.nuevo_precio && <p className="font-semibold text-white">{fmtEur(r.nuevo_precio)}/mes</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'limpieza' && (
        <div className="space-y-4">
          {/* Create schedule form */}
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Nuevo horario de limpieza</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Frecuencia</label>
                <select
                  value={newSchedule.frequency}
                  onChange={e => setNewSchedule(p => ({ ...p, frequency: e.target.value as any }))}
                  className={inputCls}
                >
                  {Object.entries(FREQ_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fecha inicio *</label>
                <input type="date" value={newSchedule.start_date} onChange={e => setNewSchedule(p => ({ ...p, start_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fecha fin</label>
                <input type="date" value={newSchedule.end_date} onChange={e => setNewSchedule(p => ({ ...p, end_date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Hora preferida</label>
                <input type="time" value={newSchedule.preferred_time} onChange={e => setNewSchedule(p => ({ ...p, preferred_time: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Precio (€)</label>
                <input type="number" min={0} step="0.01" value={newSchedule.price} onChange={e => setNewSchedule(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className={inputCls} />
              </div>
            </div>

            {/* Days of week (for WEEKLY/BIWEEKLY) */}
            {(newSchedule.frequency === 'WEEKLY' || newSchedule.frequency === 'BIWEEKLY') && (
              <div className="mt-3">
                <label className="mb-2 block text-xs text-slate-400">Días de la semana</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(DAY_LABEL).map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setNewSchedule(p => ({
                        ...p,
                        days_of_week: p.days_of_week.includes(v)
                          ? p.days_of_week.filter(d => d !== v)
                          : [...p.days_of_week, v],
                      }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        newSchedule.days_of_week.includes(v)
                          ? 'bg-brand-600 text-white'
                          : 'border border-sidebar-border bg-admin-card text-slate-400 hover:bg-sidebar-hover'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={newSchedule.billable}
                  onChange={e => setNewSchedule(p => ({ ...p, billable: e.target.checked }))}
                  className="accent-brand-500"
                />
                Facturable al inquilino
              </label>
              <button
                onClick={handleCreateSchedule}
                disabled={savingSchedule || !newSchedule.start_date}
                className="ml-auto flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {savingSchedule ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Crear horario
              </button>
            </div>
          </div>

          {/* Schedules list */}
          {schedules.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-sidebar-border bg-sidebar-bg text-slate-500">
              <Sparkles size={20} />
              <p className="text-xs">No hay horarios de limpieza configurados</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
              <div className="divide-y divide-sidebar-border">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                      <Sparkles size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">
                        {FREQ_LABEL[s.frequency]}
                        {s.days_of_week?.length ? ` · ${s.days_of_week.map(d => DAY_LABEL[d] ?? d).join(', ')}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        Desde {fmtDate(s.start_date)}{s.end_date ? ` hasta ${fmtDate(s.end_date)}` : ''}
                        {s.preferred_time ? ` · ${s.preferred_time}` : ''}
                        {s.price ? ` · ${s.price} €` : ''}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      s.active
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {s.active ? 'Activo' : 'Pausado'}
                    </span>
                    <button
                      onClick={() => handleToggleSchedule(s)}
                      title={s.active ? 'Pausar' : 'Activar'}
                      className={`rounded-lg p-1.5 transition-colors ${s.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                    >
                      <Power size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(s.id)}
                      className="rounded-lg p-1.5 text-slate-600 hover:bg-sidebar-hover hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

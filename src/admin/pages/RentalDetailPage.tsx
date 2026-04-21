// src/admin/pages/RentalDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronRight,
  User,
  FileText,
  AlertTriangle,
  RefreshCw,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Power,
  Upload,
  MessageSquare,
  Send,
  PaperclipIcon,
  Mail,
  MessageCircle,
  StickyNote,
  PawPrint,
  Briefcase,
  MapPin,
  Eye,
  Pencil,
  CalendarRange,
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
  type RentalMessage,
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

type Tab = 'resumen' | 'inquilino' | 'documentos' | 'incidencias' | 'renovaciones' | 'limpieza' | 'comunicaciones'

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
  const { property_id } = useAdminTenant()

  const [rental, setRental] = useState<Rental | null>(null)
  const [docs, setDocs] = useState<RentalDocument[]>([])
  const [incidents, setIncidents] = useState<RentalIncident[]>([])
  const [renewals, setRenewals] = useState<RentalRenewal[]>([])
  const [schedules, setSchedules] = useState<CleaningSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('resumen')

  // Mensajes / comunicaciones
  const [messages, setMessages] = useState<RentalMessage[]>([])

  // Estado change (ahora vía EF)
  const [changingEstado, setChangingEstado] = useState(false)
  const [notasEstado, setNotasEstado] = useState('')
  const [msgEstado, setMsgEstado] = useState('')

  // Modal: enviar mensaje libre
  const [showMsgModal, setShowMsgModal] = useState(false)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgBody, setMsgBody] = useState('')
  const [msgWhatsapp, setMsgWhatsapp] = useState(false)
  const [sendingMsg, setSendingMsg] = useState(false)

  // Modal: solicitar documentación
  const [showDocsModal, setShowDocsModal] = useState(false)
  const [docsSelected, setDocsSelected] = useState<string[]>([])
  const [docsNote, setDocsNote] = useState('')
  const [sendingDocs, setSendingDocs] = useState(false)

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

  const [syncingCalendar, setSyncingCalendar] = useState(false)

  // Edit modals
  const [showEditContrato, setShowEditContrato] = useState(false)
  const [editContrato, setEditContrato] = useState<Partial<Rental>>({})
  const [savingContrato, setSavingContrato] = useState(false)

  const [showEditContacto, setShowEditContacto] = useState(false)
  const [editContacto, setEditContacto] = useState<Partial<Rental>>({})
  const [savingContacto, setSavingContacto] = useState(false)

  const [showEditPerfil, setShowEditPerfil] = useState(false)
  const [editPerfil, setEditPerfil] = useState<Partial<Rental>>({})
  const [savingPerfil, setSavingPerfil] = useState(false)

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
      const [r, d, i, ren, sch, msgs] = await Promise.all([
        rentalService.getRentalById(id),
        rentalService.getDocuments(id),
        rentalService.getIncidents(id),
        rentalService.getRenewals(id),
        cleaningScheduleService.getSchedules(property_id, { rental_id: id }),
        rentalService.getMessages(id),
      ])
      setRental(r)
      setDocs(d)
      setIncidents(i)
      setRenewals(ren)
      setSchedules(sch)
      setMessages(msgs)
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
      await rentalService.changeEstadoViaEF(rental.id, newEstado, notasEstado || undefined, msgEstado || undefined)
      setRental(prev => prev ? { ...prev, estado: newEstado, notas: notasEstado || prev.notas } : prev)
      setNotasEstado('')
      setMsgEstado('')
      // Bloquear fechas en calendario al activar contrato
      if (newEstado === 'ACTIVO' && rental.fecha_inicio && rental.fecha_fin) {
        const { supabase: sb } = await import('../../integrations/supabase/client')
        // El calendario usa fin exclusivo (como check-out). Para que el último día del contrato
        // quede bloqueado, añadimos 1 día al fecha_fin del rental.
        const finExclusivo = new Date(rental.fecha_fin + 'T12:00:00')
        finExclusivo.setDate(finExclusivo.getDate() + 1)
        const fechaFinBloqueo = finExclusivo.toISOString().split('T')[0]
        // Eliminar bloqueo anterior de este rental si existía
        await sb.from('bloqueos').delete()
          .eq('unidad_id', rental.unidad_id)
          .eq('origen', 'RENTAL')
          .like('motivo', `RENTAL:${rental.id}%`)
        await sb.from('bloqueos').insert({
          property_id,
          unidad_id: rental.unidad_id,
          fecha_inicio: rental.fecha_inicio,
          fecha_fin: fechaFinBloqueo,
          motivo: `RENTAL:${rental.id} · ${rental.cliente_nombre}`,
          origen: 'RENTAL',
        })
      }
      const msgs = await rentalService.getMessages(rental.id)
      setMessages(msgs)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setChangingEstado(false)
    }
  }

  async function handleSendMessage() {
    if (!rental || !msgBody.trim()) return
    setSendingMsg(true)
    try {
      await rentalService.sendMessage(rental.id, msgSubject || 'Mensaje sobre tu solicitud', msgBody, msgWhatsapp)
      const msgs = await rentalService.getMessages(rental.id)
      setMessages(msgs)
      setShowMsgModal(false)
      setMsgSubject('')
      setMsgBody('')
      setMsgWhatsapp(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSendingMsg(false)
    }
  }

  async function handleRequestDocs() {
    if (!rental || docsSelected.length === 0) return
    setSendingDocs(true)
    try {
      await rentalService.requestDocs(rental.id, docsSelected, docsNote || undefined)
      const msgs = await rentalService.getMessages(rental.id)
      setMessages(msgs)
      setShowDocsModal(false)
      setDocsSelected([])
      setDocsNote('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSendingDocs(false)
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
      // Bloquear las nuevas fechas en calendario si hay fecha fin
      if (newRenewal.fecha_inicio && newRenewal.fecha_fin) {
        const { supabase: sb } = await import('../../integrations/supabase/client')
        const finExclusivo = new Date(newRenewal.fecha_fin + 'T12:00:00')
        finExclusivo.setDate(finExclusivo.getDate() + 1)
        const fechaFinBloqueo = finExclusivo.toISOString().split('T')[0]
        await sb.from('bloqueos').insert({
          property_id,
          unidad_id: rental.unidad_id,
          fecha_inicio: newRenewal.fecha_inicio,
          fecha_fin: fechaFinBloqueo,
          motivo: `RENTAL:${rental.id} · Renovación · ${rental.cliente_nombre}`,
          origen: 'RENTAL',
        })
      }
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

  async function handleSyncCalendar() {
    if (!rental || !rental.fecha_inicio || !rental.fecha_fin) {
      setError('El contrato necesita fecha de inicio y fin para sincronizar el calendario')
      return
    }
    setSyncingCalendar(true)
    try {
      const { supabase: sb } = await import('../../integrations/supabase/client')
      // Eliminar bloqueos anteriores de este rental
      await sb.from('bloqueos').delete()
        .eq('unidad_id', rental.unidad_id)
        .eq('origen', 'RENTAL')
        .like('motivo', `RENTAL:${rental.id}%`)
      // Insertar el contrato principal
      const finExclusivo = new Date(rental.fecha_fin + 'T12:00:00')
      finExclusivo.setDate(finExclusivo.getDate() + 1)
      const fechaFinBloqueo = finExclusivo.toISOString().split('T')[0]
      await sb.from('bloqueos').insert({
        property_id,
        unidad_id: rental.unidad_id,
        fecha_inicio: rental.fecha_inicio,
        fecha_fin: fechaFinBloqueo,
        motivo: `RENTAL:${rental.id} · ${rental.cliente_nombre}`,
        origen: 'RENTAL',
      })
      // Insertar renovaciones con fecha fin
      for (const r of renewals) {
        if (r.fecha_inicio && r.fecha_fin) {
          const finRen = new Date(r.fecha_fin + 'T12:00:00')
          finRen.setDate(finRen.getDate() + 1)
          await sb.from('bloqueos').insert({
            property_id,
            unidad_id: rental.unidad_id,
            fecha_inicio: r.fecha_inicio,
            fecha_fin: finRen.toISOString().split('T')[0],
            motivo: `RENTAL:${rental.id} · Renovación · ${rental.cliente_nombre}`,
            origen: 'RENTAL',
          })
        }
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSyncingCalendar(false)
    }
  }

  async function handleViewDoc(doc: RentalDocument) {
    try {
      const url = await rentalService.getDocumentUrl(doc.file_path)
      window.open(url, '_blank')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleSaveContrato() {
    if (!rental) return
    setSavingContrato(true)
    try {
      const updated = await rentalService.updateRental(rental.id, editContrato)
      setRental(updated)
      setShowEditContrato(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingContrato(false)
    }
  }

  async function handleSaveContacto() {
    if (!rental) return
    setSavingContacto(true)
    try {
      const updated = await rentalService.updateRental(rental.id, editContacto)
      setRental(updated)
      setShowEditContacto(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingContacto(false)
    }
  }

  async function handleSavePerfil() {
    if (!rental) return
    setSavingPerfil(true)
    try {
      const updated = await rentalService.updateRental(rental.id, editPerfil)
      setRental(updated)
      setShowEditPerfil(false)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingPerfil(false)
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
          { id: 'renovaciones' as Tab,     icon: <RefreshCw size={13} />,     label: 'Renovaciones' },
          { id: 'limpieza' as Tab,         icon: <Sparkles size={13} />,      label: `Limpieza${schedules.length > 0 ? ` (${schedules.length})` : ''}` },
          { id: 'comunicaciones' as Tab,   icon: <MessageSquare size={13} />, label: `Comunicaciones${messages.length > 0 ? ` (${messages.length})` : ''}` },
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
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Datos del contrato</h3>
                <button
                  onClick={() => { setEditContrato({ precio_mensual: rental.precio_mensual, fianza: rental.fianza, fianza_cobrada: rental.fianza_cobrada, fecha_inicio: rental.fecha_inicio, fecha_fin: rental.fecha_fin ?? '', duracion_meses: rental.duracion_meses ?? undefined, forma_pago: rental.forma_pago, num_ocupantes: rental.num_ocupantes, incluye_gastos: rental.incluye_gastos, incluye_limpieza: rental.incluye_limpieza, notas_solicitud: rental.notas_solicitud ?? '' }); setShowEditContrato(true) }}
                  className="flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-admin-card px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-sidebar-hover hover:text-slate-200"
                >
                  <Pencil size={11} /> Editar
                </button>
              </div>
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
                    placeholder="Notas internas (opcional)…"
                    rows={2}
                    className={`${inputCls} resize-none text-xs`}
                  />
                  <textarea
                    value={msgEstado}
                    onChange={e => setMsgEstado(e.target.value)}
                    placeholder="Mensaje al inquilino con el cambio (se enviará por email)…"
                    rows={2}
                    className={`${inputCls} resize-none text-xs`}
                  />
                  <div className="space-y-2">
                    {nextStates.map(s => {
                      const btnLabel: Record<RentalEstado, string> = {
                        SOLICITUD:   'Volver a solicitud',
                        EN_REVISION: 'Poner en revisión',
                        APROBADO:    'Aprobar solicitud',
                        ACTIVO:      'Activar contrato (firma recibida)',
                        RENOVADO:    'Registrar renovación',
                        FINALIZADO:  'Finalizar contrato',
                        CANCELADO:   'Cancelar',
                      }
                      return (
                        <button
                          key={s}
                          onClick={() => handleChangeEstado(s)}
                          disabled={changingEstado}
                          className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-40 ${
                            s === 'CANCELADO'
                              ? 'border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                              : s === 'ACTIVO'
                              ? 'flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700'
                              : s === 'APROBADO'
                              ? 'bg-brand-600 text-white hover:bg-brand-700'
                              : 'border border-sidebar-border bg-admin-card text-slate-300 hover:bg-sidebar-hover'
                          }`}
                        >
                          {changingEstado
                            ? <Loader2 size={12} className="mx-auto animate-spin" />
                            : s === 'ACTIVO'
                            ? <><CalendarRange size={12} className="inline mr-1" />{btnLabel[s]}</>
                            : btnLabel[s]
                          }
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Sincronizar calendario */}
              {(rental.estado === 'ACTIVO' || rental.estado === 'RENOVADO') && rental.fecha_fin && (
                <div className="mt-4 border-t border-sidebar-border pt-4">
                  <button
                    onClick={handleSyncCalendar}
                    disabled={syncingCalendar}
                    className="flex w-full items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs font-medium text-violet-300 hover:bg-violet-500/10 disabled:opacity-40"
                  >
                    {syncingCalendar ? <Loader2 size={13} className="animate-spin" /> : <CalendarRange size={13} />}
                    Sincronizar bloqueo de calendario
                  </button>
                  <p className="mt-1 text-[10px] text-slate-600">Recalcula el bloqueo en el calendario con las fechas actuales del contrato</p>
                </div>
              )}

              {/* Acciones rápidas de comunicación */}
              <div className="mt-5 space-y-2 border-t border-sidebar-border pt-4">
                <p className="mb-2 text-xs font-semibold text-slate-400">Comunicación directa</p>
                <button
                  onClick={() => setShowMsgModal(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-sidebar-hover"
                >
                  <Mail size={13} /> Enviar mensaje al inquilino
                </button>
                <button
                  onClick={() => setShowDocsModal(true)}
                  className="flex w-full items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
                >
                  <PaperclipIcon size={13} /> Solicitar documentación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'inquilino' && (
        <div className="space-y-5">
          {/* Datos de contacto */}
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Datos de contacto</h3>
              <button
                onClick={() => { setEditContacto({ cliente_nombre: rental.cliente_nombre, cliente_email: rental.cliente_email, cliente_telefono: rental.cliente_telefono ?? '', cliente_dni: rental.cliente_dni ?? '', num_ocupantes: rental.num_ocupantes }); setShowEditContacto(true) }}
                className="flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-admin-card px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-sidebar-hover hover:text-slate-200"
              >
                <Pencil size={11} /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              {[
                { l: 'Nombre completo', v: rental.cliente_nombre },
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

          {/* Perfil de la solicitud */}
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Perfil de la solicitud</h3>
              <button
                onClick={() => { setEditPerfil({ estado_laboral: rental.estado_laboral ?? '', motivo_estancia: rental.motivo_estancia ?? '', mascotas: rental.mascotas, num_mascotas: rental.num_mascotas ?? undefined, tipo_mascotas: rental.tipo_mascotas ?? '', descripcion_solicitud: rental.descripcion_solicitud ?? '', notas_solicitud: rental.notas_solicitud ?? '' }); setShowEditPerfil(true) }}
                className="flex items-center gap-1.5 rounded-lg border border-sidebar-border bg-admin-card px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:bg-sidebar-hover hover:text-slate-200"
              >
                <Pencil size={11} /> Editar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1"><Briefcase size={12} className="text-slate-500" /><p className="text-xs text-slate-500">Situación laboral</p></div>
                <p className="font-medium text-slate-100">{rental.estado_laboral ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1"><MapPin size={12} className="text-slate-500" /><p className="text-xs text-slate-500">Motivo de la estancia</p></div>
                <p className="font-medium text-slate-100">{rental.motivo_estancia ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1"><PawPrint size={12} className="text-slate-500" /><p className="text-xs text-slate-500">Mascotas</p></div>
                <p className="font-medium text-slate-100">
                  {rental.mascotas
                    ? `Sí${rental.num_mascotas ? ` · ${rental.num_mascotas}` : ''}${rental.tipo_mascotas ? ` · ${rental.tipo_mascotas}` : ''}`
                    : 'No'}
                </p>
              </div>
            </div>

            {rental.descripcion_solicitud && (
              <div className="mt-4 rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <p className="mb-1 text-xs text-slate-500">Presentación del inquilino</p>
                <p className="text-sm text-slate-200 leading-relaxed">{rental.descripcion_solicitud}</p>
              </div>
            )}
            {rental.notas_solicitud && (
              <div className="mt-3 rounded-xl border border-sidebar-border bg-admin-card px-4 py-3">
                <p className="mb-1 text-xs text-slate-500">Notas adicionales</p>
                <p className="text-sm text-slate-200 leading-relaxed">{rental.notas_solicitud}</p>
              </div>
            )}
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
                  <button
                    onClick={() => handleViewDoc(doc)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-sidebar-hover hover:text-brand-300"
                    title="Ver documento"
                  >
                    <Eye size={13} />
                  </button>
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

      {/* ── Tab: Comunicaciones ─────────────────────────────────────────────── */}
      {tab === 'comunicaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Historial de comunicaciones</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDocsModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/10"
              >
                <PaperclipIcon size={12} /> Solicitar docs
              </button>
              <button
                onClick={() => setShowMsgModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700"
              >
                <Send size={12} /> Enviar mensaje
              </button>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-bg py-16 text-slate-500">
              <MessageSquare size={28} className="mb-3 opacity-30" />
              <p className="text-sm">Sin comunicaciones aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => (
                <div key={m.id} className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {m.channel === 'EMAIL'    && <Mail size={13} className="text-brand-400" />}
                      {m.channel === 'WHATSAPP' && <MessageCircle size={13} className="text-emerald-400" />}
                      {m.channel === 'NOTA'     && <StickyNote size={13} className="text-amber-400" />}
                      <span className="text-xs font-semibold text-slate-300">{m.subject ?? m.channel}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        m.direction === 'OUTBOUND'
                          ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                          : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {m.direction === 'OUTBOUND' ? 'Enviado' : 'Recibido'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(m.sent_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Enviar mensaje libre ──────────────────────────────────────── */}
      {showMsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-sidebar-bg p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Enviar mensaje al inquilino</h3>
              <button onClick={() => setShowMsgModal(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Asunto</label>
                <input
                  value={msgSubject}
                  onChange={e => setMsgSubject(e.target.value)}
                  placeholder="Asunto del email…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Mensaje *</label>
                <textarea
                  rows={6}
                  value={msgBody}
                  onChange={e => setMsgBody(e.target.value)}
                  placeholder="Escribe aquí tu mensaje para el inquilino…"
                  className={`${inputCls} resize-none`}
                />
              </div>
              {rental.cliente_telefono && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={msgWhatsapp} onChange={e => setMsgWhatsapp(e.target.checked)} className="accent-brand-500" />
                  Enviar también por WhatsApp a {rental.cliente_telefono}
                </label>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowMsgModal(false)} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg || !msgBody.trim()}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {sendingMsg ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Enviar email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar contrato ──────────────────────────────────────────── */}
      {showEditContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-sidebar-border bg-sidebar-bg p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Editar datos del contrato</h3>
              <button onClick={() => setShowEditContrato(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Precio mensual (€)</label>
                <input type="number" step="0.01" value={editContrato.precio_mensual ?? ''} onChange={e => setEditContrato(p => ({ ...p, precio_mensual: parseFloat(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fianza (€)</label>
                <input type="number" step="0.01" value={editContrato.fianza ?? ''} onChange={e => setEditContrato(p => ({ ...p, fianza: parseFloat(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fecha inicio</label>
                <input type="date" value={editContrato.fecha_inicio ?? ''} onChange={e => setEditContrato(p => ({ ...p, fecha_inicio: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Fecha fin prevista</label>
                <input type="date" value={editContrato.fecha_fin ?? ''} onChange={e => setEditContrato(p => ({ ...p, fecha_fin: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Duración (meses)</label>
                <input type="number" min={1} value={editContrato.duracion_meses ?? ''} onChange={e => setEditContrato(p => ({ ...p, duracion_meses: parseInt(e.target.value) }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Forma de pago</label>
                <select value={editContrato.forma_pago ?? ''} onChange={e => setEditContrato(p => ({ ...p, forma_pago: e.target.value as Rental['forma_pago'] }))} className={inputCls}>
                  {['TARJETA','SEPA','TRANSFERENCIA','EFECTIVO'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nº de ocupantes</label>
                <input type="number" min={1} value={editContrato.num_ocupantes ?? ''} onChange={e => setEditContrato(p => ({ ...p, num_ocupantes: parseInt(e.target.value) }))} className={inputCls} />
              </div>
              <div className="flex items-center gap-6 pt-5">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={!!editContrato.incluye_gastos} onChange={e => setEditContrato(p => ({ ...p, incluye_gastos: e.target.checked }))} className="accent-brand-500" />
                  Gastos incluidos
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={!!editContrato.incluye_limpieza} onChange={e => setEditContrato(p => ({ ...p, incluye_limpieza: e.target.checked }))} className="accent-brand-500" />
                  Limpieza incluida
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={!!editContrato.fianza_cobrada} onChange={e => setEditContrato(p => ({ ...p, fianza_cobrada: e.target.checked }))} className="accent-brand-500" />
                  Fianza cobrada
                </label>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Notas de la solicitud</label>
                <textarea rows={3} value={editContrato.notas_solicitud ?? ''} onChange={e => setEditContrato(p => ({ ...p, notas_solicitud: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowEditContrato(false)} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
              <button onClick={handleSaveContrato} disabled={savingContrato} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40">
                {savingContrato ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar contacto ───────────────────────────────────────────── */}
      {showEditContacto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-sidebar-bg p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Editar datos de contacto</h3>
              <button onClick={() => setShowEditContacto(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Nombre completo</label>
                <input value={editContacto.cliente_nombre ?? ''} onChange={e => setEditContacto(p => ({ ...p, cliente_nombre: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Email</label>
                <input type="email" value={editContacto.cliente_email ?? ''} onChange={e => setEditContacto(p => ({ ...p, cliente_email: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Teléfono</label>
                <input value={editContacto.cliente_telefono ?? ''} onChange={e => setEditContacto(p => ({ ...p, cliente_telefono: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">DNI / NIE</label>
                <input value={editContacto.cliente_dni ?? ''} onChange={e => setEditContacto(p => ({ ...p, cliente_dni: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nº de ocupantes</label>
                <input type="number" min={1} value={editContacto.num_ocupantes ?? ''} onChange={e => setEditContacto(p => ({ ...p, num_ocupantes: parseInt(e.target.value) }))} className={inputCls} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowEditContacto(false)} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
              <button onClick={handleSaveContacto} disabled={savingContacto} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40">
                {savingContacto ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Editar perfil solicitud ──────────────────────────────────── */}
      {showEditPerfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-sidebar-bg p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Editar perfil de la solicitud</h3>
              <button onClick={() => setShowEditPerfil(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Situación laboral</label>
                <select value={editPerfil.estado_laboral ?? ''} onChange={e => setEditPerfil(p => ({ ...p, estado_laboral: e.target.value }))} className={inputCls}>
                  <option value="">— Sin especificar —</option>
                  {['EMPLEADO','AUTONOMO','FUNCIONARIO','JUBILADO','ESTUDIANTE','DESEMPLEADO','OTRO'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Motivo de la estancia</label>
                <select value={editPerfil.motivo_estancia ?? ''} onChange={e => setEditPerfil(p => ({ ...p, motivo_estancia: e.target.value }))} className={inputCls}>
                  <option value="">— Sin especificar —</option>
                  {['TRABAJO','ESTUDIOS','RESIDENCIA_HABITUAL','TEMPORAL','OTRO'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={!!editPerfil.mascotas} onChange={e => setEditPerfil(p => ({ ...p, mascotas: e.target.checked }))} className="accent-brand-500" />
                  Tiene mascotas
                </label>
              </div>
              {editPerfil.mascotas && (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Nº de mascotas</label>
                    <input type="number" min={1} value={editPerfil.num_mascotas ?? ''} onChange={e => setEditPerfil(p => ({ ...p, num_mascotas: parseInt(e.target.value) }))} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs text-slate-400">Tipo de mascotas</label>
                    <input value={editPerfil.tipo_mascotas ?? ''} onChange={e => setEditPerfil(p => ({ ...p, tipo_mascotas: e.target.value }))} placeholder="Ej: perro, gato…" className={inputCls} />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Presentación del inquilino</label>
                <textarea rows={3} value={editPerfil.descripcion_solicitud ?? ''} onChange={e => setEditPerfil(p => ({ ...p, descripcion_solicitud: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-400">Notas adicionales</label>
                <textarea rows={2} value={editPerfil.notas_solicitud ?? ''} onChange={e => setEditPerfil(p => ({ ...p, notas_solicitud: e.target.value }))} className={`${inputCls} resize-none`} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowEditPerfil(false)} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
              <button onClick={handleSavePerfil} disabled={savingPerfil} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40">
                {savingPerfil ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Solicitar documentación ──────────────────────────────────── */}
      {showDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-sidebar-border bg-sidebar-bg p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Solicitar documentación</h3>
              <button onClick={() => setShowDocsModal(false)} className="text-slate-400 hover:text-slate-200"><X size={18} /></button>
            </div>
            <p className="mb-4 text-xs text-slate-400">Selecciona los documentos que necesitas. Se enviará un email al inquilino con la lista.</p>
            <div className="mb-4 space-y-2 max-h-56 overflow-y-auto">
              {Object.entries(DOC_TIPO_LABEL).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-sidebar-border bg-admin-card px-4 py-2.5 text-xs text-slate-300 hover:bg-sidebar-hover">
                  <input
                    type="checkbox"
                    checked={docsSelected.includes(label)}
                    onChange={e => setDocsSelected(prev =>
                      e.target.checked ? [...prev, label] : prev.filter(d => d !== label)
                    )}
                    className="accent-brand-500"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Mensaje adicional (opcional)</label>
              <textarea
                rows={3}
                value={docsNote}
                onChange={e => setDocsNote(e.target.value)}
                placeholder="Añade instrucciones específicas o contexto…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowDocsModal(false)} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
              <button
                onClick={handleRequestDocs}
                disabled={sendingDocs || docsSelected.length === 0}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-40"
              >
                {sendingDocs ? <Loader2 size={12} className="animate-spin" /> : <PaperclipIcon size={12} />}
                Solicitar {docsSelected.length > 0 ? `(${docsSelected.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

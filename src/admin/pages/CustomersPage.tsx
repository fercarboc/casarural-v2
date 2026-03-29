import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, Mail, Phone, Calendar, Euro, X, ChevronRight,
  Users, FileText, MessageSquare, CheckCircle2, Clock, AlertCircle,
  Loader2, BookOpen, User, ExternalLink, RefreshCw, Pencil, Trash2, Plus
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'

// ── Tipos ─────────────────────────────────────────────────

interface Consulta {
  id: string
  nombre: string
  email: string
  telefono?: string
  asunto?: string
  mensaje: string
  estado: 'NUEVA' | 'VISTA' | 'RESPONDIDA' | 'ARCHIVADA'
  reserva_id?: string
  notas_admin?: string
  created_at: string
}

interface Reserva {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
  telefono?: string
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number
  menores?: number
  tarifa: string
  temporada: string
  noches: number
  precio_noche: number
  importe_alojamiento: number
  importe_extra: number
  importe_limpieza: number
  descuento: number
  total: number
  importe_senal?: number
  importe_pagado: number
  estado: string
  estado_pago: string
  created_at: string
}

interface Huesped {
  id: string
  nombre: string
  primer_apellido: string
  segundo_apellido?: string
  tipo_documento: string
  numero_documento: string
  fecha_nacimiento?: string
  sexo?: string
  nacionalidad: string
  completado: boolean
  titular: boolean
}

interface Factura {
  id: string
  numero: string
  total: number
  estado: string
  fecha_emision: string
  pdf_url?: string
}

interface Contacto {
  email: string
  nombre: string
  telefono?: string
  consultas: Consulta[]
  reservas: Reserva[]
  ultimo_contacto: string
}

type TabFiltro = 'todos' | 'consultas' | 'clientes'
type EstadoConsulta = 'NUEVA' | 'VISTA' | 'RESPONDIDA' | 'ARCHIVADA'

// ── Página principal ───────────────────────────────────────

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate()
  const [contactos, setContactos] = useState<Contacto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFiltro>('todos')
  const [selected, setSelected] = useState<Contacto | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: consultas }, { data: reservas }] = await Promise.all([
        supabase.from('consultas').select('*').order('created_at', { ascending: false }),
        supabase.from('reservas').select('*').order('created_at', { ascending: false }),
      ])

      // Agrupar por email
      const map = new Map<string, Contacto>()

      for (const c of (consultas ?? [])) {
        if (!map.has(c.email)) {
          map.set(c.email, { email: c.email, nombre: c.nombre, telefono: c.telefono, consultas: [], reservas: [], ultimo_contacto: c.created_at })
        }
        const entry = map.get(c.email)!
        entry.consultas.push(c)
        if (c.created_at > entry.ultimo_contacto) entry.ultimo_contacto = c.created_at
      }

      for (const r of (reservas ?? [])) {
        if (!map.has(r.email)) {
          map.set(r.email, { email: r.email, nombre: `${r.nombre} ${r.apellidos}`, telefono: r.telefono, consultas: [], reservas: [], ultimo_contacto: r.created_at })
        }
        const entry = map.get(r.email)!
        entry.reservas.push(r)
        if (!entry.telefono && r.telefono) entry.telefono = r.telefono
        // Prefer the name from reservations if it's more complete
        if (r.nombre && r.apellidos) entry.nombre = `${r.nombre} ${r.apellidos}`
        if (r.created_at > entry.ultimo_contacto) entry.ultimo_contacto = r.created_at
      }

      const sorted = Array.from(map.values()).sort((a, b) => b.ultimo_contacto.localeCompare(a.ultimo_contacto))
      setContactos(sorted)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = contactos.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.telefono ?? '').includes(q)
    const matchTab =
      tab === 'todos' ? true :
      tab === 'consultas' ? c.consultas.length > 0 :
      c.reservas.length > 0
    return matchSearch && matchTab
  })

  const stats = {
    total: contactos.length,
    consultasNuevas: contactos.flatMap(c => c.consultas).filter(c => c.estado === 'NUEVA').length,
    clientes: contactos.filter(c => c.reservas.length > 0).length,
    ingresos: contactos.flatMap(c => c.reservas).reduce((s, r) => s + Number(r.importe_pagado), 0),
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── LISTA ──────────────────────────────────────────── */}
      <div className={`flex flex-col transition-all duration-200 ${selected ? 'w-[420px] shrink-0' : 'flex-1'}`}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">CRM · Clientes & Consultas</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Gestión centralizada de contactos</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => navigate('/admin/reservas/nueva')}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all">
                <Plus size={13} /> Nueva reserva
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Stat label="Total" value={stats.total} />
            <Stat label="Consultas nuevas" value={stats.consultasNuevas} color="amber" />
            <Stat label="Con reserva" value={stats.clientes} color="emerald" />
            <Stat label="Ingresos" value={`${stats.ingresos.toFixed(0)}€`} color="blue" />
          </div>

          {/* Search + Tabs */}
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar nombre, email o teléfono..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>
          <div className="flex gap-1">
            {(['todos', 'consultas', 'clientes'] as TabFiltro[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  tab === t ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {t === 'todos' ? 'Todos' : t === 'consultas' ? 'Consultas' : 'Con reserva'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-zinc-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
              <Users size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Sin resultados</p>
            </div>
          ) : (
            filtered.map(c => (
              <ContactRow
                key={c.email}
                contacto={c}
                isSelected={selected?.email === c.email}
                onClick={() => setSelected(selected?.email === c.email ? null : c)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── PANEL DETALLE ──────────────────────────────────── */}
      {selected && (
        <ContactDetail
          contacto={selected}
          onClose={() => setSelected(null)}
          onRefresh={loadData}
        />
      )}
    </div>
  )
}

// ── Fila de contacto ───────────────────────────────────────

function ContactRow({ contacto: c, isSelected, onClick }: {
  key?: React.Key
  contacto: Contacto
  isSelected: boolean
  onClick: () => void
}) {
  const hasNuevas = c.consultas.some(q => q.estado === 'NUEVA')

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${
        isSelected ? 'bg-zinc-100 border-l-2 border-zinc-900' : ''
      }`}
    >
      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
        c.reservas.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
      }`}>
        {c.nombre[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900 truncate">{c.nombre}</p>
          {hasNuevas && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Consulta nueva" />}
        </div>
        <p className="text-xs text-zinc-400 truncate">{c.email}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {c.consultas.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
              <MessageSquare size={9} /> {c.consultas.length} consulta{c.consultas.length > 1 ? 's' : ''}
            </span>
          )}
          {c.reservas.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              <BookOpen size={9} /> {c.reservas.length} reserva{c.reservas.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {c.reservas.length > 0 && (
          <p className="text-xs font-bold text-zinc-800">
            {c.reservas.reduce((s, r) => s + Number(r.total), 0).toFixed(0)}€
          </p>
        )}
        <p className="text-[10px] text-zinc-400">
          {format(parseISO(c.ultimo_contacto), 'd MMM yy', { locale: es })}
        </p>
        <ChevronRight size={14} className="text-zinc-300 mt-1 ml-auto" />
      </div>
    </button>
  )
}

// ── Panel de detalle ───────────────────────────────────────

function ContactDetail({ contacto: c, onClose, onRefresh }: {
  contacto: Contacto
  onClose: () => void
  onRefresh: () => void
}) {
  const [tab, setTab] = useState<'info' | 'reservas' | 'consultas'>('info')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editNombre, setEditNombre] = useState(c.nombre)
  const [editTelefono, setEditTelefono] = useState(c.telefono ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const reservasActivas = c.reservas.filter(r => r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED')
  const totalGastado = reservasActivas.reduce((s, r) => s + Number(r.total), 0)
  const totalPagado  = reservasActivas.reduce((s, r) => s + Number(r.importe_pagado), 0)

  const handleSaveEdit = async () => {
    const trimmed = editNombre.trim()
    if (!trimmed) return
    setSaving(true)
    const parts = trimmed.split(/\s+/)
    const nombre    = parts[0]
    const apellidos = parts.slice(1).join(' ')
    const tel = editTelefono.trim() || null
    await Promise.all([
      supabase.from('reservas').update({ nombre, apellidos, telefono: tel }).eq('email', c.email),
      supabase.from('consultas').update({ nombre: trimmed, telefono: tel }).eq('email', c.email),
    ])
    setSaving(false)
    setEditOpen(false)
    onRefresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await Promise.all([
      supabase.from('reservas').delete().eq('email', c.email),
      supabase.from('consultas').delete().eq('email', c.email),
    ])
    setDeleting(false)
    onClose()
    onRefresh()
  }

  return (
    <div className="relative flex-1 flex flex-col border-l border-zinc-200 bg-white overflow-hidden">

      {/* Modal editar */}
      {editOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h3 className="font-bold text-zinc-900 mb-4">Editar cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Nombre completo</label>
                <input
                  value={editNombre}
                  onChange={e => setEditNombre(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Teléfono</label>
                <input
                  value={editTelefono}
                  onChange={e => setEditTelefono(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
              <p className="text-[11px] text-zinc-400">Se actualizará en todas las reservas y consultas de este email.</p>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar borrado */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-96 p-6">
            <h3 className="font-bold text-zinc-900 mb-2">¿Borrar cliente?</h3>
            <p className="text-sm text-zinc-500 mb-1">
              Se eliminarán <strong>todas las reservas y consultas</strong> asociadas al email:
            </p>
            <p className="text-sm font-semibold text-zinc-800 mb-4">{c.email}</p>
            <p className="text-xs text-red-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >{deleting ? 'Borrando…' : 'Sí, borrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-bold ${
            c.reservas.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {c.nombre[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="font-bold text-zinc-900">{c.nombre}</h2>
            <p className="text-xs text-zinc-400">{c.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setEditNombre(c.nombre); setEditTelefono(c.telefono ?? ''); setEditOpen(true) }}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
            title="Editar cliente"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors"
            title="Borrar cliente"
          >
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-px bg-zinc-100 border-b border-zinc-200">
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-zinc-400">Consultas</p>
          <p className="font-bold text-zinc-900 text-lg">{c.consultas.length}</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-zinc-400">Reservas</p>
          <p className="font-bold text-emerald-700 text-lg">{c.reservas.length}</p>
        </div>
        <div className="bg-white px-4 py-3 text-center">
          <p className="text-xs text-zinc-400">Gastado</p>
          <p className="font-bold text-zinc-900 text-lg">{totalGastado.toFixed(0)}€</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {([['info', 'Información'], ['reservas', 'Reservas'], ['consultas', 'Consultas']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              tab === k ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >{l}{k === 'consultas' && c.consultas.some(q => q.estado === 'NUEVA') && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />}</button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {tab === 'info' && (
          <InfoTab contacto={c} totalGastado={totalGastado} totalPagado={totalPagado} />
        )}
        {tab === 'reservas' && (
          <ReservasTab reservas={c.reservas} />
        )}
        {tab === 'consultas' && (
          <ConsultasTab consultas={c.consultas} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  )
}

// ── Tab: Información ───────────────────────────────────────

function InfoTab({ contacto: c, totalGastado, totalPagado }: {
  contacto: Contacto; totalGastado: number; totalPagado: number
}) {
  return (
    <div className="space-y-4">
      <Section title="Datos de contacto">
        <Row icon={<Mail size={14} />} label="Email" value={c.email} />
        {c.telefono && <Row icon={<Phone size={14} />} label="Teléfono" value={c.telefono} />}
        <Row icon={<Calendar size={14} />} label="Primer contacto"
          value={c.consultas[0] ? format(parseISO(c.consultas[0].created_at), "d MMM yyyy", { locale: es }) :
                 c.reservas[0] ? format(parseISO(c.reservas[0].created_at), "d MMM yyyy", { locale: es }) : '—'} />
      </Section>

      {c.reservas.length > 0 && (
        <Section title="Resumen económico">
          <Row icon={<Euro size={14} />} label="Total reservado" value={`${totalGastado.toFixed(2)}€`} />
          <Row icon={<CheckCircle2 size={14} className="text-emerald-500" />} label="Total pagado" value={`${totalPagado.toFixed(2)}€`} />
          {totalGastado - totalPagado > 0 && (
            <Row icon={<Clock size={14} className="text-amber-500" />} label="Pendiente" value={`${(totalGastado - totalPagado).toFixed(2)}€`} />
          )}
          <Row icon={<BookOpen size={14} />} label="Estancias" value={`${c.reservas.length}`} />
        </Section>
      )}

      {c.reservas.length > 0 && (
        <Section title="Última reserva">
          {(() => {
            const r = c.reservas[0]
            return (
              <div className="space-y-1.5 text-sm">
                <Row icon={<Calendar size={14} />} label="Entrada"
                  value={format(parseISO(r.fecha_entrada), "d MMM yyyy", { locale: es })} />
                <Row icon={<Calendar size={14} />} label="Salida"
                  value={format(parseISO(r.fecha_salida), "d MMM yyyy", { locale: es })} />
                <Row icon={<Users size={14} />} label="Huéspedes" value={`${r.num_huespedes}`} />
                <Row icon={<Euro size={14} />} label="Total" value={`${Number(r.total).toFixed(2)}€`} />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-zinc-400 text-xs">Estado</span>
                  <ReservaEstadoBadge estado={r.estado} />
                </div>
              </div>
            )
          })()}
        </Section>
      )}
    </div>
  )
}

// ── Tab: Reservas ──────────────────────────────────────────

function ReservasTab({ reservas }: { reservas: Reserva[] }) {
  if (reservas.length === 0) return (
    <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
      <BookOpen size={28} className="mb-2 opacity-40" />
      <p className="text-sm">Sin reservas</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {reservas.map(r => <ReservaCard key={r.id} reserva={r} />)}
    </div>
  )
}

function ReservaCard({ reserva: r }: { key?: React.Key; reserva: Reserva }) {
  const [open, setOpen] = useState(false)
  const [huespedes, setHuespedes] = useState<Huesped[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadDetail = async () => {
    if (open) { setOpen(false); return }
    setLoadingDetail(true)
    const [{ data: h }, { data: f }] = await Promise.all([
      supabase.from('huespedes').select('*').eq('reserva_id', r.id).order('titular', { ascending: false }),
      supabase.from('facturas').select('*').eq('reserva_id', r.id),
    ])
    setHuespedes(h ?? [])
    setFacturas(f ?? [])
    setLoadingDetail(false)
    setOpen(true)
  }

  const nights = Math.round((new Date(r.fecha_salida).getTime() - new Date(r.fecha_entrada).getTime()) / 86400000)

  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      {/* Cabecera */}
      <button onClick={loadDetail} className="w-full flex items-start justify-between p-4 hover:bg-zinc-50 transition-colors text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-800">{r.codigo}</span>
            <ReservaEstadoBadge estado={r.estado} />
            <PagoBadge estado={r.estado_pago} />
          </div>
          <p className="text-sm font-semibold text-zinc-900">
            {format(parseISO(r.fecha_entrada), "d MMM", { locale: es })} → {format(parseISO(r.fecha_salida), "d MMM yyyy", { locale: es })}
            <span className="text-zinc-400 font-normal ml-2">· {nights} noches</span>
          </p>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span><Users size={11} className="inline mr-1" />{r.num_huespedes} huéspedes</span>
            <span className={`font-semibold ${r.tarifa === 'FLEXIBLE' ? 'text-blue-600' : 'text-orange-600'}`}>
              {r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No Reembolsable'}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p className="text-base font-bold text-zinc-900">{Number(r.total).toFixed(0)}€</p>
          <p className="text-[10px] text-zinc-400">pagado: {Number(r.importe_pagado).toFixed(0)}€</p>
          {loadingDetail
            ? <Loader2 size={14} className="animate-spin text-zinc-400 mt-1 ml-auto" />
            : <ChevronRight size={14} className={`text-zinc-300 mt-1 ml-auto transition-transform ${open ? 'rotate-90' : ''}`} />
          }
        </div>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 space-y-4">

          {/* Desglose precios */}
          <div className="rounded-lg bg-white border border-zinc-200 p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-zinc-700 mb-2">Desglose del importe</p>
            <PriceRow label={`${nights} noches × ${Number(r.precio_noche).toFixed(0)}€`} value={`${Number(r.importe_alojamiento).toFixed(2)}€`} />
            {Number(r.importe_extra) > 0 && <PriceRow label="Suplemento huésped adicional" value={`${Number(r.importe_extra).toFixed(2)}€`} />}
            <PriceRow label="Gastos de limpieza" value={`${Number(r.importe_limpieza).toFixed(2)}€`} />
            {Number(r.descuento) > 0 && <PriceRow label="Descuento no reembolsable" value={`−${Number(r.descuento).toFixed(2)}€`} className="text-emerald-600" />}
            <div className="flex justify-between font-bold text-zinc-900 pt-1.5 border-t border-zinc-200">
              <span>Total</span><span>{Number(r.total).toFixed(2)}€</span>
            </div>
            {r.tarifa === 'FLEXIBLE' && r.importe_senal && (
              <PriceRow label="Señal (30%)" value={`${Number(r.importe_senal).toFixed(2)}€`} className="text-blue-600 font-medium" />
            )}
            <PriceRow label="Importe pagado" value={`${Number(r.importe_pagado).toFixed(2)}€`} className="font-medium text-emerald-600" />
          </div>

          {/* Huéspedes */}
          {huespedes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-600 mb-2 flex items-center gap-1.5">
                <Users size={12} /> Huéspedes registrados ({huespedes.filter(h => h.completado).length}/{r.num_huespedes})
              </p>
              <div className="space-y-1.5">
                {huespedes.map(h => (
                  <div key={h.id} className={`rounded-lg border p-2.5 text-xs flex items-start justify-between ${h.completado ? 'border-emerald-200 bg-emerald-50/50' : 'border-zinc-200 bg-white'}`}>
                    <div>
                      <p className="font-semibold text-zinc-800">
                        {h.completado ? `${h.nombre} ${h.primer_apellido}` : 'Pendiente de registro'}
                        {h.titular && <span className="ml-1.5 text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-bold uppercase">Titular</span>}
                      </p>
                      {h.completado && (
                        <p className="text-zinc-400 mt-0.5">{h.tipo_documento}: {h.numero_documento} · {h.nacionalidad}</p>
                      )}
                    </div>
                    {h.completado
                      ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      : <Clock size={14} className="text-zinc-300 shrink-0" />
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {huespedes.length === 0 && (
            <div className="rounded-lg border border-zinc-200 p-3 text-xs text-zinc-400 text-center">
              Sin huéspedes registrados aún
            </div>
          )}

          {/* Facturas */}
          {facturas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-600 mb-2 flex items-center gap-1.5">
                <FileText size={12} /> Factura{facturas.length > 1 ? 's' : ''}
              </p>
              {facturas.map(f => (
                <div key={f.id} className="rounded-lg border border-zinc-200 bg-white p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-zinc-800">{f.numero}</p>
                    <p className="text-zinc-400">{format(parseISO(f.fecha_emision), "d MMM yyyy", { locale: es })} · {Number(f.total).toFixed(2)}€</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FacturaBadge estado={f.estado} />
                    {f.pdf_url && (
                      <a href={f.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {facturas.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-400 text-center">
              Sin factura emitida
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Consultas ─────────────────────────────────────────

function ConsultasTab({ consultas, onRefresh }: { consultas: Consulta[]; onRefresh: () => void }) {
  if (consultas.length === 0) return (
    <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
      <MessageSquare size={28} className="mb-2 opacity-40" />
      <p className="text-sm">Sin consultas</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {consultas.map(c => <ConsultaCard key={c.id} consulta={c} onRefresh={onRefresh} />)}
    </div>
  )
}

function ConsultaCard({ consulta: c, onRefresh }: { key?: React.Key; consulta: Consulta; onRefresh: () => void }) {
  const [notas, setNotas] = useState(c.notas_admin ?? '')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(c.estado === 'NUEVA')

  const updateEstado = async (estado: EstadoConsulta) => {
    await supabase.from('consultas').update({ estado, updated_at: new Date().toISOString() }).eq('id', c.id)
    c.estado = estado
    onRefresh()
  }

  const saveNotas = async () => {
    setSaving(true)
    await supabase.from('consultas').update({ notas_admin: notas, updated_at: new Date().toISOString() }).eq('id', c.id)
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${c.estado === 'NUEVA' ? 'border-amber-200' : 'border-zinc-200'}`}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between p-3 text-left hover:bg-zinc-50 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ConsultaEstadoBadge estado={c.estado} />
            <span className="text-[10px] text-zinc-400">{format(parseISO(c.created_at), "d MMM yyyy HH:mm", { locale: es })}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{c.asunto || 'Consulta general'}</p>
          {!open && <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{c.mensaje}</p>}
        </div>
        <ChevronRight size={14} className={`text-zinc-300 shrink-0 mt-1 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-100 p-3 space-y-3">
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed bg-zinc-50 rounded-lg p-3">{c.mensaje}</p>

          {/* Notas admin */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Notas internas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Añade notas sobre esta consulta..."
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
            />
            <button
              onClick={saveNotas}
              disabled={saving}
              className="mt-1.5 px-3 py-1.5 bg-zinc-900 text-white text-xs rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>

          {/* Cambiar estado */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Cambiar estado</label>
            <div className="flex flex-wrap gap-1.5">
              {(['NUEVA', 'VISTA', 'RESPONDIDA', 'ARCHIVADA'] as EstadoConsulta[]).map(e => (
                <button
                  key={e}
                  onClick={() => updateEstado(e)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                    c.estado === e ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {e === 'NUEVA' ? 'Nueva' : e === 'VISTA' ? 'Vista' : e === 'RESPONDIDA' ? 'Respondida' : 'Archivada'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers UI ─────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  const cls = color === 'amber' ? 'text-amber-600' : color === 'emerald' ? 'text-emerald-600' : color === 'blue' ? 'text-blue-600' : 'text-zinc-900'
  return (
    <div className="bg-zinc-50 rounded-xl px-3 py-2 text-center border border-zinc-100">
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
      <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{title}</p>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-zinc-400">{icon}{label}</span>
      <span className="font-medium text-zinc-800 text-right">{value}</span>
    </div>
  )
}

function PriceRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between text-zinc-500 ${className ?? ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

function ReservaEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'bg-amber-100 text-amber-700',
    CONFIRMED:       'bg-emerald-100 text-emerald-700',
    CANCELLED:       'bg-red-100 text-red-600',
    EXPIRED:         'bg-zinc-100 text-zinc-500',
    NO_SHOW:         'bg-red-50 text-red-400',
  }
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Pdte. pago', CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada', EXPIRED: 'Expirada', NO_SHOW: 'No show',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[estado] ?? 'bg-zinc-100 text-zinc-500'}`}>{labels[estado] ?? estado}</span>
}

function PagoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    UNPAID:   'bg-zinc-100 text-zinc-500',
    PARTIAL:  'bg-blue-100 text-blue-600',
    PAID:     'bg-emerald-100 text-emerald-700',
    REFUNDED: 'bg-purple-100 text-purple-600',
  }
  const labels: Record<string, string> = { UNPAID: 'Sin pagar', PARTIAL: 'Señal', PAID: 'Pagado', REFUNDED: 'Reembolsado' }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[estado] ?? 'bg-zinc-100 text-zinc-500'}`}>{labels[estado] ?? estado}</span>
}

function ConsultaEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    NUEVA:      'bg-amber-100 text-amber-700',
    VISTA:      'bg-blue-100 text-blue-600',
    RESPONDIDA: 'bg-emerald-100 text-emerald-700',
    ARCHIVADA:  'bg-zinc-100 text-zinc-400',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[estado] ?? 'bg-zinc-100 text-zinc-500'}`}>{estado}</span>
}

function FacturaBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    EMITIDA: 'bg-blue-100 text-blue-600',
    ENVIADA: 'bg-emerald-100 text-emerald-700',
    ANULADA: 'bg-red-100 text-red-500',
  }
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[estado] ?? 'bg-zinc-100 text-zinc-500'}`}>{estado}</span>
}

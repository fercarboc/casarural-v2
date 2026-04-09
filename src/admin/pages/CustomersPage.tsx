import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Mail,
  Phone,
  Calendar,
  Euro,
  X,
  ChevronRight,
  Users,
  FileText,
  MessageSquare,
  CheckCircle2,
  Clock,
  Loader2,
  BookOpen,
  ExternalLink,
  RefreshCw,
  Pencil,
  Trash2,
  Plus,
  Send,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'
import { ReplyConsultaModal } from '../components/ReplyConsultaModal'
import { CustomerCommunicationsTimeline } from '../components/CustomerCommunicationsTimeline'

// ── Tipos ─────────────────────────────────────────────────

interface Consulta {
  id: string
  property_id?: string
  nombre: string
  email: string
  telefono?: string
  asunto?: string
  mensaje: string
  estado: 'NUEVA' | 'VISTA' | 'RESPONDIDA' | 'ARCHIVADA'
  reserva_id?: string
  notas_admin?: string
  created_at: string
  updated_at?: string
}

interface Reserva {
  id: string
  property_id?: string
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

/** Normaliza una fila cruda de la DB (esquema v2) al interface Reserva local. */
function normalizeReserva(r: any): Reserva {
  const nombre    = r.nombre_cliente    ?? r.nombre    ?? ''
  const apellidos = r.apellidos_cliente ?? r.apellidos ?? ''
  const email     = r.email_cliente     ?? r.email     ?? ''
  return {
    ...r,
    nombre,
    apellidos,
    email,
    telefono:         r.telefono_cliente ?? r.telefono,
    total:            Number(r.importe_total    ?? r.total          ?? 0),
    importe_extra:    Number(r.importe_extras   ?? r.importe_extra  ?? 0),
    descuento:        Number(r.descuento_aplicado ?? r.descuento    ?? 0),
    importe_pagado:   Number(r.importe_pagado   ?? 0),
    codigo: r.codigo || `R-${(r.id ?? '').replace(/-/g, '').slice(0, 8).toUpperCase()}`,
  }
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
  property_id?: string
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
      const [{ data: consultas, error: consultasError }, { data: reservas, error: reservasError }] =
        await Promise.all([
          supabase.from('consultas').select('*').order('created_at', { ascending: false }),
          supabase.from('reservas').select('*').order('created_at', { ascending: false }),
        ])

      if (consultasError) throw consultasError
      if (reservasError) throw reservasError

      const map = new Map<string, Contacto>()

      for (const c of consultas ?? []) {
        if (!map.has(c.email)) {
          map.set(c.email, {
            property_id: c.property_id,
            email: c.email,
            nombre: c.nombre,
            telefono: c.telefono,
            consultas: [],
            reservas: [],
            ultimo_contacto: c.created_at,
          })
        }

        const entry = map.get(c.email)!
        entry.consultas.push(c)

        if (!entry.property_id && c.property_id) {
          entry.property_id = c.property_id
        }

        if (c.created_at > entry.ultimo_contacto) {
          entry.ultimo_contacto = c.created_at
        }
      }

      for (const r of reservas ?? []) {
        const nr    = normalizeReserva(r)
        const email = nr.email || r.email_cliente || r.email || ''
        if (!email) continue

        if (!map.has(email)) {
          map.set(email, {
            property_id: r.property_id,
            email,
            nombre: `${nr.nombre} ${nr.apellidos}`.trim() || 'Cliente sin nombre',
            telefono: nr.telefono,
            consultas: [],
            reservas: [],
            ultimo_contacto: r.created_at,
          })
        }

        const entry = map.get(email)!
        entry.reservas.push(nr)

        if (!entry.property_id && r.property_id) {
          entry.property_id = r.property_id
        }

        if (!entry.telefono && nr.telefono) {
          entry.telefono = nr.telefono
        }

        if (nr.nombre && nr.apellidos) {
          entry.nombre = `${nr.nombre} ${nr.apellidos}`.trim()
        }

        if (r.created_at > entry.ultimo_contacto) {
          entry.ultimo_contacto = r.created_at
        }
      }

      const sorted = Array.from(map.values()).sort((a, b) =>
        b.ultimo_contacto.localeCompare(a.ultimo_contacto)
      )

      setContactos(sorted)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!selected) return

    const refreshedSelected =
      contactos.find((x) => x.email === selected.email) ?? null

    if (!refreshedSelected) {
      setSelected(null)
      return
    }

    const prevSerialized = JSON.stringify(selected)
    const nextSerialized = JSON.stringify(refreshedSelected)

    if (prevSerialized !== nextSerialized) {
      setSelected(refreshedSelected)
    }
  }, [contactos, selected])

  const filtered = contactos.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      c.nombre.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.telefono ?? '').includes(q)

    const matchTab =
      tab === 'todos'
        ? true
        : tab === 'consultas'
        ? c.consultas.length > 0
        : c.reservas.length > 0

    return matchSearch && matchTab
  })

  const stats = {
    total: contactos.length,
    consultasNuevas: contactos
      .flatMap((c) => c.consultas)
      .filter((c) => c.estado === 'NUEVA').length,
    clientes: contactos.filter((c) => c.reservas.length > 0).length,
    ingresos: contactos
      .flatMap((c) => c.reservas)
      .filter((r) => r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED')
      .reduce((s, r) => s + Number(r.total), 0),
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden gap-6">
      <div
        className={`flex flex-col transition-all duration-200 ${
          selected ? 'w-[430px] shrink-0' : 'flex-1'
        }`}
      >
        <div className="rounded-3xl border border-cyan-900/40 bg-[#071427] shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden h-full flex flex-col">
          <div className="px-6 py-5 border-b border-cyan-900/40 bg-[#0b1c34]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Clientes</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Gestión centralizada de contactos
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-xl hover:bg-[#132743] text-slate-400 transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw size={15} />
                </button>

                <button
                  onClick={() => navigate('/admin/reservas/nueva')}
                  className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-brand-700 transition-all"
                >
                  <Plus size={12} />
                  Nueva reserva
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <Stat label="Total" value={stats.total} />
              <Stat label="Consultas nuevas" value={stats.consultasNuevas} color="amber" />
              <Stat label="Con reserva" value={stats.clientes} color="emerald" />
              <Stat label="Ingresos" value={`${stats.ingresos.toFixed(0)}€`} color="blue" />
            </div>

            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre, email o teléfono..."
                className="w-full pl-9 pr-4 py-3 text-sm rounded-2xl border border-cyan-800/50 bg-[#132743] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              />
            </div>

            <div className="flex gap-1 rounded-2xl border border-cyan-900/50 bg-[#132743] p-1 w-fit">
              {(['todos', 'consultas', 'clientes'] as TabFiltro[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors capitalize ${
                    tab === t
                      ? 'bg-brand-600 text-white'
                      : 'text-slate-400 hover:bg-[#18304f] hover:text-slate-200'
                  }`}
                >
                  {t === 'todos' ? 'Todos' : t === 'consultas' ? 'Consultas' : 'Con reserva'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-cyan-900/30">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="animate-spin text-slate-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                <Users size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              filtered.map((c) => (
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
      </div>

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

// ── Helpers de negocio ────────────────────────────────────

/** Consultas que aún requieren atención (no respondidas ni archivadas). */
function getPendingConsultasCount(consultas: Consulta[]): number {
  return consultas.filter(
    (c) => c.estado === 'NUEVA' || c.estado === 'VISTA',
  ).length
}

// ── Fila de contacto ───────────────────────────────────────

function ContactRow({
  contacto: c,
  isSelected,
  onClick,
}: {
  key?: React.Key
  contacto: Contacto
  isSelected: boolean
  onClick: () => void
}) {
  const pendingCount = getPendingConsultasCount(c.consultas)

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#132743]/80 ${
        isSelected ? 'bg-[#132743] border-l-2 border-brand-500' : ''
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
            c.reservas.length > 0
              ? 'bg-emerald-500/10 text-emerald-300'
              : 'bg-slate-500/10 text-slate-300'
          }`}
        >
          {c.nombre[0]?.toUpperCase() ?? '?'}
        </div>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-amber-400 text-[9px] font-bold text-stone-900 flex items-center justify-center leading-none">
            {pendingCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{c.nombre}</p>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/25 shrink-0">
              {pendingCount === 1 ? '1 nueva' : `${pendingCount} nuevas`}
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 truncate">{c.email}</p>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {c.consultas.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <MessageSquare size={9} />
              {c.consultas.length} consulta{c.consultas.length > 1 ? 's' : ''}
            </span>
          )}

          {c.reservas.length > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <BookOpen size={9} />
              {c.reservas.length} reserva{c.reservas.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {c.reservas.length > 0 && (
          <p className="text-xs font-bold text-white">
            {c.reservas.reduce((s, r) => s + Number(r.total), 0).toFixed(0)}€
          </p>
        )}
        <p className="text-[10px] text-slate-500">
          {format(parseISO(c.ultimo_contacto), 'd MMM yy', { locale: es })}
        </p>
        <ChevronRight
          size={16}
          className={`mt-1 ml-auto shrink-0 transition-all ${
            isSelected ? 'text-brand-400' : 'text-cyan-300/80'
          }`}
        />
      </div>
    </button>
  )
}

// ── Panel de detalle ───────────────────────────────────────

function ContactDetail({
  contacto: c,
  onClose,
  onRefresh,
}: {
  contacto: Contacto
  onClose: () => void
  onRefresh: () => void
}) {
  const [tab, setTab] = useState<'info' | 'reservas' | 'consultas' | 'comunicaciones'>('info')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [editNombre, setEditNombre] = useState(c.nombre)
  const [editTelefono, setEditTelefono] = useState(c.telefono ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const reservasActivas = c.reservas.filter(
    (r) => r.estado !== 'CANCELLED' && r.estado !== 'EXPIRED'
  )
  const totalGastado = reservasActivas.reduce((s, r) => s + Number(r.total), 0)
  const totalPagado = reservasActivas.reduce((s, r) => s + Number(r.importe_pagado), 0)

  const handleSaveEdit = async () => {
    const trimmed = editNombre.trim()
    if (!trimmed) return

    setSaving(true)

    const parts = trimmed.split(/\s+/)
    const nombre = parts[0]
    const apellidos = parts.slice(1).join(' ')
    const tel = editTelefono.trim() || null

    await Promise.all([
      supabase.from('reservas').update({
        nombre_cliente: nombre,
        apellidos_cliente: apellidos,
        telefono_cliente: tel,
      }).eq('email_cliente', c.email),
      supabase.from('consultas').update({ nombre: trimmed, telefono: tel }).eq('email', c.email),
    ])

    setSaving(false)
    setEditOpen(false)
    onRefresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await Promise.all([
      supabase.from('reservas').delete().eq('email_cliente', c.email),
      supabase.from('consultas').delete().eq('email', c.email),
    ])
    setDeleting(false)
    onClose()
    onRefresh()
  }

  return (
    <div className="relative flex-1 flex flex-col rounded-3xl border border-cyan-900/40 bg-[#071427] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {editOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-3xl border border-cyan-900/40 bg-[#0b1c34] p-6 shadow-2xl">
            <h3 className="font-bold text-white mb-4">Editar cliente</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre completo
                </label>
                <input
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className={darkInputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Teléfono
                </label>
                <input
                  value={editTelefono}
                  onChange={(e) => setEditTelefono(e.target.value)}
                  className={darkInputCls}
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Se actualizará en todas las reservas y consultas de este email.
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditOpen(false)}
                className="flex-1 py-2 rounded-xl border border-cyan-900/40 text-sm text-slate-300 hover:bg-[#132743] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-brand-600 text-white text-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-3xl border border-cyan-900/40 bg-[#0b1c34] p-6 shadow-2xl">
            <h3 className="font-bold text-white mb-2">¿Borrar cliente?</h3>
            <p className="text-sm text-slate-400 mb-1">
              Se eliminarán <strong>todas las reservas y consultas</strong> asociadas al email:
            </p>
            <p className="text-sm font-semibold text-slate-100 mb-4">{c.email}</p>
            <p className="text-xs text-red-400 mb-5">Esta acción no se puede deshacer.</p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-cyan-900/40 text-sm text-slate-300 hover:bg-[#132743] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Borrando…' : 'Sí, borrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b border-cyan-900/40 flex items-start justify-between bg-[#0b1c34]">
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center text-base font-bold ${
              c.reservas.length > 0
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-slate-500/10 text-slate-300'
            }`}
          >
            {c.nombre[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <h2 className="font-bold text-white">{c.nombre}</h2>
            <p className="text-xs text-slate-500">{c.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setEditNombre(c.nombre)
              setEditTelefono(c.telefono ?? '')
              setEditOpen(true)
            }}
            className="p-1.5 rounded-lg hover:bg-[#132743] text-slate-400 hover:text-slate-200 transition-colors"
            title="Editar cliente"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
            title="Borrar cliente"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#132743] text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {(() => {
        const pendingKpi = getPendingConsultasCount(c.consultas)
        return (
          <div className="grid grid-cols-3 gap-3 px-5 py-4 border-b border-cyan-900/40 bg-[#08182d]">
            <div className="rounded-2xl border border-cyan-800/45 bg-[#10223d] px-4 py-3 text-center shadow-[0_8px_20px_rgba(0,0,0,0.18)] relative">
              <p className="text-xs text-slate-500 mb-1">Consultas</p>
              <p className="text-lg font-bold text-white">{c.consultas.length}</p>
              {pendingKpi > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 leading-none">
                  {pendingKpi} pdte{pendingKpi > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <KpiCard label="Reservas" value={c.reservas.length} valueClass="text-emerald-300" />
            <KpiCard label="Gastado" value={`${totalGastado.toFixed(0)}€`} valueClass="text-white" />
          </div>
        )
      })()}

      {(() => {
        const pendingTab = getPendingConsultasCount(c.consultas)
        return (
          <div className="flex border-b border-cyan-900/40 bg-[#0a1930]">
            {([
              ['info', 'Información'],
              ['reservas', 'Reservas'],
              ['consultas', 'Consultas'],
              ['comunicaciones', 'Comunicaciones'],
            ] as const).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`flex-1 py-3 text-xs font-semibold transition-colors border-b-2 -mb-px flex items-center justify-center gap-1 ${
                  tab === k
                    ? 'border-brand-500 text-white bg-[#10223d]'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-[#0f213b]'
                }`}
              >
                {l}
                {k === 'consultas' && pendingTab > 0 && (
                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-[9px] font-bold text-stone-900 flex items-center justify-center leading-none">
                    {pendingTab}
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      })()}

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#071427]">
        {tab === 'info' && (
          <InfoTab contacto={c} totalGastado={totalGastado} totalPagado={totalPagado} />
        )}
        {tab === 'reservas' && <ReservasTab reservas={c.reservas} />}
        {tab === 'consultas' && (
          <ConsultasTab consultas={c.consultas} onRefresh={onRefresh} />
        )}
        {tab === 'comunicaciones' && (
          <CustomerCommunicationsTimeline
            propertyId={c.property_id}
            customerEmail={c.email}
            title="Histórico de comunicaciones"
          />
        )}
      </div>
    </div>
  )
}

// ── Tab: Información ───────────────────────────────────────

function InfoTab({
  contacto: c,
  totalGastado,
  totalPagado,
}: {
  contacto: Contacto
  totalGastado: number
  totalPagado: number
}) {
  return (
    <div className="space-y-4">
      <Section title="Datos de contacto">
        <Row icon={<Mail size={14} />} label="Email" value={c.email} />
        {c.telefono && <Row icon={<Phone size={14} />} label="Teléfono" value={c.telefono} />}
        <Row
          icon={<Calendar size={14} />}
          label="Primer contacto"
          value={
            c.consultas[0]
              ? format(parseISO(c.consultas[0].created_at), 'd MMM yyyy', { locale: es })
              : c.reservas[0]
              ? format(parseISO(c.reservas[0].created_at), 'd MMM yyyy', { locale: es })
              : '—'
          }
        />
      </Section>

      {c.reservas.length > 0 && (
        <Section title="Resumen económico">
          <Row
            icon={<Euro size={14} />}
            label="Total reservado"
            value={`${totalGastado.toFixed(2)}€`}
          />
          <Row
            icon={<CheckCircle2 size={14} className="text-emerald-400" />}
            label="Total pagado"
            value={`${totalPagado.toFixed(2)}€`}
          />
          {totalGastado - totalPagado > 0 && (
            <Row
              icon={<Clock size={14} className="text-amber-400" />}
              label="Pendiente"
              value={`${(totalGastado - totalPagado).toFixed(2)}€`}
            />
          )}
          <Row
            icon={<BookOpen size={14} />}
            label="Estancias"
            value={`${c.reservas.length}`}
          />
        </Section>
      )}

      {c.reservas.length > 0 && (
        <Section title="Última reserva">
          {(() => {
            const r = c.reservas[0]
            return (
              <div className="space-y-1.5 text-sm">
                <Row
                  icon={<Calendar size={14} />}
                  label="Entrada"
                  value={format(parseISO(r.fecha_entrada), 'd MMM yyyy', { locale: es })}
                />
                <Row
                  icon={<Calendar size={14} />}
                  label="Salida"
                  value={format(parseISO(r.fecha_salida), 'd MMM yyyy', { locale: es })}
                />
                <Row
                  icon={<Users size={14} />}
                  label="Huéspedes"
                  value={`${r.num_huespedes}`}
                />
                <Row
                  icon={<Euro size={14} />}
                  label="Total"
                  value={`${Number(r.total).toFixed(2)}€`}
                />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500 text-xs">Estado</span>
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
  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500">
        <BookOpen size={28} className="mb-2 opacity-40" />
        <p className="text-sm">Sin reservas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {reservas.map((r) => (
        <ReservaCard key={r.id} reserva={r} />
      ))}
    </div>
  )
}

function ReservaCard({ reserva: r }: { key?: React.Key; reserva: Reserva }) {
  const [open, setOpen] = useState(false)
  const [huespedes, setHuespedes] = useState<Huesped[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const loadDetail = async () => {
    if (open) {
      setOpen(false)
      return
    }

    setLoadingDetail(true)
    const [{ data: h }, { data: f }] = await Promise.all([
      supabase
        .from('huespedes')
        .select('*')
        .eq('reserva_id', r.id)
        .order('titular', { ascending: false }),
      supabase.from('facturas').select('*').eq('reserva_id', r.id),
    ])
    setHuespedes(h ?? [])
    setFacturas(f ?? [])
    setLoadingDetail(false)
    setOpen(true)
  }

  const nights = Math.round(
    (new Date(r.fecha_salida).getTime() - new Date(r.fecha_entrada).getTime()) / 86400000
  )

  return (
    <div className="rounded-2xl border border-cyan-800/45 bg-[#0d203a] shadow-[0_8px_24px_rgba(0,0,0,0.22)] overflow-hidden">
      <button
        onClick={loadDetail}
        className="w-full flex items-start justify-between p-4 hover:bg-[#132743] transition-colors text-left"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white">{r.codigo}</span>
            <ReservaEstadoBadge estado={r.estado} />
            <PagoBadge estado={r.estado_pago} />
          </div>

          <p className="text-sm font-semibold text-white">
            {format(parseISO(r.fecha_entrada), 'd MMM', { locale: es })} →{' '}
            {format(parseISO(r.fecha_salida), 'd MMM yyyy', { locale: es })}
            <span className="text-slate-500 font-normal ml-2">· {nights} noches</span>
          </p>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>
              <Users size={11} className="inline mr-1" />
              {r.num_huespedes} huéspedes
            </span>
            <span
              className={`font-semibold ${
                r.tarifa === 'FLEXIBLE' ? 'text-blue-300' : 'text-amber-300'
              }`}
            >
              {r.tarifa === 'FLEXIBLE' ? 'Flexible' : 'No Reembolsable'}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 ml-3">
          <p className="text-base font-bold text-white">{Number(r.total).toFixed(0)}€</p>
          <p className="text-[10px] text-slate-500">
            pagado: {Number(r.importe_pagado).toFixed(0)}€
          </p>
          {loadingDetail ? (
            <Loader2 size={14} className="animate-spin text-slate-400 mt-1 ml-auto" />
          ) : (
            <ChevronRight
              size={16}
              className={`mt-1 ml-auto transition-all ${
                open ? 'rotate-90 text-brand-400' : 'text-cyan-300/80'
              }`}
            />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-cyan-800/35 bg-[#08182d] p-4 space-y-4">
          <div className="rounded-2xl border border-cyan-800/40 bg-[#132743] p-3.5 space-y-1.5 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="font-semibold text-slate-200 mb-2">Desglose del importe</p>
            <PriceRow
              label={`${nights} noches × ${Number(r.precio_noche).toFixed(0)}€`}
              value={`${Number(r.importe_alojamiento).toFixed(2)}€`}
            />
            {Number(r.importe_extra) > 0 && (
              <PriceRow
                label="Suplemento huésped adicional"
                value={`${Number(r.importe_extra).toFixed(2)}€`}
              />
            )}
            <PriceRow
              label="Gastos de limpieza"
              value={`${Number(r.importe_limpieza).toFixed(2)}€`}
            />
            {Number(r.descuento) > 0 && (
              <PriceRow
                label="Descuento no reembolsable"
                value={`−${Number(r.descuento).toFixed(2)}€`}
                className="text-emerald-300"
              />
            )}
            <div className="flex justify-between font-bold text-white pt-1.5 border-t border-cyan-800/35">
              <span>Total</span>
              <span>{Number(r.total).toFixed(2)}€</span>
            </div>
            {r.tarifa === 'FLEXIBLE' && r.importe_senal && (
              <PriceRow
                label="Señal (30%)"
                value={`${Number(r.importe_senal).toFixed(2)}€`}
                className="text-blue-300 font-medium"
              />
            )}
            <PriceRow
              label="Importe pagado"
              value={`${Number(r.importe_pagado).toFixed(2)}€`}
              className="font-medium text-emerald-300"
            />
          </div>

          {huespedes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <Users size={12} />
                Huéspedes registrados ({huespedes.filter((h) => h.completado).length}/
                {r.num_huespedes})
              </p>

              <div className="space-y-2">
                {huespedes.map((h) => (
                  <div
                    key={h.id}
                    className={`rounded-2xl border p-3 text-xs flex items-start justify-between ${
                      h.completado
                        ? 'border-emerald-500/20 bg-emerald-500/10'
                        : 'border-cyan-800/35 bg-[#132743]'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-100">
                        {h.completado ? `${h.nombre} ${h.primer_apellido}` : 'Pendiente de registro'}
                        {h.titular && (
                          <span className="ml-1.5 text-[9px] bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded font-bold uppercase">
                            Titular
                          </span>
                        )}
                      </p>

                      {h.completado && (
                        <p className="text-slate-500 mt-0.5">
                          {h.tipo_documento}: {h.numero_documento} · {h.nacionalidad}
                        </p>
                      )}
                    </div>

                    {h.completado ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Clock size={14} className="text-slate-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {huespedes.length === 0 && (
            <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-3 text-xs text-slate-500 text-center">
              Sin huéspedes registrados aún
            </div>
          )}

          {facturas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText size={12} />
                Factura{facturas.length > 1 ? 's' : ''}
              </p>

              <div className="space-y-2">
                {facturas.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-100">{f.numero}</p>
                      <p className="text-slate-500">
                        {format(parseISO(f.fecha_emision), 'd MMM yyyy', { locale: es })} ·{' '}
                        {Number(f.total).toFixed(2)}€
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <FacturaBadge estado={f.estado} />
                      {f.pdf_url && (
                        <a
                          href={f.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-[#18304f] text-slate-400 hover:text-slate-200"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {facturas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-cyan-800/35 bg-[#0d203a] p-3 text-xs text-slate-500 text-center">
              Sin factura emitida
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Consultas ─────────────────────────────────────────

function ConsultasTab({
  consultas,
  onRefresh,
}: {
  consultas: Consulta[]
  onRefresh: () => void
}) {
  if (consultas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500">
        <MessageSquare size={28} className="mb-2 opacity-40" />
        <p className="text-sm">Sin consultas</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {consultas.map((c) => (
        <ConsultaCard key={c.id} consulta={c} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

function ConsultaCard({
  consulta: c,
  onRefresh,
}: {
  key?: React.Key
  consulta: Consulta
  onRefresh: () => void
}) {
  const [notas, setNotas] = useState(c.notas_admin ?? '')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(c.estado === 'NUEVA')
  const [replyOpen, setReplyOpen] = useState(false)

  const updateEstado = async (estado: EstadoConsulta) => {
    await supabase
      .from('consultas')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', c.id)

    c.estado = estado
    onRefresh()
  }

  const saveNotas = async () => {
    setSaving(true)
    await supabase
      .from('consultas')
      .update({ notas_admin: notas, updated_at: new Date().toISOString() })
      .eq('id', c.id)
    setSaving(false)
  }

  return (
    <>
      {replyOpen && (
        <ReplyConsultaModal
          consulta={c}
          onClose={() => setReplyOpen(false)}
          onSent={() => {
            setReplyOpen(false)
            onRefresh()
          }}
        />
      )}

      <div
        className={`rounded-2xl border overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${
          c.estado === 'NUEVA'
            ? 'border-amber-500/25 bg-[#0d203a]'
            : 'border-cyan-800/40 bg-[#0d203a]'
        }`}
      >
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-start justify-between p-3 text-left hover:bg-[#132743] transition-colors"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ConsultaEstadoBadge estado={c.estado} />
              <span className="text-[10px] text-slate-500">
                {format(parseISO(c.created_at), 'd MMM yyyy HH:mm', { locale: es })}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-100 line-clamp-1">
              {c.asunto || 'Consulta general'}
            </p>
            {!open && <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{c.mensaje}</p>}
          </div>

          <ChevronRight
            size={16}
            className={`shrink-0 mt-1 transition-all ${
              open ? 'rotate-90 text-brand-400' : 'text-cyan-300/80'
            }`}
          />
        </button>

        {open && (
          <div className="border-t border-cyan-800/35 p-3 space-y-3 bg-[#08182d]">
            <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-3">
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {c.mensaje}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setReplyOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
              >
                <Send size={13} />
                Contestar y enviar email
              </button>
            </div>

            <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-3">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Notas internas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
                placeholder="Añade notas sobre esta consulta..."
                className="w-full rounded-xl border border-cyan-800/35 px-3 py-2 text-xs text-slate-100 bg-[#0f213b] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
              <button
                onClick={saveNotas}
                disabled={saving}
                className="mt-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>

            <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-3">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cambiar estado
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['NUEVA', 'VISTA', 'RESPONDIDA', 'ARCHIVADA'] as EstadoConsulta[]).map((e) => (
                  <button
                    key={e}
                    onClick={() => updateEstado(e)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-colors ${
                      c.estado === e
                        ? 'bg-brand-600 text-white'
                        : 'bg-[#0f213b] text-slate-400 border border-cyan-800/35 hover:bg-[#18304f]'
                    }`}
                  >
                    {e === 'NUEVA'
                      ? 'Nueva'
                      : e === 'VISTA'
                      ? 'Vista'
                      : e === 'RESPONDIDA'
                      ? 'Respondida'
                      : 'Archivada'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Helpers UI ─────────────────────────────────────────────

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: number | string
  color?: string
}) {
  const cls =
    color === 'amber'
      ? 'text-amber-300'
      : color === 'emerald'
      ? 'text-emerald-300'
      : color === 'blue'
      ? 'text-blue-300'
      : 'text-white'

  return (
    <div className="rounded-2xl border border-cyan-800/45 bg-[#132743] px-3 py-3 text-center shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
      <p className={`text-lg font-bold ${cls}`}>{value}</p>
      <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
        {label}
      </p>
    </div>
  )
}

function KpiCard({
  label,
  value,
  valueClass,
}: {
  label: string
  value: number | string
  valueClass?: string
}) {
  return (
    <div className="rounded-2xl border border-cyan-800/45 bg-[#10223d] px-4 py-3 text-center shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${valueClass ?? 'text-white'}`}>{value}</p>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-cyan-800/45 bg-[#0d203a] overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <div className="px-4 py-3 border-b border-cyan-800/35 bg-[#132743]">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">
          {title}
        </p>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between text-sm gap-3">
      <span className="flex items-center gap-2 text-slate-400">
        {icon}
        {label}
      </span>
      <span className="font-medium text-slate-100 text-right">{value}</span>
    </div>
  )
}

function PriceRow({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`flex justify-between text-slate-400 ${className ?? ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function ReservaEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    CONFIRMED: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    CANCELLED: 'bg-red-500/10 text-red-300 border border-red-500/20',
    EXPIRED: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
    NO_SHOW: 'bg-red-500/10 text-red-300 border border-red-500/20',
  }
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Pdte. pago',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Expirada',
    NO_SHOW: 'No show',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        map[estado] ?? 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
      }`}
    >
      {labels[estado] ?? estado}
    </span>
  )
}

function PagoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    UNPAID: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
    PARTIAL: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    PAID: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    REFUNDED: 'bg-violet-500/10 text-violet-300 border border-violet-500/20',
  }
  const labels: Record<string, string> = {
    UNPAID: 'Sin pagar',
    PARTIAL: 'Señal',
    PAID: 'Pagado',
    REFUNDED: 'Reembolsado',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        map[estado] ?? 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
      }`}
    >
      {labels[estado] ?? estado}
    </span>
  )
}

function ConsultaEstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    NUEVA: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    VISTA: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    RESPONDIDA: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    ARCHIVADA: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',
  }

  const labels: Record<string, string> = {
    NUEVA: 'NUEVA',
    VISTA: 'VISTA',
    RESPONDIDA: 'RESPONDIDA',
    ARCHIVADA: 'ARCHIVADA',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        map[estado] ?? 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
      }`}
    >
      {labels[estado] ?? estado}
    </span>
  )
}

function FacturaBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    EMITIDA: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    ENVIADA: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    ANULADA: 'bg-red-500/10 text-red-300 border border-red-500/20',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        map[estado] ?? 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
      }`}
    >
      {estado}
    </span>
  )
}

const darkInputCls =
  'w-full rounded-xl border border-cyan-800/35 px-3 py-2.5 text-sm bg-[#132743] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400'
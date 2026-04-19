// src/admin/pages/RentalsPage.tsx

import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Plus,
  Loader2,
  Search,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Users,
  CalendarRange,
  TrendingUp,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'
import { useAdminTenant } from '../context/AdminTenantContext'
import {
  rentalService,
  type Rental,
  type RentalEstado,
  type RentalFilters,
  RENTAL_ESTADO_LABEL,
  RENTAL_ESTADO_CLS,
} from '../../services/rental.service'
import { CreateRentalModal } from '../components/CreateRentalModal'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return format(parseISO(d), 'd MMM yyyy', { locale: es })
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

const ESTADOS_FILTRO: { v: RentalEstado | 'TODAS'; label: string }[] = [
  { v: 'TODAS',      label: 'Todas' },
  { v: 'SOLICITUD',  label: 'Solicitudes' },
  { v: 'EN_REVISION',label: 'En revisión' },
  { v: 'APROBADO',   label: 'Aprobado' },
  { v: 'ACTIVO',     label: 'Activos' },
  { v: 'FINALIZADO', label: 'Finalizados' },
  { v: 'CANCELADO',  label: 'Cancelados' },
]

// ── Componente principal ───────────────────────────────────────────────────────

export const RentalsPage: React.FC = () => {
  const { property_id } = useAdminTenant()

  const [rentals, setRentals] = useState<Rental[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState<RentalEstado | 'TODAS'>('TODAS')
  const [kpis, setKpis] = useState({ solicitudes: 0, activos: 0, pendientesRevision: 0 })
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters: RentalFilters = {}
      if (filterEstado !== 'TODAS') filters.estado = filterEstado
      const [data, k] = await Promise.all([
        rentalService.getRentals(property_id, filters),
        rentalService.getKPIs(property_id),
      ])
      setRentals(data)
      setKpis(k)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar contratos')
    } finally {
      setLoading(false)
    }
  }, [property_id, filterEstado])

  useEffect(() => { load() }, [load])

  const filtered = rentals.filter(r => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      r.cliente_nombre.toLowerCase().includes(q) ||
      r.cliente_email.toLowerCase().includes(q) ||
      (r.unidad_nombre ?? '').toLowerCase().includes(q) ||
      (r.numero_contrato ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Contratos de alquiler</h1>
            <p className="mt-1 text-sm text-slate-400">Media y larga estancia · Solicitudes y contratos activos</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={14} />
            Nueva solicitud manual
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Solicitudes pendientes', value: kpis.solicitudes, color: 'text-blue-300', bg: 'bg-blue-500/10', icon: <FileText size={15} /> },
          { label: 'En revisión',            value: kpis.pendientesRevision, color: 'text-amber-300', bg: 'bg-amber-500/10', icon: <RefreshCw size={15} /> },
          { label: 'Contratos activos',       value: kpis.activos, color: 'text-emerald-300', bg: 'bg-emerald-500/10', icon: <Users size={15} /> },
        ].map(k => (
          <div key={k.label} className="rounded-2xl border border-sidebar-border bg-sidebar-bg p-5">
            <div className={`mb-2 w-fit rounded-xl p-2 ${k.bg} ${k.color}`}>{k.icon}</div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className="mt-0.5 text-3xl font-bold text-white">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sidebar-border bg-sidebar-bg p-4">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar inquilino, unidad, contrato…"
            className="w-full rounded-xl border border-sidebar-border bg-admin-card py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-400 focus:outline-none"
          />
        </div>
        <div className="flex overflow-hidden rounded-xl border border-sidebar-border">
          {ESTADOS_FILTRO.map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setFilterEstado(v)}
              className={`border-r border-sidebar-border px-3 py-2.5 text-xs font-medium last:border-r-0 transition-colors ${
                filterEstado === v ? 'bg-brand-600 text-white' : 'bg-admin-card text-slate-400 hover:bg-sidebar-hover'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl border border-sidebar-border bg-admin-card p-2.5 text-slate-400 hover:bg-sidebar-hover disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
            <FileText size={24} />
            <p className="text-sm">No hay contratos que coincidan con los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sidebar-border bg-admin-card/70">
                  {['Inquilino', 'Unidad', 'Inicio', 'Fin', 'Precio/mes', 'Fianza', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-sidebar-border">
                {filtered.map(r => (
                  <tr key={r.id} className="transition-colors hover:bg-sidebar-hover/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{r.cliente_nombre}</p>
                      <p className="text-xs text-slate-500">{r.cliente_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.unidad_nombre ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmtDate(r.fecha_inicio)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{fmtDate(r.fecha_fin)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">{fmtEur(r.precio_mensual)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                      {r.fianza > 0 ? (
                        <span className={`text-xs ${r.fianza_cobrada ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {fmtEur(r.fianza)} · {r.fianza_cobrada ? 'Cobrada' : 'Pendiente'}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${RENTAL_ESTADO_CLS[r.estado]}`}>
                        {RENTAL_ESTADO_LABEL[r.estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/rentals/${r.id}`}
                        className="flex items-center gap-1 rounded-lg border border-sidebar-border bg-admin-card px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-sidebar-hover"
                      >
                        Ver <ChevronRight size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRentalModal
          propertyId={property_id}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}

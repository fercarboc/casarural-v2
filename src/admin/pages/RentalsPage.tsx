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
  Banknote,
  X,
  CheckCircle2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAdminTenant } from '../context/AdminTenantContext'
import {
  rentalService,
  type Rental,
  type RentalEstado,
  type RentalFilters,
  type RentalFianza,
  type FianzaEstado,
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

const FIANZA_ESTADO_LABEL: Record<FianzaEstado, string> = {
  SIN_FIANZA:           'Sin fianza',
  ACTIVA:               'Activa',
  PENDIENTE_DEVOLUCION: 'Pdte. devolución',
  DEVUELTA:             'Devuelta',
  DEVUELTA_PARCIAL:     'Devuelta parcial',
}

const FIANZA_ESTADO_CLS: Record<FianzaEstado, string> = {
  SIN_FIANZA:           'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  ACTIVA:               'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
  PENDIENTE_DEVOLUCION: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  DEVUELTA:             'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  DEVUELTA_PARCIAL:     'bg-violet-500/10 text-violet-300 border border-violet-500/20',
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

  // Fianzas
  const [fianzas, setFianzas] = useState<RentalFianza[]>([])
  const [pendientesFianza, setPendientesFianza] = useState(0)
  const [showFianzas, setShowFianzas] = useState(false)
  const [devolucionTarget, setDevolucionTarget] = useState<RentalFianza | null>(null)
  const [devForm, setDevForm] = useState({ importe: '', descuento: '', concepto: '', notas: '' })
  const [savingDev, setSavingDev] = useState(false)
  const [devError, setDevError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters: RentalFilters = {}
      if (filterEstado !== 'TODAS') filters.estado = filterEstado
      const [data, k, allFianzas] = await Promise.all([
        rentalService.getRentals(property_id, filters),
        rentalService.getKPIs(property_id),
        rentalService.getFianzas(property_id),
      ])
      setRentals(data)
      setKpis(k)
      setFianzas(allFianzas)
      setPendientesFianza(allFianzas.filter(f => f.fianza_estado === 'PENDIENTE_DEVOLUCION').length)
    } catch (e: any) {
      setError(e.message ?? 'Error al cargar contratos')
    } finally {
      setLoading(false)
    }
  }, [property_id, filterEstado])

  function openDevolucion(f: RentalFianza) {
    setDevolucionTarget(f)
    setDevForm({ importe: String(f.fianza), descuento: '0', concepto: '', notas: '' })
    setDevError('')
  }

  async function handleDevolucion() {
    if (!devolucionTarget) return
    const imp = parseFloat(devForm.importe)
    const desc = parseFloat(devForm.descuento) || 0
    if (isNaN(imp) || imp <= 0) { setDevError('Importe inválido'); return }
    setSavingDev(true)
    setDevError('')
    try {
      await rentalService.procesarDevolucionFianza(
        devolucionTarget.id, imp, desc, devForm.concepto, devForm.notas,
      )
      setDevolucionTarget(null)
      load()
    } catch (e: any) {
      setDevError(e.message ?? 'Error al procesar devolución')
    } finally {
      setSavingDev(false)
    }
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFianzas(true)}
              className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
            >
              <Banknote size={14} />
              Ver fianzas
              {pendientesFianza > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {pendientesFianza}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
            >
              <Plus size={14} />
              Nueva solicitud manual
            </button>
          </div>
        </div>
      </header>

      {/* Alerta fianzas pendientes */}
      {pendientesFianza > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <Banknote size={16} className="shrink-0 text-amber-300" />
            <p className="text-sm text-amber-200">
              <span className="font-bold">{pendientesFianza} {pendientesFianza === 1 ? 'fianza pendiente' : 'fianzas pendientes'} de devolución</span>
              {' '}— contratos cancelados con depósito retenido
            </p>
          </div>
          <button
            onClick={() => setShowFianzas(true)}
            className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
          >
            Gestionar
          </button>
        </div>
      )}

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

      {/* Modal: Fianzas */}
      {showFianzas && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-10 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl border border-sidebar-border bg-[#0f1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-white">Fianzas</h2>
                <p className="mt-0.5 text-xs text-slate-400">Depósitos de garantía de todos los contratos</p>
              </div>
              <button onClick={() => setShowFianzas(false)} className="rounded-xl p-2 text-slate-400 hover:bg-sidebar-hover hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              {fianzas.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-500">No hay contratos con fianza registrada.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sidebar-border bg-admin-card/70">
                      {['Inquilino', 'Unidad', 'Contrato', 'Fianza', 'Estado fianza', 'Acción'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sidebar-border">
                    {fianzas.map(f => (
                      <tr key={f.id} className="hover:bg-sidebar-hover/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-100">{f.cliente_nombre}</p>
                          <p className="text-xs text-slate-500">{f.cliente_email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{f.unidad_nombre ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${RENTAL_ESTADO_CLS[f.estado]}`}>
                            {RENTAL_ESTADO_LABEL[f.estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">{fmtEur(f.fianza)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${FIANZA_ESTADO_CLS[f.fianza_estado]}`}>
                            {FIANZA_ESTADO_LABEL[f.fianza_estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(f.fianza_estado === 'PENDIENTE_DEVOLUCION' || f.fianza_estado === 'ACTIVA') && (
                            <button
                              onClick={() => { openDevolucion(f); setShowFianzas(false) }}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
                            >
                              Devolver
                            </button>
                          )}
                          {(f.fianza_estado === 'DEVUELTA' || f.fianza_estado === 'DEVUELTA_PARCIAL') && (
                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                              <CheckCircle2 size={12} /> Devuelta
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-sidebar-border px-6 py-4 text-right">
              <button onClick={() => setShowFianzas(false)} className="rounded-xl border border-sidebar-border bg-admin-card px-5 py-2.5 text-sm text-slate-300 hover:bg-sidebar-hover">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Devolución de fianza */}
      {devolucionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-sidebar-border bg-[#0f1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-white">Devolución de fianza</h2>
                <p className="mt-0.5 text-xs text-slate-400">{devolucionTarget.cliente_nombre} · {devolucionTarget.unidad_nombre}</p>
              </div>
              <button onClick={() => setDevolucionTarget(null)} className="rounded-xl p-2 text-slate-400 hover:bg-sidebar-hover hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-sidebar-border bg-admin-card p-4 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Fianza original</span>
                  <span className="font-semibold text-white">{fmtEur(devolucionTarget.fianza)}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Importe a devolver (€)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={devForm.importe}
                  onChange={e => setDevForm(p => ({ ...p, importe: e.target.value }))}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-white focus:border-brand-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Descuento aplicado (€) — 0 si devolución total</label>
                <input
                  type="number" min="0" step="0.01"
                  value={devForm.descuento}
                  onChange={e => setDevForm(p => ({ ...p, descuento: e.target.value }))}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-white focus:border-brand-400 focus:outline-none"
                />
              </div>
              {parseFloat(devForm.descuento) > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Concepto del descuento</label>
                  <input
                    type="text"
                    value={devForm.concepto}
                    onChange={e => setDevForm(p => ({ ...p, concepto: e.target.value }))}
                    placeholder="Ej: Daños en pintura, limpieza extra…"
                    className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Notas internas</label>
                <textarea
                  rows={2}
                  value={devForm.notas}
                  onChange={e => setDevForm(p => ({ ...p, notas: e.target.value }))}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
                />
              </div>
              {devError && (
                <p className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  <AlertCircle size={12} /> {devError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-sidebar-border px-6 py-4">
              <button onClick={() => setDevolucionTarget(null)} className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm text-slate-300 hover:bg-sidebar-hover">
                Cancelar
              </button>
              <button
                onClick={handleDevolucion}
                disabled={savingDev}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-40"
              >
                {savingDev ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirmar devolución
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

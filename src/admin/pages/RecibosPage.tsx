import React, { useState, useEffect, useCallback } from 'react'
import {
  Receipt, Plus, Loader2, Search, CheckCircle2, XCircle,
  FileText, RotateCcw, ChevronDown, AlertCircle,
} from 'lucide-react'
import { useAdminTenant } from '../context/AdminTenantContext'
import {
  reciboService,
  type Recibo,
  type TipoRecibo,
  type EstadoRecibo,
  type CreateReciboParams,
} from '../../services/recibo.service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtEur(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<EstadoRecibo, string> = {
  PENDIENTE: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  PAGADO:    'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  ACTIVA:    'bg-blue-500/10 text-blue-300 border-blue-500/20',
  DEVUELTA:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  ANULADO:   'bg-red-500/10 text-red-300 border-red-500/20',
}

const TIPO_LABELS: Record<TipoRecibo, string> = {
  RESERVA:     'Reserva',
  FIANZA:      'Fianza',
  PAGO_MENSUAL:'Mensualidad',
  OTRO:        'Otro',
}

const TIPO_STYLES: Record<TipoRecibo, string> = {
  RESERVA:     'bg-brand-600/10 text-brand-400',
  FIANZA:      'bg-violet-500/10 text-violet-300',
  PAGO_MENSUAL:'bg-teal-500/10 text-teal-300',
  OTRO:        'bg-slate-500/10 text-slate-400',
}

// ─── Crear Recibo Modal ────────────────────────────────────────────────────────

function CrearReciboModal({
  propertyId,
  onClose,
  onCreated,
}: {
  propertyId: string
  onClose: () => void
  onCreated: (r: Recibo) => void
}) {
  const [tipo, setTipo]             = useState<TipoRecibo>('RESERVA')
  const [nombre, setNombre]         = useState('')
  const [nif, setNif]               = useState('')
  const [concepto, setConcepto]     = useState('')
  const [importe, setImporte]       = useState('')
  const [fecha, setFecha]           = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const total = parseFloat(importe.replace(',', '.'))
    if (!nombre.trim() || !concepto.trim() || isNaN(total) || total <= 0) {
      setError('Nombre, concepto e importe son obligatorios')
      return
    }
    setLoading(true)
    setError('')
    try {
      const params: CreateReciboParams = {
        propertyId,
        tipo,
        nombreCliente:  nombre.trim(),
        nifCliente:     nif.trim() || null,
        concepto:       concepto.trim(),
        total,
        fechaEmision:   fecha,
        notas:          notas.trim() || null,
        puedeFacturarse: tipo !== 'FIANZA',
      }
      const recibo = await reciboService.createRecibo(params)
      onCreated(recibo)
    } catch (e: any) {
      setError(e.message ?? 'Error creando recibo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-brand-400" />
            <h2 className="text-lg font-bold text-white">Nuevo recibo</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
            <XCircle size={18} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as TipoRecibo)}
                className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
              >
                <option value="RESERVA">Reserva</option>
                <option value="FIANZA">Fianza (no facturable)</option>
                <option value="PAGO_MENSUAL">Mensualidad alquiler</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Nombre cliente *</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Nombre y apellidos o razón social"
              required
              className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">NIF/DNI</label>
            <input
              type="text"
              value={nif}
              onChange={e => setNif(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Concepto *</label>
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              placeholder="Descripción del cobro"
              required
              className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Importe total (con IVA 10%) *</label>
            <input
              type="text"
              value={importe}
              onChange={e => setImporte(e.target.value)}
              placeholder="0,00"
              required
              className="w-full rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-sidebar-border bg-admin-bg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
            />
          </div>

          {tipo === 'FIANZA' && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-300">
              Las fianzas no se convierten en factura. Su estado pasa de <strong>Activa</strong> a <strong>Devuelta</strong> cuando se reintegra al cliente.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Crear recibo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Fila de recibo ───────────────────────────────────────────────────────────

function ReciboRow({
  recibo,
  propertyId,
  onUpdated,
}: {
  recibo: Recibo
  propertyId: string
  onUpdated: () => void
}) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [converting, setConverting]   = useState(false)
  const [actioning, setActioning]     = useState(false)

  async function handleConvertir() {
    if (!confirm(`¿Convertir ${recibo.numero_recibo} en factura VeriFactu?`)) return
    setConverting(true)
    setMenuOpen(false)
    try {
      const result = await reciboService.convertirAFactura(recibo.id, propertyId)
      alert(`✅ Factura ${result.factura.numero_factura} creada con hash VeriFactu.`)
      onUpdated()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setConverting(false)
    }
  }

  async function handleEstado(estado: EstadoRecibo) {
    setActioning(true)
    setMenuOpen(false)
    try {
      await reciboService.updateEstado(recibo.id, estado)
      onUpdated()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setActioning(false)
    }
  }

  const isFianza = recibo.tipo === 'FIANZA'
  const isAnulado = recibo.estado === 'ANULADO'
  const yaFacturado = !!recibo.factura_id

  return (
    <tr className="border-b border-sidebar-border hover:bg-sidebar-hover/30 transition-colors">
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white">{recibo.numero_recibo}</span>
          {yaFacturado && (
            <span title="Ya tiene factura" className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
              FAC
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIPO_STYLES[recibo.tipo]}`}>
          {TIPO_LABELS[recibo.tipo]}
        </span>
      </td>
      <td className="max-w-[180px] truncate px-4 py-3.5 text-sm text-slate-300">
        {recibo.nombre_cliente}
        {recibo.nif_cliente && <span className="ml-1 text-[10px] text-slate-500">{recibo.nif_cliente}</span>}
      </td>
      <td className="px-4 py-3.5 text-sm text-slate-400">{fmtDate(recibo.fecha_emision)}</td>
      <td className="px-4 py-3.5 text-sm font-semibold text-white">{fmtEur(recibo.total)}</td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ESTADO_STYLES[recibo.estado]}`}>
          {recibo.estado}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="relative flex justify-end">
          <button
            onClick={() => setMenuOpen(p => !p)}
            disabled={isAnulado || actioning || converting}
            className="flex items-center gap-1 rounded-xl border border-sidebar-border px-2.5 py-1.5 text-xs text-slate-300 hover:bg-sidebar-hover disabled:opacity-40"
          >
            {(actioning || converting) ? <Loader2 size={12} className="animate-spin" /> : <ChevronDown size={12} />}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-50 bottom-full mb-1 w-52 rounded-xl border border-sidebar-border bg-sidebar-bg py-1 shadow-xl">
                {/* Marcar pagado / pendiente */}
                {!isFianza && recibo.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => handleEstado('PAGADO')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-sidebar-hover"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Marcar como pagado
                  </button>
                )}
                {!isFianza && recibo.estado === 'PAGADO' && !yaFacturado && (
                  <button
                    onClick={() => handleEstado('PENDIENTE')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-sidebar-hover"
                  >
                    <RotateCcw size={14} className="text-slate-400" />
                    Marcar como pendiente
                  </button>
                )}

                {/* Fianza: activa ↔ devuelta */}
                {isFianza && recibo.estado === 'ACTIVA' && (
                  <button
                    onClick={() => handleEstado('DEVUELTA')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-violet-300 hover:bg-violet-500/10"
                  >
                    <RotateCcw size={14} />
                    Marcar fianza devuelta
                  </button>
                )}
                {isFianza && recibo.estado === 'DEVUELTA' && (
                  <button
                    onClick={() => handleEstado('ACTIVA')}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-sidebar-hover"
                  >
                    <RotateCcw size={14} />
                    Reactivar fianza
                  </button>
                )}

                {/* Convertir a factura */}
                {recibo.puede_facturarse && !yaFacturado && recibo.estado !== 'ANULADO' && (
                  <>
                    <div className="my-1 border-t border-sidebar-border" />
                    <button
                      onClick={handleConvertir}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-brand-400 hover:bg-brand-600/10"
                    >
                      <FileText size={14} />
                      Convertir a factura VeriFactu
                    </button>
                  </>
                )}

                {/* Anular */}
                {!yaFacturado && (
                  <>
                    <div className="my-1 border-t border-sidebar-border" />
                    <button
                      onClick={() => handleEstado('ANULADO')}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      <XCircle size={14} />
                      Anular recibo
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TABS: { id: string; label: string; tipo?: TipoRecibo }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'RESERVA', label: 'Reservas', tipo: 'RESERVA' },
  { id: 'FIANZA', label: 'Fianzas', tipo: 'FIANZA' },
  { id: 'PAGO_MENSUAL', label: 'Mensualidades', tipo: 'PAGO_MENSUAL' },
  { id: 'OTRO', label: 'Otros', tipo: 'OTRO' },
]

export function RecibosPage() {
  const { property_id } = useAdminTenant()

  const [recibos, setRecibos]           = useState<Recibo[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeTab, setActiveTab]       = useState('TODOS')
  const [showModal, setShowModal]       = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await reciboService.getRecibos(property_id)
      setRecibos(data)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [property_id])

  useEffect(() => { load() }, [load])

  const filtered = recibos.filter(r => {
    const tipoOk = activeTab === 'TODOS' || r.tipo === activeTab
    const searchOk = !search ||
      r.nombre_cliente.toLowerCase().includes(search.toLowerCase()) ||
      r.numero_recibo.toLowerCase().includes(search.toLowerCase()) ||
      r.concepto.toLowerCase().includes(search.toLowerCase())
    return tipoOk && searchOk
  })

  // Totales rápidos
  const totalPendiente = recibos.filter(r => r.estado === 'PENDIENTE' && r.tipo !== 'FIANZA')
    .reduce((s, r) => s + r.total, 0)
  const totalPagado = recibos.filter(r => r.estado === 'PAGADO')
    .reduce((s, r) => s + r.total, 0)
  const totalFianzas = recibos.filter(r => r.tipo === 'FIANZA' && r.estado === 'ACTIVA')
    .reduce((s, r) => s + r.total, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/15">
            <Receipt size={20} className="text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Recibos</h1>
            <p className="text-sm text-slate-500">Documentos previos a factura · fianzas · mensualidades</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus size={14} />
          Nuevo recibo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-sidebar-border bg-admin-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Pendiente cobro</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{fmtEur(totalPendiente)}</p>
        </div>
        <div className="rounded-2xl border border-sidebar-border bg-admin-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Cobrado (sin facturar)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{fmtEur(totalPagado)}</p>
        </div>
        <div className="rounded-2xl border border-sidebar-border bg-admin-card p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest">Fianzas activas</p>
          <p className="mt-1 text-2xl font-bold text-violet-400">{fmtEur(totalFianzas)}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-sidebar-border bg-admin-card">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <div className="flex items-center gap-1.5 rounded-xl border border-sidebar-border bg-sidebar-bg px-3 py-2 flex-1 min-w-[200px]">
            <Search size={13} className="shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar recibo…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-400 hover:bg-sidebar-hover hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <Receipt size={28} className="text-slate-600" />
            <p className="text-sm text-slate-500">
              {recibos.length === 0
                ? 'Aún no hay recibos. Crea el primero con "+ Nuevo recibo".'
                : 'No hay recibos que coincidan con el filtro.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-sidebar-border bg-admin-card/70">
                <tr>
                  {['Número', 'Tipo', 'Cliente', 'Fecha', 'Importe', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <ReciboRow
                    key={r.id}
                    recibo={r}
                    propertyId={property_id}
                    onUpdated={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CrearReciboModal
          propertyId={property_id}
          onClose={() => setShowModal(false)}
          onCreated={(r) => { setRecibos(prev => [r, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

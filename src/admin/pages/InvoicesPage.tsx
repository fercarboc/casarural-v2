import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Download,
  Search,
  Plus,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ChevronDown,
  AlertCircle,
  Printer,
  CreditCard,
  Banknote,
  CheckCheck,
  RotateCcw,
  Building2,
  Lock,
} from 'lucide-react'
import {
  invoiceService,
  crearFacturaManual,
  registrarCobroManual,
  generarStripeCheckoutResto,
  FacturaDetalle,
  ReservaParaFactura,
} from '../../services/invoice.service'
import { descargarFacturaPDF, imprimirFactura } from '../components/FacturaPDF'
import { EmitirRectificativaModal } from '../components/EmitirRectificativaModal'
import { AEATModal } from '../components/AEATModal'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtEur(n: number) {
  return (
    n.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

// ─── status badge ─────────────────────────────────────────────────────────────

const ESTADO_STYLES: Record<string, string> = {
  EMITIDA:     'bg-blue-500/10 text-blue-300 border-blue-500/20',
  ENVIADA:     'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  ANULADA:     'bg-red-500/10 text-red-300 border-red-500/20',
  RECTIFICADA: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
}

const ESTADO_LABELS: Record<string, string> = {
  EMITIDA:     'Emitida',
  ENVIADA:     'Enviada',
  ANULADA:     'Anulada',
  RECTIFICADA: 'Rectificada',
}

const AEAT_STYLES: Record<string, string> = {
  PENDIENTE: 'bg-slate-500/10 text-slate-400',
  PREPARADA: 'bg-violet-500/10 text-violet-300',
  ENVIADA:   'bg-emerald-500/10 text-emerald-300',
  ERROR:     'bg-red-500/10 text-red-300',
  NO_APLICA: 'bg-slate-500/5 text-slate-600',
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ESTADO_STYLES[estado] ?? 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  )
}

// ─── create modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreated: (f: FacturaDetalle) => void
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [reservas, setReservas] = useState<ReservaParaFactura[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ReservaParaFactura | null>(null)
  const [nombre, setNombre] = useState('')
  const [nif, setNif] = useState('')
  const [direccion, setDireccion] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    invoiceService
      .getConfirmedReservasWithoutFactura()
      .then(setReservas)
      .catch(() => setError('No se pudieron cargar las reservas'))
      .finally(() => setLoading(false))
  }, [])

  function selectReserva(r: ReservaParaFactura) {
    setSelected(r)
    setNombre(r.razon_social || `${r.nombre_cliente ?? r.nombre ?? ''} ${r.apellidos_cliente ?? r.apellidos ?? ''}`.trim())
    setNif(r.nif_factura ?? '')
    setDireccion(r.direccion_factura ?? '')
  }

  async function handleCreate() {
    if (!selected) return
    setCreating(true)
    setError('')
    try {
      const f = await invoiceService.createFactura(selected.id, {
        nombre: nombre || undefined,
        nif: nif || null,
        direccion: direccion || null,
      })
      onCreated(f)
    } catch (e: any) {
      setError(e.message ?? 'Error al crear la factura')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <h2 className="text-lg font-bold text-white">Nueva factura</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Reserva confirmada
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Cargando...
              </div>
            ) : reservas.length === 0 ? (
              <p className="text-sm text-slate-400">
                No hay reservas confirmadas pendientes de facturar.
              </p>
            ) : (
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-sidebar-border p-1">
                {reservas.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectReserva(r)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      selected?.id === r.id
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-200 hover:bg-sidebar-hover'
                    }`}
                  >
                    <span className="font-bold">{r.codigo}</span>
                    <span
                      className={`ml-2 ${selected?.id === r.id ? 'text-slate-200' : 'text-slate-400'}`}
                    >
                      {r.nombre_cliente ?? r.nombre} {r.apellidos_cliente ?? r.apellidos} · {fmtDate(r.fecha_entrada)} –{' '}
                      {fmtDate(r.fecha_salida)} · {fmtEur(Number(r.importe_total ?? r.total))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre / Razón social *
                </label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={modalInputCls}
                  placeholder="Nombre completo o razón social"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    NIF / DNI
                  </label>
                  <input
                    value={nif}
                    onChange={(e) => setNif(e.target.value)}
                    className={modalInputCls}
                    placeholder="12345678A"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Importe
                  </label>
                  <div className="flex h-[42px] items-center rounded-lg border border-sidebar-border bg-admin-card px-4 text-sm font-bold text-white">
                    {fmtEur(Number(selected.importe_total ?? selected.total))}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Dirección fiscal
                </label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className={modalInputCls}
                  placeholder="Calle, CP, Ciudad"
                />
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-sidebar-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!selected || !nombre.trim() || creating}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            {creating && <Loader2 size={14} className="animate-spin" />}
            Emitir factura
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── cobrar resto modal ───────────────────────────────────────────────────────

type CobrarStep = 'method' | 'manual' | 'confirm-factura' | 'stripe-sent'

interface CobrarRestoModalProps {
  reservaId: string
  reservaCodigo: string
  importePendiente: number
  onClose: () => void
  onCobrado: (result: { factura?: FacturaDetalle; pagoRegistrado: boolean }) => void
}

function CobrarRestoModal({
  reservaId,
  reservaCodigo,
  importePendiente,
  onClose,
  onCobrado,
}: CobrarRestoModalProps) {
  const [step, setStep] = useState<CobrarStep>('method')
  const [importe, setImporte] = useState(importePendiente)
  const [metodo, setMetodo] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO'>(
    'EFECTIVO'
  )
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [facturaGenerada, setFacturaGenerada] = useState<FacturaDetalle | null>(null)

  const base = Math.round((importe / 1.1) * 100) / 100
  const iva = Math.round((importe - base) * 100) / 100

  async function handleStripe() {
    setBusy(true)
    setError('')
    try {
      await generarStripeCheckoutResto(reservaId)
      setStep('stripe-sent')
    } catch (e: any) {
      setError(e.message ?? 'Error al generar el enlace de Stripe')
    } finally {
      setBusy(false)
    }
  }

  async function handleCobroManual() {
    if (importe <= 0) return
    setBusy(true)
    setError('')
    try {
      await registrarCobroManual({
        reservaId,
        importe,
        metodoPago: metodo,
        fechaPago: fecha,
        notas: notas || undefined,
      })
      setStep('confirm-factura')
    } catch (e: any) {
      setError(e.message ?? 'Error al registrar el cobro')
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerarFactura() {
    setBusy(true)
    setError('')
    try {
      const f = await crearFacturaManual({
        reservaId,
        importe,
        concepto: 'Hospedaje Casa Rural — Resto',
      })
      setFacturaGenerada(f)
      onCobrado({ factura: f, pagoRegistrado: true })
    } catch (e: any) {
      setError(e.message ?? 'Error al generar la factura')
    } finally {
      setBusy(false)
    }
  }

  const header = (title: string) => (
    <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">Reserva {reservaCodigo}</p>
      </div>
      <button onClick={onClose} className="rounded-lg p-1 hover:bg-sidebar-hover">
        <X size={18} className="text-slate-400" />
      </button>
    </div>
  )

  if (step === 'method')
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
          {header('Cobrar resto pendiente')}
          <div className="space-y-5 p-6">
            <div className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Resto pendiente
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {fmtEur(importePendiente)}
              </p>
            </div>

            <p className="text-center text-sm font-semibold text-slate-300">
              ¿Cómo se realiza el cobro?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleStripe}
                disabled={busy}
                className="flex flex-col items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-5 text-sm font-bold text-slate-200 transition-all hover:border-brand-600 hover:bg-sidebar-hover disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <CreditCard size={22} className="text-violet-400" />
                )}
                <span>Pagar por Stripe</span>
                <span className="text-[10px] font-normal text-slate-400">
                  Enlace al cliente
                </span>
              </button>

              <button
                onClick={() => setStep('manual')}
                className="flex flex-col items-center gap-2 rounded-xl border border-sidebar-border bg-admin-card px-4 py-5 text-sm font-bold text-slate-200 transition-all hover:border-brand-600 hover:bg-sidebar-hover"
              >
                <Banknote size={22} className="text-emerald-400" />
                <span>Registrar manualmente</span>
                <span className="text-[10px] font-normal text-slate-400">
                  Efectivo / Transferencia
                </span>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-sidebar-border px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )

  if (step === 'stripe-sent')
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
          {header('Enlace de pago enviado')}
          <div className="space-y-4 p-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-8 text-center">
              <CheckCheck size={32} className="text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-300">
                Enlace de pago Stripe generado
              </p>
              <p className="text-xs leading-relaxed text-emerald-200">
                Cuando el cliente complete el pago, la reserva se actualizará
                automáticamente a <strong>PAGADO</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end border-t border-sidebar-border px-6 py-4">
            <button
              onClick={() => onCobrado({ pagoRegistrado: false })}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )

  if (step === 'manual')
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
          {header('Registrar cobro manual')}
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Importe (con IVA)
              </label>
              <input
                type="number"
                value={importe}
                min={0}
                step={0.01}
                onChange={(e) => setImporte(Number(e.target.value))}
                className={modalInputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Método
                </label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value as typeof metodo)}
                  className={modalInputCls}
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fecha de cobro
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className={modalInputCls}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Notas (opcional)
              </label>
              <input
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Cobrado a la llegada"
                className={modalInputCls}
              />
            </div>

            <div className="space-y-1 rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Base imponible</span>
                <span>{fmtEur(base)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IVA 10%</span>
                <span>{fmtEur(iva)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-sidebar-border pt-1 font-bold text-white">
                <span>Total</span>
                <span>{fmtEur(importe)}</span>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-between border-t border-sidebar-border px-6 py-4">
            <button
              onClick={() => setStep('method')}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
            >
              ← Volver
            </button>
            <button
              onClick={handleCobroManual}
              disabled={busy || importe <= 0}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Registrar cobro →
            </button>
          </div>
        </div>
      </div>
    )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        {header('Cobro registrado')}
        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <CheckCheck size={18} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-bold text-emerald-300">
                Cobro de {fmtEur(importe)} registrado
              </p>
              <p className="mt-0.5 text-xs text-emerald-200">
                La reserva ha pasado a estado <strong>PAGADO</strong>.
              </p>
            </div>
          </div>

          {facturaGenerada ? (
            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
              <FileText size={18} className="mt-0.5 shrink-0 text-blue-400" />
              <p className="text-sm font-bold text-blue-300">
                Factura {facturaGenerada.numero} generada
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm font-semibold text-slate-300">
                ¿Deseas generar la factura del resto?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onCobrado({ pagoRegistrado: true })}
                  className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
                >
                  No, solo el cobro
                </button>
                <button
                  onClick={handleGenerarFactura}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FileText size={14} />
                  )}
                  Sí, generar factura
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const AÑOS = [2025, 2026, 2027, 2028]

export const InvoicesPage: React.FC = () => {
  const [facturas, setFacturas] = useState<FacturaDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('TODAS')
  const [filterMes, setFilterMes] = useState<string>('')
  const [filterAño, setFilterAño] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAEATModal, setShowAEATModal] = useState(false)
  const [rectificativaFactura, setRectificativaFactura] = useState<FacturaDetalle | null>(null)
  const [cobrarRestoParams, setCobrarRestoParams] = useState<{
    reservaId: string
    reservaCodigo: string
    importePendiente: number
  } | null>(null)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await invoiceService.getFacturas()
      setFacturas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDescargarPDF(f: FacturaDetalle) {
    setPdfLoading(f.id)
    try {
      await descargarFacturaPDF(f)
    } finally {
      setPdfLoading(null)
    }
  }

  async function handleUpdateEstado(
    id: string,
    estado: 'EMITIDA' | 'ENVIADA' | 'ANULADA'
  ) {
    await invoiceService.updateEstado(id, estado)
    setFacturas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)))
    setActionMenu(null)
  }

  const filtered = facturas.filter((f) => {
    if (filterEstado !== 'TODAS' && f.estado !== filterEstado) return false

    if (filterMes) {
      const mes = f.fecha_emision?.split('-')[1]
      if (mes !== String(filterMes).padStart(2, '0')) return false
    }

    if (filterAño) {
      const año = f.fecha_emision?.split('-')[0]
      if (año !== filterAño) return false
    }

    const q = searchTerm.toLowerCase()
    return (
      !q ||
      f.numero.toLowerCase().includes(q) ||
      f.nombre.toLowerCase().includes(q) ||
      (f.reserva_codigo ?? '').toLowerCase().includes(q)
    )
  })

  const total = facturas.reduce(
    (s, f) => s + (f.estado !== 'ANULADA' ? f.total : 0),
    0
  )
  const enviadas = facturas.filter((f) => f.estado === 'ENVIADA').length
  const emitidas = facturas.filter((f) => f.estado === 'EMITIDA').length

  return (
    <div className="space-y-8">
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(f) => {
            setFacturas((prev) => [f, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}

      {cobrarRestoParams && (
        <CobrarRestoModal
          reservaId={cobrarRestoParams.reservaId}
          reservaCodigo={cobrarRestoParams.reservaCodigo}
          importePendiente={cobrarRestoParams.importePendiente}
          onClose={() => setCobrarRestoParams(null)}
          onCobrado={({ factura }) => {
            if (factura) setFacturas((prev) => [factura, ...prev])
            setFacturas((prev) =>
              prev.map((f) =>
                f.reserva_id === cobrarRestoParams.reservaId
                  ? {
                      ...f,
                      reserva_estado_pago: 'PAID',
                      reserva_importe_pagado: f.reserva_total,
                    }
                  : f
              )
            )
            setCobrarRestoParams(null)
            load()
          }}
        />
      )}

      {rectificativaFactura && (
        <EmitirRectificativaModal
          factura={rectificativaFactura}
          onClose={() => setRectificativaFactura(null)}
          onEmitida={(rect) => {
            setFacturas((prev) => [
              rect,
              ...prev.map((f) =>
                f.id === rectificativaFactura.id ? { ...f, estado: 'RECTIFICADA' as const } : f
              ),
            ])
            setRectificativaFactura(null)
          }}
        />
      )}

      {showAEATModal && (
        <AEATModal
          onClose={() => setShowAEATModal(false)}
          onLoteCreado={(_loteId, _num) => {
            setShowAEATModal(false)
            load()
          }}
        />
      )}

      <header className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Facturas</h1>
            <p className="mt-1 text-sm text-slate-400">
              Documentos fiscales de reservas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAEATModal(true)}
              className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-300 shadow-sm transition-all hover:bg-violet-500/20"
            >
              <Building2 size={16} />
              AEAT / VeriFactu
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700"
            >
              <Plus size={18} />
              Nueva factura
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'TOTAL FACTURADO', value: fmtEur(total), sub: 'sin anuladas' },
          { label: 'EMITIDAS', value: String(emitidas), sub: 'pendientes de enviar' },
          { label: 'ENVIADAS', value: String(enviadas), sub: 'al cliente' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-3xl border border-sidebar-border bg-sidebar-bg p-5 shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-sidebar-border bg-sidebar-bg p-4 shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por número, cliente o reserva..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-sidebar-border bg-admin-card py-3 pl-10 pr-4 text-sm font-medium text-slate-100 placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <select
          value={filterMes}
          onChange={(e) => setFilterMes(e.target.value)}
          className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm font-medium text-slate-200 focus:outline-none"
        >
          <option value="">Todos los meses</option>
          {MESES.map((m, i) => (
            <option key={i + 1} value={String(i + 1)}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={filterAño}
          onChange={(e) => setFilterAño(e.target.value)}
          className="rounded-xl border border-sidebar-border bg-admin-card px-4 py-3 text-sm font-medium text-slate-200 focus:outline-none"
        >
          <option value="">Todos los años</option>
          {AÑOS.map((a) => (
            <option key={a} value={String(a)}>
              {a}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          {['TODAS', 'EMITIDA', 'ENVIADA', 'RECTIFICADA', 'ANULADA'].map((e) => (
            <button
              key={e}
              onClick={() => setFilterEstado(e)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                filterEstado === e
                  ? 'bg-brand-600 text-white'
                  : 'bg-admin-card text-slate-300 hover:bg-sidebar-hover'
              }`}
            >
              {e === 'TODAS' ? 'Todas' : ESTADO_LABELS[e]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-500">
            <FileText size={28} />
            <p className="text-sm font-medium">
              {facturas.length === 0 ? 'Aún no hay facturas emitidas' : 'Sin resultados'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sidebar-border bg-admin-card/70 [&>tr>th:first-child]:rounded-tl-3xl [&>tr>th:last-child]:rounded-tr-3xl">
              <tr>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap">
                  Número
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Cliente
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Reserva
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap">
                  Fecha emisión
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap">
                  Importe
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  AEAT
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-sidebar-border">
              {filtered.map((f) => (
                <React.Fragment key={f.id}>
                <tr
                  className={`transition-colors ${
                    f.estado === 'ANULADA' || f.estado === 'RECTIFICADA'
                      ? 'bg-slate-900/30 opacity-60'
                      : 'hover:bg-sidebar-hover/60'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setExpandedRow(expandedRow === f.id ? null : f.id)}
                      className="flex items-center gap-1.5 group"
                      title="Ver hashes de trazabilidad"
                    >
                      <ChevronDown
                        size={12}
                        className={`shrink-0 text-slate-600 transition-transform group-hover:text-slate-400 ${expandedRow === f.id ? 'rotate-180' : ''}`}
                      />
                      <p className="font-bold text-white text-xs">{f.numero}</p>
                      {f.bloqueada && (
                        <span title="Factura bloqueada (inmutable)">
                          <Lock size={11} className="shrink-0 text-slate-500" />
                        </span>
                      )}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      f.tipo_factura === 'RECTIFICATIVA'
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-blue-500/10 text-blue-300'
                    }`}>
                      {f.tipo_factura === 'RECTIFICATIVA' ? 'Rectif.' : 'Ordinaria'}
                    </span>
                  </td>

                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="font-medium text-slate-100 truncate text-xs">{f.nombre}</p>
                    {f.nif && <p className="text-[11px] text-slate-500 truncate">{f.nif}</p>}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {f.reserva_codigo ? (
                      <>
                        <p className="font-medium text-slate-100 text-xs">{f.reserva_codigo}</p>
                        <p className="text-[11px] text-slate-500">
                          {fmtDate(f.reserva_fecha_entrada)} –{' '}
                          {fmtDate(f.reserva_fecha_salida)}
                        </p>
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-400">
                    {fmtDate(f.fecha_emision)}
                  </td>

                  <td className={`px-4 py-3 whitespace-nowrap text-xs font-bold ${f.total < 0 ? 'text-red-300' : 'text-white'}`}>
                    {fmtEur(f.total)}
                  </td>

                  <td className="px-4 py-3">
                    <EstadoBadge estado={f.estado} />
                  </td>

                  <td className="px-4 py-3">
                    {f.bloqueada && f.estado_aeat !== 'NO_APLICA' ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${AEAT_STYLES[f.estado_aeat] ?? ''}`}>
                        {f.estado_aeat}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(() => {
                        if (f.reserva_estado_pago !== 'PARTIAL' || !f.reserva_id) return null
                        const tieneFacturaResto = facturas.some(
                          (other) =>
                            other.reserva_id === f.reserva_id &&
                            other.id !== f.id &&
                            (other.concepto?.toLowerCase().includes('resto') ?? false)
                        )
                        if (tieneFacturaResto) return null
                        return (
                          <button
                            onClick={() =>
                              setCobrarRestoParams({
                                reservaId: f.reserva_id!,
                                reservaCodigo: f.reserva_codigo ?? '',
                                importePendiente: Math.max(
                                  0,
                                  (f.reserva_total ?? 0) -
                                    (f.reserva_importe_senal ?? 0)
                                ),
                              })
                            }
                            title="Cobrar y facturar resto pendiente"
                            className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300 transition-colors hover:bg-amber-500/20"
                          >
                            + Resto
                          </button>
                        )
                      })()}

                      <button
                        onClick={() => handleDescargarPDF(f)}
                        disabled={pdfLoading === f.id}
                        title="Descargar PDF"
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-sidebar-hover hover:text-slate-100 disabled:opacity-50"
                      >
                        {pdfLoading === f.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>

                      <button
                        onClick={() => imprimirFactura(f)}
                        title="Imprimir"
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-sidebar-hover hover:text-slate-100"
                      >
                        <Printer size={16} />
                      </button>

                      {f.estado !== 'ANULADA' && f.estado !== 'RECTIFICADA' && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenu(actionMenu === f.id ? null : f.id)
                            }
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-sidebar-hover hover:text-slate-100"
                          >
                            <ChevronDown size={16} />
                          </button>

                          {actionMenu === f.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActionMenu(null)}
                              />
                              <div className="absolute right-0 z-50 bottom-full mb-1 w-52 rounded-xl border border-sidebar-border bg-sidebar-bg py-1 shadow-xl">
                                {!f.bloqueada && f.estado !== 'ENVIADA' && (
                                  <button
                                    onClick={() => handleUpdateEstado(f.id, 'ENVIADA')}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-sidebar-hover"
                                  >
                                    <Mail size={14} className="text-slate-500" />
                                    Marcar como enviada
                                  </button>
                                )}

                                {!f.bloqueada && f.estado !== 'EMITIDA' && (
                                  <button
                                    onClick={() => handleUpdateEstado(f.id, 'EMITIDA')}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-sidebar-hover"
                                  >
                                    <CheckCircle2 size={14} className="text-slate-500" />
                                    Marcar como emitida
                                  </button>
                                )}

                                <div className="my-1 border-t border-sidebar-border" />

                                {f.bloqueada ? (
                                  <button
                                    onClick={() => { setRectificativaFactura(f); setActionMenu(null) }}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10"
                                  >
                                    <RotateCcw size={14} />
                                    Emitir rectificativa
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateEstado(f.id, 'ANULADA')}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10"
                                  >
                                    <XCircle size={14} />
                                    Anular factura
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Fila expandible: hashes de trazabilidad */}
                {expandedRow === f.id && (
                  <tr className="bg-slate-900/60">
                    <td colSpan={9} className="px-6 py-4">
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Trazabilidad fiscal
                        </p>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {/* Nuestro hash */}
                          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                              Huella VeriFactu (nuestra)
                            </p>
                            {f.hash_actual ? (
                              <p className="break-all font-mono text-[10px] text-slate-300">
                                {f.hash_actual}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-600 italic">Sin hash (factura no bloqueada)</p>
                            )}
                            {f.hash_anterior && f.hash_anterior !== '0' && (
                              <p className="mt-1.5 text-[9px] text-slate-600">
                                Hash anterior: <span className="font-mono">{f.hash_anterior.slice(0, 16)}…</span>
                              </p>
                            )}
                          </div>

                          {/* Hash AEAT — fase 2 */}
                          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Huella AEAT / VeriFactu (respuesta)
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${AEAT_STYLES[f.estado_aeat] ?? ''}`}>
                                {f.estado_aeat}
                              </span>
                              {f.estado_aeat === 'PENDIENTE' && (
                                <span className="text-[10px] text-slate-600 italic">Pendiente de enviar a AEAT</span>
                              )}
                              {f.estado_aeat === 'PREPARADA' && (
                                <span className="text-[10px] text-violet-400 italic">Lote preparado — pendiente de envío real (Fase 2)</span>
                              )}
                            </div>
                            <p className="mt-2 text-[9px] text-slate-600 italic">
                              El hash de confirmación AEAT se añadirá aquí cuando se implemente el envío real (Fase 2).
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const modalInputCls =
  'w-full rounded-lg border border-sidebar-border bg-admin-card px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20'
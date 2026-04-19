// src/admin/components/CreateRentalModal.tsx

import React, { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { rentalService, type Rental } from '../../services/rental.service'
import { format } from 'date-fns'

interface Unidad {
  id: string
  nombre: string
  modo_operacion: string
}

interface Props {
  propertyId: string
  onClose: () => void
  onCreated: (rental: Rental) => void
}

const inp = 'w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-400 focus:outline-none'
const lbl = 'mb-1 block text-xs font-medium text-slate-400'

export const CreateRentalModal: React.FC<Props> = ({ propertyId, onClose, onCreated }) => {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    unidad_id: '',
    cliente_nombre: '',
    cliente_email: '',
    cliente_telefono: '',
    cliente_dni: '',
    fecha_inicio: format(new Date(), 'yyyy-MM-dd'),
    fecha_fin: '',
    duracion_meses: '',
    precio_mensual: '',
    fianza: '',
    forma_pago: 'TRANSFERENCIA' as Rental['forma_pago'],
    incluye_gastos: false,
    incluye_limpieza: false,
    num_ocupantes: '1',
    notas_solicitud: '',
  })

  useEffect(() => {
    supabase
      .from('unidades')
      .select('id, nombre, modo_operacion')
      .eq('property_id', propertyId)
      .eq('activa', true)
      .then(({ data }) => setUnidades(data ?? []))
  }, [propertyId])

  const set = (k: keyof typeof form, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.unidad_id) { setError('Selecciona una unidad'); return }
    if (!form.cliente_nombre.trim()) { setError('El nombre del inquilino es obligatorio'); return }
    if (!form.cliente_email.trim()) { setError('El email es obligatorio'); return }
    if (!form.fecha_inicio) { setError('La fecha de inicio es obligatoria'); return }
    if (!form.precio_mensual || isNaN(parseFloat(form.precio_mensual))) { setError('El precio mensual es obligatorio'); return }

    setSaving(true)
    setError('')
    try {
      const rental = await rentalService.createRental({
        property_id: propertyId,
        unidad_id: form.unidad_id,
        numero_contrato: null,
        cliente_nombre: form.cliente_nombre.trim(),
        cliente_email: form.cliente_email.trim(),
        cliente_telefono: form.cliente_telefono.trim() || null,
        cliente_dni: form.cliente_dni.trim() || null,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin || null,
        fecha_fin_real: null,
        duracion_meses: form.duracion_meses ? parseInt(form.duracion_meses) : null,
        precio_mensual: parseFloat(form.precio_mensual),
        fianza: form.fianza ? parseFloat(form.fianza) : 0,
        fianza_cobrada: false,
        fianza_devuelta: false,
        forma_pago: form.forma_pago,
        incluye_gastos: form.incluye_gastos,
        incluye_limpieza: form.incluye_limpieza,
        frecuencia_limpieza: null,
        num_ocupantes: parseInt(form.num_ocupantes) || 1,
        notas_solicitud: form.notas_solicitud.trim() || null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        estado: 'SOLICITUD',
        notas: null,
      })
      onCreated(rental)
    } catch (e: any) {
      setError(e.message ?? 'Error al crear el contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <h2 className="text-base font-semibold text-white">Nueva solicitud manual</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-sidebar-hover hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Unidad */}
          <div>
            <label className={lbl}>Unidad *</label>
            <select value={form.unidad_id} onChange={e => set('unidad_id', e.target.value)} className={inp}>
              <option value="">Seleccionar unidad…</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          {/* Inquilino */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Datos del inquilino</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={lbl}>Nombre completo *</label>
                <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Ana García López" className={inp} />
              </div>
              <div>
                <label className={lbl}>Email *</label>
                <input type="email" value={form.cliente_email} onChange={e => set('cliente_email', e.target.value)} placeholder="ana@ejemplo.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Teléfono</label>
                <input value={form.cliente_telefono} onChange={e => set('cliente_telefono', e.target.value)} placeholder="+34 600 000 000" className={inp} />
              </div>
              <div>
                <label className={lbl}>DNI / NIE</label>
                <input value={form.cliente_dni} onChange={e => set('cliente_dni', e.target.value)} placeholder="12345678A" className={inp} />
              </div>
            </div>
          </div>

          {/* Contrato */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Condiciones del contrato</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className={lbl}>Fecha de inicio *</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Fecha de fin</label>
                <input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Duración (meses)</label>
                <input type="number" min={1} value={form.duracion_meses} onChange={e => set('duracion_meses', e.target.value)} placeholder="6" className={inp} />
              </div>
              <div>
                <label className={lbl}>Núm. ocupantes</label>
                <input type="number" min={1} value={form.num_ocupantes} onChange={e => set('num_ocupantes', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Precio mensual (€) *</label>
                <input type="number" min={0} step={0.01} value={form.precio_mensual} onChange={e => set('precio_mensual', e.target.value)} placeholder="800.00" className={inp} />
              </div>
              <div>
                <label className={lbl}>Fianza (€)</label>
                <input type="number" min={0} step={0.01} value={form.fianza} onChange={e => set('fianza', e.target.value)} placeholder="1600.00" className={inp} />
              </div>
              <div>
                <label className={lbl}>Forma de pago</label>
                <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value as any)} className={inp}>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="SEPA">SEPA / Domiciliación</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="EFECTIVO">Efectivo</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={form.incluye_gastos} onChange={e => set('incluye_gastos', e.target.checked)} className="accent-brand-500" />
                Incluye gastos (agua, luz, gas)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={form.incluye_limpieza} onChange={e => set('incluye_limpieza', e.target.checked)} className="accent-brand-500" />
                Incluye servicio de limpieza
              </label>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className={lbl}>Notas de solicitud</label>
            <textarea
              rows={3}
              value={form.notas_solicitud}
              onChange={e => set('notas_solicitud', e.target.value)}
              placeholder="Información adicional sobre la solicitud…"
              className={`${inp} resize-none`}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-sidebar-border px-6 py-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            Crear solicitud
          </button>
        </div>
      </div>
    </div>
  )
}

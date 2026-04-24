// src/modules/cleaning/components/CreateCleaningJobModal.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Loader2, Plus, Zap } from 'lucide-react'
import { supabase } from '../../../integrations/supabase/client'
import { useAdminTenant } from '../../../admin/context/AdminTenantContext'
import { cleaningService } from '../services/cleaningService'
import { cleaningResourceService } from '../services/cleaningResourceService'
import type {
  CleaningMode,
  CleaningPriority,
  CleaningStaff,
  CleaningProvider,
} from '../types/cleaning.types'

interface Unidad { id: string; nombre: string }

interface ConflictInfo {
  hasCheckout: boolean
  hasCheckin: boolean
  checkinHora: string | null
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  onClose: () => void
  onCreated: () => void
}

export const CreateCleaningJobModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { property_id } = useAdminTenant()

  // Form
  const [unitId,       setUnitId]      = useState('')
  const [date,         setDate]        = useState(todayISO())
  const [startTime,    setStartTime]   = useState('12:00')
  const [mode,         setMode]        = useState<CleaningMode>('SHORT_STAY')
  const [priority,     setPriority]    = useState<CleaningPriority>('MEDIUM')
  const [assignType,   setAssignType]  = useState<'NONE' | 'INTERNAL' | 'EXTERNAL'>('NONE')
  const [staffId,      setStaffId]     = useState('')
  const [providerId,   setProviderId]  = useState('')
  const [notes,        setNotes]       = useState('')

  // Data
  const [unidades,   setUnidades]   = useState<Unidad[]>([])
  const [staff,      setStaff]      = useState<CleaningStaff[]>([])
  const [providers,  setProviders]  = useState<CleaningProvider[]>([])

  // Conflict check
  const [conflict,        setConflict]       = useState<ConflictInfo | null>(null)
  const [checkingConflict, setCheckingConflict] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    async function init() {
      const [{ data: us }, st, pv] = await Promise.all([
        supabase.from('unidades').select('id, nombre').eq('activa', true).order('nombre'),
        cleaningResourceService.getStaff(property_id),
        cleaningResourceService.getProviders(property_id),
      ])
      setUnidades((us ?? []) as Unidad[])
      setStaff(st)
      setProviders(pv)
    }
    init()
  }, [property_id])

  // Check same-day conflict when unit + date change
  const checkConflict = useCallback(async (uId: string, d: string) => {
    if (!uId || !d) { setConflict(null); return }
    setCheckingConflict(true)
    try {
      const { data } = await supabase
        .from('reservas')
        .select('id, fecha_entrada, fecha_salida, hora_checkin, reserva_unidades!inner(unidad_id)')
        .eq('reserva_unidades.unidad_id', uId)
        .in('estado', ['CONFIRMED', 'PENDING_PAYMENT'])
        .or(`fecha_salida.eq.${d},fecha_entrada.eq.${d}`)

      const rows = data ?? []
      const hasCheckout = rows.some((r: any) => r.fecha_salida === d)
      const checkinRow  = rows.find((r: any) => r.fecha_entrada === d)
      const hasCheckin  = !!checkinRow
      const checkinHora = (checkinRow as any)?.hora_checkin ?? null

      setConflict({ hasCheckout, hasCheckin, checkinHora })

      // Auto-set urgente si hay entrada y salida el mismo día
      if (hasCheckout && hasCheckin) {
        setPriority('URGENT')
      }
    } finally {
      setCheckingConflict(false)
    }
  }, [])

  useEffect(() => {
    checkConflict(unitId, date)
  }, [unitId, date, checkConflict])

  const isSameDayTurnover = !!(conflict?.hasCheckout && conflict?.hasCheckin)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId) { setError('Selecciona una unidad'); return }
    if (!date)   { setError('Selecciona una fecha'); return }
    setSaving(true)
    setError('')
    try {
      await cleaningService.createCleaningJob({
        property_id,
        unit_id:        unitId,
        mode,
        origin:         'MANUAL',
        scheduled_date: date,
        start_time:     startTime || null,
        priority,
        assignment_type:  assignType === 'NONE' ? null : assignType,
        assigned_user_id: assignType === 'INTERNAL' ? (staffId || null) : null,
        provider_id:      assignType === 'EXTERNAL' ? (providerId || null) : null,
        notes_internal:   notes || null,
        billable:         false,
      })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Error al crear la tarea')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-600/20 p-2 text-brand-400">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nueva tarea de limpieza</h2>
              <p className="text-xs text-slate-500">Creación manual</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-sidebar-hover hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">

            {/* Alerta urgencia mismo día */}
            {isSameDayTurnover && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <Zap
                  size={16}
                  className="mt-0.5 shrink-0 text-red-400"
                  style={{ animation: 'pulse 1s ease-in-out infinite' }}
                />
                <div>
                  <p className="text-sm font-bold text-red-300">⚡ Limpieza urgente — entrada y salida el mismo día</p>
                  <p className="mt-0.5 text-xs text-red-400/80">
                    Hay un checkout y un checkin en esta unidad el {date}.
                    {conflict?.checkinHora && ` Check-in previsto a las ${conflict.checkinHora}.`}
                    {' '}La limpieza debe completarse antes de la entrada.
                  </p>
                </div>
              </div>
            )}

            {/* Unidad + Fecha */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Unidad *</label>
                <select
                  value={unitId}
                  onChange={e => setUnitId(e.target.value)}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                  required
                >
                  <option value="">Seleccionar…</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Hora + Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Hora inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Tipo</label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value as CleaningMode)}
                  className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                >
                  <option value="SHORT_STAY">Corta estancia</option>
                  <option value="LONG_STAY">Media / Larga estancia</option>
                </select>
              </div>
            </div>

            {/* Prioridad */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Prioridad</label>
              <div className="flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as CleaningPriority[]).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      priority === p
                        ? p === 'URGENT' ? 'border-red-500/50 bg-red-500/20 text-red-300'
                          : p === 'HIGH' ? 'border-orange-500/50 bg-orange-500/20 text-orange-300'
                          : p === 'MEDIUM' ? 'border-brand-500/50 bg-brand-600/20 text-brand-300'
                          : 'border-slate-500/50 bg-slate-500/20 text-slate-300'
                        : 'border-sidebar-border bg-admin-card text-slate-500 hover:bg-sidebar-hover'
                    }`}
                  >
                    {p === 'LOW' ? 'Baja' : p === 'MEDIUM' ? 'Media' : p === 'HIGH' ? 'Alta' : 'Urgente'}
                  </button>
                ))}
              </div>
            </div>

            {/* Asignación */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Asignar a</label>
              <div className="flex gap-2">
                {[
                  { v: 'NONE',     label: 'Sin asignar' },
                  { v: 'INTERNAL', label: 'Personal propio' },
                  { v: 'EXTERNAL', label: 'Empresa limpieza' },
                ].map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setAssignType(opt.v as typeof assignType)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all ${
                      assignType === opt.v
                        ? 'border-brand-500/50 bg-brand-600/20 text-brand-300'
                        : 'border-sidebar-border bg-admin-card text-slate-500 hover:bg-sidebar-hover'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {assignType === 'INTERNAL' && (
                <select
                  value={staffId}
                  onChange={e => setStaffId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Seleccionar persona…</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.phone ? ` · ${s.phone}` : ''}</option>
                  ))}
                </select>
              )}

              {assignType === 'EXTERNAL' && (
                <select
                  value={providerId}
                  onChange={e => setProviderId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 focus:border-brand-400 focus:outline-none"
                >
                  <option value="">Seleccionar empresa…</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Notas internas</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Instrucciones especiales, observaciones…"
                className="w-full rounded-xl border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
              />
            </div>

            {checkingConflict && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 size={11} className="animate-spin" /> Verificando disponibilidad…
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
                <AlertTriangle size={13} />
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-sidebar-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-sidebar-border bg-admin-card px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-sidebar-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                isSameDayTurnover
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {isSameDayTurnover ? 'Crear tarea urgente' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// src/public/pages/SolicitudPage.tsx

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Loader2, Home, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { usePublicProperty } from '../../shared/hooks/usePublicProperty'

interface Unidad {
  id: string
  nombre: string
  tipo: string
  capacidad_maxima: number
  num_habitaciones: number | null
  num_banos: number | null
  superficie_m2: number | null
  precio_noche: number
  descripcion_corta: string | null
  foto_portada: string | null
}

interface FormData {
  // Paso 1 — Datos personales
  cliente_nombre: string
  cliente_email: string
  cliente_telefono: string
  cliente_dni: string
  // Paso 2 — Condiciones y perfil
  fecha_inicio: string
  duracion_meses: string
  num_ocupantes: string
  forma_pago: 'TRANSFERENCIA' | 'SEPA' | 'EFECTIVO'
  estado_laboral: string
  motivo_estancia: string
  mascotas: boolean
  num_mascotas: string
  tipo_mascotas: string
  descripcion_solicitud: string
  // Paso 3 — Confirmación
  notas_solicitud: string
  acepta_terminos: boolean
}

const EMPTY: FormData = {
  cliente_nombre: '',
  cliente_email: '',
  cliente_telefono: '',
  cliente_dni: '',
  fecha_inicio: '',
  duracion_meses: '',
  num_ocupantes: '1',
  forma_pago: 'TRANSFERENCIA',
  estado_laboral: '',
  motivo_estancia: '',
  mascotas: false,
  num_mascotas: '',
  tipo_mascotas: '',
  descripcion_solicitud: '',
  notas_solicitud: '',
  acepta_terminos: false,
}

const inp = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
const lbl = 'mb-1.5 block text-sm font-medium text-stone-700'

export const SolicitudPage: React.FC = () => {
  const { unidadId } = useParams<{ unidadId: string }>()
  const navigate = useNavigate()
  const { property } = usePublicProperty()

  const [unidad, setUnidad] = useState<Unidad | null>(null)
  const [loadingUnidad, setLoadingUnidad] = useState(true)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!unidadId) return
    supabase
      .from('unidades')
      .select('id, nombre, tipo, capacidad_maxima, num_habitaciones, num_banos, superficie_m2, precio_noche, descripcion_corta, foto_portada')
      .eq('id', unidadId)
      .eq('activa', true)
      .single()
      .then(({ data, error: e }: { data: Unidad | null; error: any }) => {
        if (e || !data) navigate('/', { replace: true })
        else setUnidad(data as Unidad)
        setLoadingUnidad(false)
      })
  }, [unidadId, navigate])

  const set = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }))

  const validateStep = (): string => {
    if (step === 1) {
      if (!form.cliente_nombre.trim()) return 'El nombre es obligatorio'
      if (!form.cliente_email.trim() || !form.cliente_email.includes('@')) return 'Introduce un email válido'
      if (!form.cliente_telefono.trim()) return 'El teléfono es obligatorio'
    }
    if (step === 2) {
      if (!form.fecha_inicio) return 'Indica la fecha de inicio deseada'
      if (!form.duracion_meses || parseInt(form.duracion_meses) < 1) return 'Indica la duración en meses'
    }
    if (step === 3) {
      if (!form.acepta_terminos) return 'Debes aceptar los términos y condiciones'
    }
    return ''
  }

  const next = () => {
    const msg = validateStep()
    if (msg) { setError(msg); return }
    setError('')
    setStep(s => s + 1)
  }

  const back = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    const msg = validateStep()
    if (msg) { setError(msg); return }

    setSubmitting(true)
    setError('')
    try {
      const { data: rental, error: e } = await supabase.from('rentals').insert({
        property_id: property?.id,
        unidad_id: unidadId,
        cliente_nombre: form.cliente_nombre.trim(),
        cliente_email: form.cliente_email.trim(),
        cliente_telefono: form.cliente_telefono.trim() || null,
        cliente_dni: form.cliente_dni.trim() || null,
        fecha_inicio: form.fecha_inicio,
        duracion_meses: parseInt(form.duracion_meses) || null,
        precio_mensual: 0,
        fianza: 0,
        fianza_cobrada: false,
        fianza_devuelta: false,
        forma_pago: form.forma_pago,
        incluye_gastos: false,
        incluye_limpieza: false,
        num_ocupantes: parseInt(form.num_ocupantes) || 1,
        notas_solicitud: form.notas_solicitud.trim() || null,
        estado_laboral: form.estado_laboral || null,
        motivo_estancia: form.motivo_estancia || null,
        mascotas: form.mascotas,
        num_mascotas: form.mascotas && form.num_mascotas ? parseInt(form.num_mascotas) : null,
        tipo_mascotas: form.mascotas ? form.tipo_mascotas.trim() || null : null,
        descripcion_solicitud: form.descripcion_solicitud.trim() || null,
        estado: 'SOLICITUD',
      }).select('id').single()
      if (e) throw e

      // Email confirmación al cliente
      supabase.functions.invoke('send-email', {
        body: {
          template_key: 'rental_solicitud_recibida',
          to_email: form.cliente_email.trim(),
          to_name:  form.cliente_nombre.trim(),
          property_id: property?.id,
          extra_vars: {
            guest_name:    form.cliente_nombre.trim(),
            unit_name:     unidad?.nombre ?? '',
            fecha_inicio:  form.fecha_inicio,
            property_name: property?.nombre ?? '',
            property_email: property?.email ?? '',
            property_phone: property?.telefono ?? '',
            property_address: property?.direccion ?? '',
          },
        },
      }).catch(() => {/* no crítico */})

      // Email aviso al admin
      if (property?.email) {
        supabase.functions.invoke('send-email', {
          body: {
            template_key: 'rental_nueva_solicitud',
            to_email: property.email,
            to_name:  property.nombre ?? '',
            property_id: property?.id,
            extra_vars: {
              guest_name:    form.cliente_nombre.trim(),
              tenant_email:  form.cliente_email.trim(),
              tenant_phone:  form.cliente_telefono.trim(),
              unit_name:     unidad?.nombre ?? '',
              fecha_inicio:  form.fecha_inicio,
              notas:         form.notas_solicitud.trim() || '—',
              property_name: property.nombre ?? '',
              admin_url:     `${window.location.origin}/admin/rentals/${rental?.id}`,
            },
          },
        }).catch(() => {/* no crítico */})
      }

      navigate('/solicitud/confirmacion', { replace: true })
    } catch (e: any) {
      setError(e.message ?? 'Error al enviar la solicitud. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingUnidad) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!unidad) return null

  const STEPS = ['Tus datos', 'Preferencias', 'Confirmación']

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Unit header */}
      <div className="mb-8 flex items-start gap-4">
        {unidad.foto_portada ? (
          <img src={unidad.foto_portada} alt={unidad.nombre} className="h-20 w-28 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-stone-100">
            <Home className="h-7 w-7 text-stone-400" />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Solicitud de alquiler</p>
          <h1 className="mt-0.5 text-2xl font-serif font-bold text-stone-900">{unidad.nombre}</h1>
          {unidad.descripcion_corta && (
            <p className="mt-1 text-sm text-stone-500 line-clamp-2">{unidad.descripcion_corta}</p>
          )}
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => {
          const idx = i + 1
          const done = step > idx
          const active = step === idx
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-500'
                }`}>
                  {done ? <CheckCircle2 size={14} /> : idx}
                </div>
                <span className={`hidden text-sm sm:block ${active ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-stone-200" />}
            </React.Fragment>
          )
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-stone-800">Tus datos de contacto</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Nombre completo *</label>
                <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder="Ana García López" className={inp} />
              </div>
              <div>
                <label className={lbl}>Email *</label>
                <input type="email" value={form.cliente_email} onChange={e => set('cliente_email', e.target.value)} placeholder="ana@ejemplo.com" className={inp} />
              </div>
              <div>
                <label className={lbl}>Teléfono *</label>
                <input value={form.cliente_telefono} onChange={e => set('cliente_telefono', e.target.value)} placeholder="+34 600 000 000" className={inp} />
              </div>
              <div>
                <label className={lbl}>DNI / NIE</label>
                <input value={form.cliente_dni} onChange={e => set('cliente_dni', e.target.value)} placeholder="12345678A" className={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-stone-800">Preferencias y perfil</h2>

            {/* Fechas y condiciones */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Fecha de inicio deseada *</label>
                <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Duración estimada (meses) *</label>
                <input type="number" min={1} max={36} value={form.duracion_meses} onChange={e => set('duracion_meses', e.target.value)} placeholder="6" className={inp} />
              </div>
              <div>
                <label className={lbl}>Número de ocupantes</label>
                <input type="number" min={1} max={unidad.capacidad_maxima} value={form.num_ocupantes} onChange={e => set('num_ocupantes', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Forma de pago preferida</label>
                <select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value as any)} className={inp}>
                  <option value="TRANSFERENCIA">Transferencia bancaria</option>
                  <option value="SEPA">Domiciliación SEPA</option>
                  <option value="EFECTIVO">Efectivo</option>
                </select>
              </div>
            </div>

            {/* Perfil del solicitante */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={lbl}>Situación laboral</label>
                <select value={form.estado_laboral} onChange={e => set('estado_laboral', e.target.value)} className={inp}>
                  <option value="">Seleccionar…</option>
                  <option value="EMPLEADO">Empleado/a por cuenta ajena</option>
                  <option value="AUTONOMO">Autónomo/a</option>
                  <option value="FUNCIONARIO">Funcionario/a</option>
                  <option value="JUBILADO">Jubilado/a</option>
                  <option value="ESTUDIANTE">Estudiante</option>
                  <option value="DESEMPLEADO">En búsqueda de empleo</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Motivo de la estancia</label>
                <select value={form.motivo_estancia} onChange={e => set('motivo_estancia', e.target.value)} className={inp}>
                  <option value="">Seleccionar…</option>
                  <option value="TRABAJO">Trabajo / traslado laboral</option>
                  <option value="ESTUDIOS">Estudios</option>
                  <option value="RESIDENCIA_HABITUAL">Residencia habitual</option>
                  <option value="TEMPORAL">Estancia temporal</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            {/* Mascotas */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-800">¿Tienes mascotas?</p>
                  <p className="text-xs text-stone-500 mt-0.5">El propietario valorará tu solicitud según su política</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.mascotas}
                  onClick={() => set('mascotas', !form.mascotas)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${form.mascotas ? 'bg-emerald-600' : 'bg-stone-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${form.mascotas ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              {form.mascotas && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Número de mascotas</label>
                    <input type="number" min={1} max={10} value={form.num_mascotas} onChange={e => set('num_mascotas', e.target.value)} placeholder="1" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Tipo / raza</label>
                    <input value={form.tipo_mascotas} onChange={e => set('tipo_mascotas', e.target.value)} placeholder="Ej: perro mediano, gato…" className={inp} />
                  </div>
                </div>
              )}
            </div>

            {/* Descripción libre */}
            <div>
              <label className={lbl}>Preséntate brevemente</label>
              <textarea
                rows={3}
                value={form.descripcion_solicitud}
                onChange={e => set('descripcion_solicitud', e.target.value)}
                placeholder="Cuéntanos algo sobre ti, tu ocupación y por qué te interesa este alojamiento…"
                className={`${inp} resize-none`}
              />
            </div>

            <div>
              <label className={lbl}>Notas o requisitos adicionales</label>
              <textarea
                rows={2}
                value={form.notas_solicitud}
                onChange={e => set('notas_solicitud', e.target.value)}
                placeholder="Necesidades especiales, fechas flexibles, preguntas…"
                className={`${inp} resize-none`}
              />
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-stone-800">Resumen de tu solicitud</h2>

            <div className="rounded-xl bg-stone-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-stone-500">Nombre</span><span className="font-medium text-stone-800">{form.cliente_nombre}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Email</span><span className="font-medium text-stone-800">{form.cliente_email}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Teléfono</span><span className="font-medium text-stone-800">{form.cliente_telefono}</span></div>
              <div className="border-t border-stone-200 pt-2 flex justify-between"><span className="text-stone-500">Inicio deseado</span><span className="font-medium text-stone-800">{form.fecha_inicio}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Duración</span><span className="font-medium text-stone-800">{form.duracion_meses} meses</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Ocupantes</span><span className="font-medium text-stone-800">{form.num_ocupantes}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Forma de pago</span><span className="font-medium text-stone-800">{form.forma_pago}</span></div>
              {form.estado_laboral && <div className="flex justify-between"><span className="text-stone-500">Situación laboral</span><span className="font-medium text-stone-800">{form.estado_laboral}</span></div>}
              {form.motivo_estancia && <div className="flex justify-between"><span className="text-stone-500">Motivo</span><span className="font-medium text-stone-800">{form.motivo_estancia}</span></div>}
              <div className="flex justify-between"><span className="text-stone-500">Mascotas</span><span className="font-medium text-stone-800">{form.mascotas ? `Sí${form.tipo_mascotas ? ` (${form.tipo_mascotas})` : ''}` : 'No'}</span></div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Esta es una <strong>solicitud de información</strong>, no un contrato. El propietario se pondrá en contacto contigo para confirmar disponibilidad y condiciones.
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={form.acepta_terminos}
                onChange={e => set('acepta_terminos', e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              <span>
                He leído y acepto la{' '}
                <a href="/privacidad" target="_blank" className="text-emerald-700 underline">política de privacidad</a>{' '}
                y los{' '}
                <a href="/condiciones" target="_blank" className="text-emerald-700 underline">términos y condiciones</a>.
              </span>
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        {step > 1 ? (
          <button onClick={back} className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50">
            <ChevronLeft size={15} /> Anterior
          </button>
        ) : <div />}

        {step < 3 ? (
          <button onClick={next} className="flex items-center gap-1.5 rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">
            Siguiente <ChevronRight size={15} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-emerald-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Enviar solicitud
          </button>
        )}
      </div>
    </div>
  )
}

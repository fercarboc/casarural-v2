import React, { useState, useEffect, useCallback } from 'react'
import {
  Save,
  AlertCircle,
  CheckCircle2,
  Home,
  Mail,
  Phone,
  Globe,
  MapPin,
  Shield,
  UserPlus,
  Users,
  Loader2 as UsersLoader,
  Loader2,
  ExternalLink,
  Type,
  Scale,
  ShieldCheck,
  Plus,
  Trash2,
  Clock3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../../integrations/supabase/client'
import { EmailTemplatesModal } from '../components/EmailTemplatesModal'
import { CreateUserModal } from '../components/CreateUserModal'
import { listPropertyUsers, type PropertyUser } from '../../services/users.service'
import { useAdminTenant } from '../context/AdminTenantContext'

import { KeyRound } from 'lucide-react'
import { ChangePasswordModal } from '../components/ChangePasswordModal'


interface CancellationRule {
  from_days: number
  to_days: number
  refund_pct: number
}

interface Property {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  direccion: string | null
  localidad: string | null
  provincia: string | null
  pais: string | null
  latitud: number | null
  longitud: number | null
  telefono: string | null
  email: string | null
  web: string | null
  logo_url: string | null
  activa: boolean | null
  stripe_account_id: string | null
  stripe_webhook_secret: string | null
  resend_from_email: string | null
  resend_from_name: string | null
  site_title: string | null
  site_tagline: string | null

  logo_alt: string | null
  footer_text: string | null
  meta_title: string | null
  meta_description: string | null

  legal_business_name: string | null
  legal_tax_id: string | null
  legal_address: string | null
  legal_email: string | null
  legal_phone: string | null
  legal_registry_info: string | null

  mascotas_permitidas: boolean
  suplemento_mascota: number | null
  fumar_permitido: boolean
  checkin_time: string | null
  checkout_time: string | null

  non_refundable_discount_pct: number | null
  flexible_deposit_pct: number | null
  cancellation_policy_json: CancellationRule[] | null
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const DEFAULT_CANCELLATION_RULES: CancellationRule[] = [
  { from_days: 60, to_days: 9999, refund_pct: 100 },
  { from_days: 45, to_days: 59, refund_pct: 50 },
  { from_days: 30, to_days: 44, refund_pct: 25 },
  { from_days: 0, to_days: 29, refund_pct: 0 },
]

export function ConfigPage() {
  const { property_id } = useAdminTenant()

  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [showEmailTemplates, setShowEmailTemplates] = useState(false)
  const [showCreateUser, setShowCreateUser]         = useState(false)
  const [propertyUsers, setPropertyUsers]           = useState<PropertyUser[]>([])
  const [loadingUsers, setLoadingUsers]             = useState(false)

const [showChangePassword, setShowChangePassword] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')

    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        nombre,
        slug,
        descripcion,
        direccion,
        localidad,
        provincia,
        pais,
        latitud,
        longitud,
        telefono,
        email,
        web,
        logo_url,
        activa,
        stripe_account_id,
        stripe_webhook_secret,
        resend_from_email,
        resend_from_name,
        site_title,
        site_tagline,
        logo_alt,
        footer_text,
        meta_title,
        meta_description,
        legal_business_name,
        legal_tax_id,
        legal_address,
        legal_email,
        legal_phone,
        legal_registry_info,
        mascotas_permitidas,
        suplemento_mascota,
        fumar_permitido,
        checkin_time,
        checkout_time,
        non_refundable_discount_pct,
        flexible_deposit_pct,
        cancellation_policy_json
      `)
      .eq('id', property_id)
      .single()

    if (error) {
      setErrorMsg(error.message)
      setProperty(null)
      setLoading(false)
      return
    }

    setProperty({
      ...data,
      mascotas_permitidas: !!data.mascotas_permitidas,
      fumar_permitido: !!data.fumar_permitido,
      checkin_time: data.checkin_time ?? '16:00',
      checkout_time: data.checkout_time ?? '12:00',
      cancellation_policy_json:
        Array.isArray(data.cancellation_policy_json) && data.cancellation_policy_json.length > 0
          ? data.cancellation_policy_json
          : DEFAULT_CANCELLATION_RULES,
    })

    setLoading(false)
  }, [property_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const users = await listPropertyUsers(property_id)
      setPropertyUsers(users)
    } catch {
      // silencioso — lista vacía si falla
    } finally {
      setLoadingUsers(false)
    }
  }, [property_id])

  useEffect(() => { loadUsers() }, [loadUsers])

  function upd<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateRule = (
    index: number,
    field: keyof CancellationRule,
    value: number
  ) => {
    setProperty((prev) => {
      if (!prev) return prev
      const rules = [...(prev.cancellation_policy_json ?? [])]
      rules[index] = {
        ...rules[index],
        [field]: value,
      }
      return { ...prev, cancellation_policy_json: rules }
    })
  }

  const addRule = () => {
    setProperty((prev) => {
      if (!prev) return prev
      const rules = [...(prev.cancellation_policy_json ?? [])]
      rules.push({ from_days: 0, to_days: 0, refund_pct: 0 })
      return { ...prev, cancellation_policy_json: rules }
    })
  }

  const removeRule = (index: number) => {
    setProperty((prev) => {
      if (!prev) return prev
      const rules = [...(prev.cancellation_policy_json ?? [])]
      rules.splice(index, 1)
      return { ...prev, cancellation_policy_json: rules }
    })
  }

  const handleSave = async () => {
    if (!property) return

    setStatus('saving')
    setErrorMsg('')

    const cleanedRules = (property.cancellation_policy_json ?? []).map((rule) => ({
      from_days: Number(rule.from_days) || 0,
      to_days: Number(rule.to_days) || 0,
      refund_pct: Number(rule.refund_pct) || 0,
    }))

    const { error } = await supabase
      .from('properties')
      .update({
        nombre: property.nombre,
        descripcion: property.descripcion,
        direccion: property.direccion,
        localidad: property.localidad,
        provincia: property.provincia,
        pais: property.pais,
        latitud:
          property.latitud === null ||
          property.latitud === undefined ||
          property.latitud === ('' as any)
            ? null
            : Number(property.latitud),
        longitud:
          property.longitud === null ||
          property.longitud === undefined ||
          property.longitud === ('' as any)
            ? null
            : Number(property.longitud),
        telefono: property.telefono,
        email: property.email,
        web: property.web,
        logo_url: property.logo_url,
        resend_from_email: property.resend_from_email,
        resend_from_name: property.resend_from_name,
        site_title: property.site_title,
        site_tagline: property.site_tagline,
        logo_alt: property.logo_alt,
        footer_text: property.footer_text,
        meta_title: property.meta_title,
        meta_description: property.meta_description,
        legal_business_name: property.legal_business_name,
        legal_tax_id: property.legal_tax_id,
        legal_address: property.legal_address,
        legal_email: property.legal_email,
        legal_phone: property.legal_phone,
        legal_registry_info: property.legal_registry_info,
        mascotas_permitidas: property.mascotas_permitidas,
        suplemento_mascota:
          property.suplemento_mascota === null ||
          property.suplemento_mascota === undefined ||
          property.suplemento_mascota === ('' as any)
            ? null
            : Number(property.suplemento_mascota),
        fumar_permitido: property.fumar_permitido,
        checkin_time: property.checkin_time,
        checkout_time: property.checkout_time,
        non_refundable_discount_pct:
          property.non_refundable_discount_pct === null ||
          property.non_refundable_discount_pct === undefined ||
          property.non_refundable_discount_pct === ('' as any)
            ? null
            : Number(property.non_refundable_discount_pct),
        flexible_deposit_pct:
          property.flexible_deposit_pct === null ||
          property.flexible_deposit_pct === undefined ||
          property.flexible_deposit_pct === ('' as any)
            ? null
            : Number(property.flexible_deposit_pct),
        cancellation_policy_json: cleanedRules,
        updated_at: new Date().toISOString(),
      })
      .eq('id', property.id)

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('saved')
    setTimeout(() => setStatus('idle'), 3000)
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="mr-2 animate-spin" size={20} />
        Cargando configuración…
      </div>
    )
  }

  if (!property) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
        Error cargando configuración: {errorMsg}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-6 py-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Configuración</h1>
            <p className="mt-2 text-sm text-slate-400">
              Marca pública, contacto, datos legales, políticas, normas y ubicación del mapa.
            </p>
            <div className="mt-3 inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
              slug: {property.slug}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowEmailTemplates(true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 shadow-sm transition-all hover:bg-slate-700"
            >
              <Mail size={15} />
              Plantillas email
            </button>

            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all shadow-sm',
                status === 'saved'
                  ? 'bg-emerald-600 text-white'
                  : status === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700',
                status === 'saving' ? 'opacity-80' : '',
              ].join(' ')}
            >
              {status === 'saving' && <Loader2 className="animate-spin" size={16} />}
              {status === 'saved' && <CheckCircle2 size={16} />}
              {status === 'error' && <AlertCircle size={16} />}
              {status === 'idle' && <Save size={16} />}
              {status === 'saving'
                ? 'Guardando…'
                : status === 'saved'
                ? 'Guardado'
                : status === 'error'
                ? 'Error'
                : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>

      {showEmailTemplates && property && (
        <EmailTemplatesModal
          propertyId={property.id}
          onClose={() => setShowEmailTemplates(false)}
        />
      )}

      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <DarkCard title="Marca pública / Web" icon={<Type size={16} />}>
        <Field label="Título principal de la web" hint="Visible en header, hero, footer o SEO.">
          <input
            type="text"
            value={property.site_title ?? ''}
            onChange={(e) => upd('site_title', e.target.value || null)}
            className={inputCls}
            placeholder="Ej. Casa Rural ......"
          />
        </Field>

        <Field label="Subtítulo / tagline">
          <input
            type="text"
            value={property.site_tagline ?? ''}
            onChange={(e) => upd('site_tagline', e.target.value || null)}
            className={inputCls}
            placeholder="Ej. Valles Pasiegos / Alojamientos rurales en Cantabria"
          />
        </Field>

        <Field label="Logo URL" hint="Opcional. Si existe, la web puede usar imagen en vez de texto.">
          <input
            type="text"
            value={property.logo_url ?? ''}
            onChange={(e) => upd('logo_url', e.target.value || null)}
            className={inputCls}
            placeholder="https://..."
          />
        </Field>

        <Field label="Texto alternativo del logo">
          <input
            type="text"
            value={property.logo_alt ?? ''}
            onChange={(e) => upd('logo_alt', e.target.value || null)}
            className={inputCls}
            placeholder="Logo Casa Rural"
          />
        </Field>

        <Field label="Texto de footer">
          <textarea
            rows={3}
            value={property.footer_text ?? ''}
            onChange={(e) => upd('footer_text', e.target.value || null)}
            className={inputCls}
            placeholder="Ej. Alojamientos rurales en Cantabria para escapadas en grupo y familias."
          />
        </Field>

        <Field label="Nombre base / comercial">
          <input
            type="text"
            value={property.nombre}
            onChange={(e) => upd('nombre', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Descripción general">
          <textarea
            rows={3}
            value={property.descripcion ?? ''}
            onChange={(e) => upd('descripcion', e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </DarkCard>

      <DarkCard title="SEO básico" icon={<Globe size={16} />}>
        <Field label="Meta title">
          <input
            type="text"
            value={property.meta_title ?? ''}
            onChange={(e) => upd('meta_title', e.target.value || null)}
            className={inputCls}
            placeholder="Título SEO principal"
          />
        </Field>

        <Field label="Meta description">
          <textarea
            rows={3}
            value={property.meta_description ?? ''}
            onChange={(e) => upd('meta_description', e.target.value || null)}
            className={inputCls}
            placeholder="Descripción SEO principal de la web"
          />
        </Field>
      </DarkCard>

      <DarkCard title="Dirección y mapa" icon={<MapPin size={16} />}>
        <Field label="Dirección">
          <input
            type="text"
            value={property.direccion ?? ''}
            onChange={(e) => upd('direccion', e.target.value || null)}
            className={inputCls}
            placeholder="Calle / número"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Localidad">
            <input
              type="text"
              value={property.localidad ?? ''}
              onChange={(e) => upd('localidad', e.target.value || null)}
              className={inputCls}
            />
          </Field>

          <Field label="Provincia">
            <input
              type="text"
              value={property.provincia ?? ''}
              onChange={(e) => upd('provincia', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="País">
          <input
            type="text"
            value={property.pais ?? ''}
            onChange={(e) => upd('pais', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Latitud"
            hint="Ej. 43.101006. Recomendado para ubicar bien el mapa en zonas rurales."
          >
            <input
              type="number"
              step="0.000001"
              value={property.latitud ?? ''}
              onChange={(e) =>
                upd('latitud', e.target.value === '' ? null : Number(e.target.value))
              }
              className={inputCls}
              placeholder="43.101006"
            />
          </Field>

          <Field
            label="Longitud"
            hint="Ej. -3.899326. Usa signo negativo si corresponde."
          >
            <input
              type="number"
              step="0.000001"
              value={property.longitud ?? ''}
              onChange={(e) =>
                upd('longitud', e.target.value === '' ? null : Number(e.target.value))
              }
              className={inputCls}
              placeholder="-3.899326"
            />
          </Field>
        </div>
      </DarkCard>

      <DarkCard title="Contacto" icon={<Phone size={16} />}>
        <Field label="Teléfono">
          <input
            type="tel"
            value={property.telefono ?? ''}
            onChange={(e) => upd('telefono', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={property.email ?? ''}
            onChange={(e) => upd('email', e.target.value || null)}
            className={inputCls}
          />
        </Field>

        <Field label="Web">
          <input
            type="url"
            value={property.web ?? ''}
            onChange={(e) => upd('web', e.target.value || null)}
            className={inputCls}
          />
        </Field>
      </DarkCard>

      <DarkCard title="Normas del alojamiento" icon={<ShieldCheck size={16} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Hora de check-in"
            hint="Ej. 16:00. Se mostrará en condiciones, ayuda y proceso de reserva."
          >
            <div className="relative">
              <Clock3
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="time"
                value={property.checkin_time ?? ''}
                onChange={(e) => upd('checkin_time', e.target.value || null)}
                className={`${inputCls} pl-11`}
              />
            </div>
          </Field>

          <Field
            label="Hora de check-out"
            hint="Ej. 12:00. Se mostrará en condiciones, ayuda y proceso de reserva."
          >
            <div className="relative">
              <Clock3
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="time"
                value={property.checkout_time ?? ''}
                onChange={(e) => upd('checkout_time', e.target.value || null)}
                className={`${inputCls} pl-11`}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="¿Se admiten mascotas?" hint="Por defecto debería estar desactivado.">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
              <input
                type="checkbox"
                checked={property.mascotas_permitidas}
                onChange={(e) => upd('mascotas_permitidas', e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Admitir mascotas
            </label>
          </Field>

          <Field
            label="Suplemento mascota (€)"
            hint="Déjalo vacío si no aplica. Solo tiene sentido si se admiten mascotas."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={property.suplemento_mascota ?? ''}
              onChange={(e) =>
                upd(
                  'suplemento_mascota',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="Ej. 20"
              disabled={!property.mascotas_permitidas}
            />
          </Field>
        </div>

        <Field label="¿Se permite fumar?" hint="Por defecto debería estar desactivado.">
          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
            <input
              type="checkbox"
              checked={property.fumar_permitido}
              onChange={(e) => upd('fumar_permitido', e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Permitir fumar
          </label>
        </Field>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Vista previa rápida</p>
          <ul className="mt-3 space-y-2">
            <li>
              Check-in:{' '}
              <strong className="text-white">
                {property.checkin_time || 'No definido'}
              </strong>
            </li>
            <li>
              Check-out:{' '}
              <strong className="text-white">
                {property.checkout_time || 'No definido'}
              </strong>
            </li>
            <li>
              Mascotas:{' '}
              <strong className="text-white">
                {property.mascotas_permitidas ? 'Sí' : 'No'}
              </strong>
              {property.mascotas_permitidas && property.suplemento_mascota !== null
                ? ` · suplemento ${property.suplemento_mascota} €`
                : ''}
            </li>
            <li>
              Fumar:{' '}
              <strong className="text-white">
                {property.fumar_permitido ? 'Sí' : 'No'}
              </strong>
            </li>
          </ul>
        </div>
      </DarkCard>

      <DarkCard title="Datos legales" icon={<Scale size={16} />}>
        <Field label="Nombre fiscal / razón social">
          <input
            type="text"
            value={property.legal_business_name ?? ''}
            onChange={(e) => upd('legal_business_name', e.target.value || null)}
            className={inputCls}
            placeholder="Nombre fiscal o razón social"
          />
        </Field>

        <Field label="DNI / CIF / NIF">
          <input
            type="text"
            value={property.legal_tax_id ?? ''}
            onChange={(e) => upd('legal_tax_id', e.target.value || null)}
            className={inputCls}
            placeholder="B12345678 / 12345678A"
          />
        </Field>

        <Field label="Dirección legal">
          <textarea
            rows={2}
            value={property.legal_address ?? ''}
            onChange={(e) => upd('legal_address', e.target.value || null)}
            className={inputCls}
            placeholder="Dirección completa legal/fiscal"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Email legal">
            <input
              type="email"
              value={property.legal_email ?? ''}
              onChange={(e) => upd('legal_email', e.target.value || null)}
              className={inputCls}
            />
          </Field>

          <Field label="Teléfono legal">
            <input
              type="text"
              value={property.legal_phone ?? ''}
              onChange={(e) => upd('legal_phone', e.target.value || null)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Nº de Registro Alojamiento / Licencia turística">
          <textarea
            rows={3}
            value={property.legal_registry_info ?? ''}
            onChange={(e) => upd('legal_registry_info', e.target.value || null)}
            className={inputCls}
            placeholder="Ej. Nº registro turismo / licencia / código autonómico"
          />
        </Field>
      </DarkCard>

      <DarkCard title="Email transaccional (Resend)" icon={<Mail size={16} />}>
        <Field label="Nombre del remitente">
          <input
            type="text"
            value={property.resend_from_name ?? ''}
            onChange={(e) => upd('resend_from_name', e.target.value || null)}
            className={inputCls}
            placeholder="Casa Rural xxx"
          />
        </Field>

        <Field label="Email del remitente">
          <input
            type="email"
            value={property.resend_from_email ?? ''}
            onChange={(e) => upd('resend_from_email', e.target.value || null)}
            className={inputCls}
            placeholder="noreply@tudominio.com"
          />
        </Field>
      </DarkCard>

      <DarkCard title="Política de cancelación" icon={<ShieldCheck size={16} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Descuento tarifa no reembolsable (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={property.non_refundable_discount_pct ?? ''}
              onChange={(e) =>
                upd(
                  'non_refundable_discount_pct',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="10"
            />
          </Field>

          <Field label="Señal tarifa flexible (%)">
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={property.flexible_deposit_pct ?? ''}
              onChange={(e) =>
                upd(
                  'flexible_deposit_pct',
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
              className={inputCls}
              placeholder="30"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Tramos de reembolso</p>
              <p className="text-xs text-slate-400">
                Define los días previos a la llegada y el porcentaje reembolsable.
              </p>
            </div>

            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              <Plus size={14} />
              Añadir tramo
            </button>
          </div>

          <div className="space-y-3">
            {(property.cancellation_policy_json ?? []).map((rule, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Field label="Desde días">
                  <input
                    type="number"
                    value={rule.from_days}
                    onChange={(e) =>
                      updateRule(index, 'from_days', Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>

                <Field label="Hasta días">
                  <input
                    type="number"
                    value={rule.to_days}
                    onChange={(e) =>
                      updateRule(index, 'to_days', Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>

                <Field label="% reembolso">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rule.refund_pct}
                    onChange={(e) =>
                      updateRule(index, 'refund_pct', Number(e.target.value))
                    }
                    className={inputCls}
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="inline-flex h-[46px] items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 text-red-300 transition hover:bg-red-500/20"
                    aria-label="Eliminar tramo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DarkCard>

      <div className="rounded-3xl border border-sidebar-border bg-sidebar-bg px-5 py-5">
        <div className="flex items-start gap-4">
          <Home size={18} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Precios, temporadas y capacidad</p>
            <p className="mt-1 text-sm text-slate-400">
              Los precios por noche, temporadas, limpieza, noches mínimas y capacidad de cada unidad se gestionan en la sección de unidades.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              La capacidad total del conjunto se calcula sumando la capacidad base y máxima de todas las unidades activas.
            </p>
          </div>

          <Link
            to="/admin/unidades"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
          >
            Ir a Unidades
            <ExternalLink size={12} />
          </Link>
        </div>
      </div>

      {/* ── Seguridad ── */}
      <DarkCard title="Seguridad" icon={<Shield size={16} />}>
        
        <div className="flex items-center justify-between">
  <p className="text-sm text-slate-400">
    Usuarios con acceso al panel de administración de esta propiedad.
  </p>

  <div className="flex items-center gap-2">
    <button
      onClick={() => setShowChangePassword(true)}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
    >
      <KeyRound size={13} />
      Cambiar mi contraseña
    </button>

    <button
      onClick={() => setShowCreateUser(true)}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
    >
      <UserPlus size={13} /> Crear usuario
    </button>
  </div>
</div>

        {/* Lista de usuarios */}
        {loadingUsers ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <UsersLoader size={15} className="animate-spin" /> Cargando usuarios…
          </div>
        ) : propertyUsers.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm text-slate-500">
            <Users size={15} /> No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Alta</th>
                </tr>
              </thead>
              <tbody>
                {propertyUsers.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-slate-900/20' : ''}>
                    <td className="px-4 py-3 text-slate-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-brand-600/20 px-2 py-0.5 text-xs font-semibold text-brand-400">
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {u.created_at
                        ? format(parseISO(u.created_at), "d MMM yyyy", { locale: es })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DarkCard>

      {/* Modales */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setShowCreateUser(false)
            loadUsers()
          }}
        />
        
      )}
      {showChangePassword && (
  <ChangePasswordModal
    onClose={() => setShowChangePassword(false)}
  />
)}
    </div>
  )
}

function DarkCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-[0_10px_40px_rgba(0,0,0,0.20)]">
      <div className="flex items-center gap-2.5 border-b border-sidebar-border px-6 py-4">
        <span className="text-slate-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="space-y-4 px-6 py-5">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-300">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20'
import React, { useState } from 'react'
import { Mail, FileText, ExternalLink } from 'lucide-react'
import { DarkCard } from '../shared'
import { useAdminTenant } from '../../context/AdminTenantContext'
import { EmailTemplatesModal } from '../../components/EmailTemplatesModal'

const TEMPLATES = [
  {
    key: 'reservation_confirmed',
    label: 'Reserva confirmada (pago online)',
    description: 'Se envía automáticamente al huésped cuando el pago con Stripe se completa.',
  },
  {
    key: 'admin_reservation_confirmed_manual',
    label: 'Solicitud de pago manual',
    description: 'Se envía cuando el admin confirma una reserva manual y solicita el pago por transferencia.',
  },
  {
    key: 'checkin_link',
    label: 'Enlace de check-in',
    description: 'Se envía antes de la llegada para que el huésped complete el registro online.',
  },
]

export function EmailTab() {
  const { property_id } = useAdminTenant()
  const [showModal, setShowModal] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)

  function openTemplate(key: string) {
    setOpenKey(key)
    setShowModal(true)
  }

  return (
    <>
      <div className="space-y-6">
        <DarkCard title="Plantillas de email transaccional" icon={<Mail size={16} />}>
          <p className="text-sm text-slate-400">
            Personaliza los correos que se envían automáticamente a los huéspedes. Puedes editar
            asunto, cuerpo HTML y activar o desactivar cada plantilla.
          </p>

          <div className="space-y-3">
            {TEMPLATES.map(t => (
              <div
                key={t.key}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 px-5 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText size={16} className="mt-0.5 shrink-0 text-brand-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{t.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => openTemplate(t.key)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
                >
                  Editar
                  <ExternalLink size={11} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => { setOpenKey(null); setShowModal(true) }}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Mail size={15} />
            Gestionar todas las plantillas
          </button>
        </DarkCard>
      </div>

      {showModal && (
        <EmailTemplatesModal
          propertyId={property_id}
          onClose={() => { setShowModal(false); setOpenKey(null) }}
        />
      )}
    </>
  )
}

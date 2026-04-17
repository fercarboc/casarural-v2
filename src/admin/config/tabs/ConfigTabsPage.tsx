import React, { useState } from 'react'
import { Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { type Property, type SaveStatus, type StripeProps } from '../shared'
import { GeneralTab } from './GeneralTab'
import { BrandingTab } from './BrandingTab'
import { RulesTab } from './RulesTab'
import { LegalTab } from './LegalTab'
import { DomainEmailTab } from './DomainEmailTab'
import { PaymentsTab } from './PaymentsTab'
import { SecurityTab } from './SecurityTab'

const TABS = [
  { id: 'general',  label: 'General' },
  { id: 'branding', label: 'Marca' },
  { id: 'rules',    label: 'Normas' },
  { id: 'legal',    label: 'Legal' },
  { id: 'domain',   label: 'Dominio y Email' },
  { id: 'payments', label: 'Pagos' },
  { id: 'security', label: 'Seguridad' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  property: Property
  upd: <K extends keyof Property>(key: K, value: Property[K]) => void
  handleSave: () => Promise<boolean>
  status: SaveStatus
  errorMsg: string
  stripeProps: StripeProps
}

export function ConfigTabsPage({ property, upd, handleSave, status, errorMsg, stripeProps }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  const tabProps = { property, upd }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
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

          {activeTab !== 'security' && activeTab !== 'payments' && (
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm transition-all',
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
          )}
        </div>
      </div>

      {status === 'error' && errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Tab navigation */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-2xl border border-sidebar-border bg-sidebar-bg p-1.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'rounded-xl px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'general'  && <GeneralTab {...tabProps} />}
      {activeTab === 'branding' && <BrandingTab {...tabProps} />}
      {activeTab === 'rules'    && <RulesTab {...tabProps} />}
      {activeTab === 'legal'    && <LegalTab {...tabProps} />}
      {activeTab === 'domain'   && <DomainEmailTab {...tabProps} />}
      {activeTab === 'payments' && <PaymentsTab property={property} stripeProps={stripeProps} />}
      {activeTab === 'security' && <SecurityTab />}
    </div>
  )
}

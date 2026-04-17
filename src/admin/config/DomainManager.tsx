import React, { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Link2,
  Link2Off,
  AlertTriangle,
  Copy,
  Check as CheckIcon,
  Loader2,
} from 'lucide-react'
import {
  listDomains,
  addDomain,
  removeDomain,
  setDomainActive,
  type CustomDomain,
} from '../../services/domains.service'

interface Props {
  property_id: string
}

export function DomainManager({ property_id }: Props) {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [domainInput, setDomainInput] = useState('')
  const [domainLoading, setDomainLoading] = useState(false)
  const [domainError, setDomainError] = useState('')
  const [domainCopied, setDomainCopied] = useState(false)

  const loadDomains = useCallback(async () => {
    if (!property_id) return
    try {
      const list = await listDomains(property_id)
      setDomains(list)
    } catch { /* silencioso */ }
  }, [property_id])

  useEffect(() => { loadDomains() }, [loadDomains])

  async function handleAddDomain() {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '')
    if (!d) return
    setDomainLoading(true)
    setDomainError('')
    try {
      const added = await addDomain(property_id, d)
      setDomains(prev => [...prev, added])
      setDomainInput('')
    } catch (e: any) {
      setDomainError(e.message ?? 'Error al añadir dominio')
    } finally {
      setDomainLoading(false)
    }
  }

  async function handleRemoveDomain(id: string) {
    if (!window.confirm('¿Eliminar este dominio?')) return
    try {
      await removeDomain(property_id, id)
      setDomains(prev => prev.filter(d => d.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleToggleActive(d: CustomDomain) {
    try {
      await setDomainActive(property_id, d.id, !d.verified)
      setDomains(prev =>
        prev.map(x => (x.id === d.id ? { ...x, verified: !d.verified } : x))
      )
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {domains.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-700">
          {domains.map(d => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                {d.verified ? (
                  <Link2 size={14} className="shrink-0 text-emerald-400" />
                ) : (
                  <Link2Off size={14} className="shrink-0 text-slate-500" />
                )}
                <span className="truncate font-mono text-sm text-slate-200">{d.domain}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    d.verified
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {d.verified ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleToggleActive(d)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    d.verified
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {d.verified ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleRemoveDomain(d.id)}
                  className="rounded-xl p-1.5 text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={domainInput}
          onChange={e => setDomainInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddDomain()}
          placeholder="midominio.com"
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none"
        />
        <button
          onClick={handleAddDomain}
          disabled={domainLoading || !domainInput.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {domainLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Añadir
        </button>
      </div>

      {domainError && (
        <p className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle size={14} /> {domainError}
        </p>
      )}

      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Configuración DNS requerida
        </p>
        <p className="text-sm text-slate-400">
          En el panel DNS de tu proveedor de dominios, añade el siguiente registro CNAME:
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs">
          <div>
            <p className="mb-1 text-slate-500">Tipo</p>
            <p className="text-slate-200">CNAME</p>
          </div>
          <div>
            <p className="mb-1 text-slate-500">Nombre / Host</p>
            <p className="text-slate-200">{domainInput.split('.')[0] || '@'}</p>
          </div>
          <div>
            <p className="mb-1 text-slate-500">Destino / Valor</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-emerald-300">cname.vercel-dns.com</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('cname.vercel-dns.com')
                  setDomainCopied(true)
                  setTimeout(() => setDomainCopied(false), 2000)
                }}
                className="shrink-0"
              >
                {domainCopied ? (
                  <CheckIcon size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-slate-500 hover:text-slate-300" />
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Una vez configurado el DNS y verificado que el dominio resuelve correctamente, actívalo
          con el botón <strong className="text-slate-400">Activar</strong>. La propagación DNS
          puede tardar hasta 24h.
        </p>
      </div>
    </div>
  )
}

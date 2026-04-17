import React, { useState, useCallback, useEffect } from 'react'
import { Shield, UserPlus, Users, Loader2, KeyRound, Mail } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { DarkCard } from '../shared'
import { useAdminTenant } from '../../context/AdminTenantContext'
import { listPropertyUsers, type PropertyUser } from '../../../services/users.service'
import { EmailTemplatesModal } from '../../components/EmailTemplatesModal'
import { CreateUserModal } from '../../components/CreateUserModal'
import { ChangePasswordModal } from '../../components/ChangePasswordModal'

export function SecurityTab() {
  const { property_id } = useAdminTenant()

  const [propertyUsers, setPropertyUsers] = useState<PropertyUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showEmailTemplates, setShowEmailTemplates] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const users = await listPropertyUsers(property_id)
      setPropertyUsers(users)
    } catch {
      // silencioso
    } finally {
      setLoadingUsers(false)
    }
  }, [property_id])

  useEffect(() => { loadUsers() }, [loadUsers])

  return (
    <>
      <div className="space-y-6">
        <DarkCard title="Seguridad" icon={<Shield size={16} />}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Usuarios con acceso al panel de administración de esta propiedad.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmailTemplates(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
              >
                <Mail size={13} />
                Plantillas email
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
              >
                <KeyRound size={13} />
                Cambiar contraseña
              </button>
              <button
                onClick={() => setShowCreateUser(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
              >
                <UserPlus size={13} /> Crear usuario
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 size={15} className="animate-spin" /> Cargando usuarios…
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
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Email
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Rol
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Alta
                    </th>
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
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.created_at
                          ? format(parseISO(u.created_at), 'd MMM yyyy', { locale: es })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DarkCard>
      </div>

      {showEmailTemplates && (
        <EmailTemplatesModal
          propertyId={property_id}
          onClose={() => setShowEmailTemplates(false)}
        />
      )}
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
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  )
}

// src/admin/components/AdminGate.tsx
// Decide si mostrar el wizard de onboarding o el panel de administración normal.

import { Outlet } from 'react-router-dom'
import { useAdminTenant } from '../context/AdminTenantContext'
import { OnboardingPage } from '../pages/OnboardingPage'
import { AdminLayout } from './AdminLayout'

export function AdminGate() {
  const { onboarding_done } = useAdminTenant()

  if (!onboarding_done) return <OnboardingPage />

  return <AdminLayout />
}

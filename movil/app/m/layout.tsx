export const dynamic = 'force-dynamic'

import { MobileClientLayout } from './mobile-client-layout'

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileClientLayout>{children}</MobileClientLayout>
}

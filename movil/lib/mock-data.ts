// StayNexApp - Mock Data for Mobile PWA
// Modelo: Empresa gestora con alojamientos completos (casas rurales y apartamentos)

export interface Tenant {
  id: string
  name: string
  totalAccommodations: number
}

export interface Accommodation {
  id: string
  tenantId: string
  name: string
  type: 'casa-completa' | 'apartamento-completo'
  modality: 'corta-estancia' | 'media-estancia' | 'larga-estancia'
  capacity: number
  status: 'disponible' | 'ocupado' | 'bloqueado' | 'mantenimiento'
  nextCheckIn?: string
  nextCheckOut?: string
  activeReservationId?: string
  activeContractId?: string
}

export interface Reservation {
  id: string
  code: string
  guestId: string
  guestName: string
  accommodationId: string
  accommodationName: string
  tenantId: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  amount: number
  status: 'confirmed' | 'pending' | 'cancelled'
  source: 'booking' | 'airbnb' | 'direct' | 'other'
  notes?: string
  email?: string
  phone?: string
}

export interface CleaningTask {
  id: string
  accommodationId: string
  accommodationName: string
  tenantId: string
  date: string
  type: 'checkout' | 'checkin' | 'periodic' | 'manual'
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'completed'
  assignee?: string
  notes?: string
  reservationCode?: string
}

export interface Rental {
  id: string
  accommodationId: string
  accommodationName: string
  tenantId: string
  clientId: string
  clientName: string
  startDate: string
  endDate: string
  monthlyRent: number
  deposit: number
  depositStatus: 'paid' | 'pending' | 'returned'
  contractStatus: 'active' | 'expiring' | 'expired' | 'renewed'
  paymentDay: number
}

export interface Contract {
  id: string
  rentalId: string
  clientName: string
  accommodationName: string
  tenantId: string
  startDate: string
  endDate: string
  status: 'signed' | 'pending' | 'expired' | 'renewed'
  documentUrl?: string
  renewalDate?: string
}

export interface Payment {
  id: string
  rentalId: string
  clientId: string
  clientName: string
  accommodationName: string
  tenantId: string
  amount: number
  dueDate: string
  paidDate?: string
  status: 'paid' | 'pending' | 'overdue'
  concept: string
  month: string
}

export interface Alert {
  id: string
  tenantId: string
  accommodationId?: string
  accommodationName?: string
  type: 'maintenance' | 'payment' | 'tenant' | 'utility' | 'cleaning' | 'contract'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'in-progress' | 'closed'
  createdAt: string
  resolvedAt?: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  type: 'guest' | 'tenant'
  lastActivity?: string
  totalReservations?: number
  activeRental?: string
  notes?: string
}

// Mock Tenants (Empresas gestoras)
export const tenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Empresa Pepe Gestion Rural',
    totalAccommodations: 6
  },
  {
    id: 'tenant-2',
    name: 'Gestion Rural Norte',
    totalAccommodations: 3
  }
]

// Mock Accommodations (Alojamientos completos)
export const accommodations: Accommodation[] = [
  // Empresa Pepe - Corta estancia
  {
    id: 'acc-1',
    tenantId: 'tenant-1',
    name: 'Casa Rural Juan',
    type: 'casa-completa',
    modality: 'corta-estancia',
    capacity: 8,
    status: 'ocupado',
    nextCheckOut: '2024-12-23',
    activeReservationId: 'res-1'
  },
  {
    id: 'acc-2',
    tenantId: 'tenant-1',
    name: 'Casa Rural Antonio',
    type: 'casa-completa',
    modality: 'corta-estancia',
    capacity: 6,
    status: 'disponible',
    nextCheckIn: '2024-12-26'
  },
  {
    id: 'acc-3',
    tenantId: 'tenant-1',
    name: 'Apartamento El Molino',
    type: 'apartamento-completo',
    modality: 'corta-estancia',
    capacity: 4,
    status: 'ocupado',
    nextCheckOut: '2024-12-24',
    activeReservationId: 'res-2'
  },
  {
    id: 'acc-4',
    tenantId: 'tenant-1',
    name: 'Apartamento La Terraza',
    type: 'apartamento-completo',
    modality: 'corta-estancia',
    capacity: 4,
    status: 'disponible',
    nextCheckIn: '2024-12-22'
  },
  // Empresa Pepe - Media/Larga estancia
  {
    id: 'acc-5',
    tenantId: 'tenant-1',
    name: 'Apartamento Centro 3',
    type: 'apartamento-completo',
    modality: 'larga-estancia',
    capacity: 3,
    status: 'ocupado',
    activeContractId: 'contract-1'
  },
  {
    id: 'acc-6',
    tenantId: 'tenant-1',
    name: 'Apartamento Centro 4',
    type: 'apartamento-completo',
    modality: 'media-estancia',
    capacity: 2,
    status: 'ocupado',
    activeContractId: 'contract-2'
  },
  // Gestion Rural Norte
  {
    id: 'acc-7',
    tenantId: 'tenant-2',
    name: 'Casa Rural El Bosque',
    type: 'casa-completa',
    modality: 'corta-estancia',
    capacity: 10,
    status: 'disponible'
  },
  {
    id: 'acc-8',
    tenantId: 'tenant-2',
    name: 'Apartamento Rio',
    type: 'apartamento-completo',
    modality: 'corta-estancia',
    capacity: 4,
    status: 'mantenimiento'
  },
  {
    id: 'acc-9',
    tenantId: 'tenant-2',
    name: 'Apartamento Montana',
    type: 'apartamento-completo',
    modality: 'media-estancia',
    capacity: 3,
    status: 'ocupado',
    activeContractId: 'contract-3'
  }
]

// Mock Reservations (Corta estancia)
export const reservations: Reservation[] = [
  {
    id: 'res-1',
    code: 'RES-2024-001',
    guestId: 'client-1',
    guestName: 'Maria Garcia Lopez',
    accommodationId: 'acc-1',
    accommodationName: 'Casa Rural Juan',
    tenantId: 'tenant-1',
    checkIn: '2024-12-20',
    checkOut: '2024-12-23',
    nights: 3,
    guests: 6,
    amount: 540,
    status: 'confirmed',
    source: 'booking'
  },
  {
    id: 'res-2',
    code: 'RES-2024-002',
    guestId: 'client-2',
    guestName: 'Carlos Ruiz Martin',
    accommodationId: 'acc-3',
    accommodationName: 'Apartamento El Molino',
    tenantId: 'tenant-1',
    checkIn: '2024-12-21',
    checkOut: '2024-12-24',
    nights: 3,
    guests: 3,
    amount: 320,
    status: 'confirmed',
    source: 'airbnb'
  },
  {
    id: 'res-3',
    code: 'RES-2024-003',
    guestId: 'client-3',
    guestName: 'Ana Fernandez Soto',
    accommodationId: 'acc-4',
    accommodationName: 'Apartamento La Terraza',
    tenantId: 'tenant-1',
    checkIn: '2024-12-22',
    checkOut: '2024-12-27',
    nights: 5,
    guests: 4,
    amount: 450,
    status: 'pending',
    source: 'direct'
  },
  {
    id: 'res-4',
    code: 'RES-2024-004',
    guestId: 'client-4',
    guestName: 'Pedro Sanchez Villa',
    accommodationId: 'acc-2',
    accommodationName: 'Casa Rural Antonio',
    tenantId: 'tenant-1',
    checkIn: '2024-12-26',
    checkOut: '2024-12-30',
    nights: 4,
    guests: 5,
    amount: 480,
    status: 'confirmed',
    source: 'booking'
  },
  {
    id: 'res-5',
    code: 'RES-2024-005',
    guestId: 'client-1',
    guestName: 'Maria Garcia Lopez',
    accommodationId: 'acc-1',
    accommodationName: 'Casa Rural Juan',
    tenantId: 'tenant-1',
    checkIn: '2024-12-26',
    checkOut: '2024-12-30',
    nights: 4,
    guests: 6,
    amount: 720,
    status: 'confirmed',
    source: 'direct'
  },
  {
    id: 'res-6',
    code: 'RES-2024-006',
    guestId: 'client-2',
    guestName: 'Carlos Ruiz Martin',
    accommodationId: 'acc-3',
    accommodationName: 'Apartamento El Molino',
    tenantId: 'tenant-1',
    checkIn: '2024-12-15',
    checkOut: '2024-12-17',
    nights: 2,
    guests: 2,
    amount: 190,
    status: 'cancelled',
    source: 'airbnb'
  },
  // Gestion Rural Norte
  {
    id: 'res-7',
    code: 'RES-2024-007',
    guestId: 'client-3',
    guestName: 'Ana Fernandez Soto',
    accommodationId: 'acc-7',
    accommodationName: 'Casa Rural El Bosque',
    tenantId: 'tenant-2',
    checkIn: '2024-12-28',
    checkOut: '2025-01-02',
    nights: 5,
    guests: 8,
    amount: 950,
    status: 'confirmed',
    source: 'direct'
  }
]

// Mock Cleaning Tasks
export const cleaningTasks: CleaningTask[] = [
  {
    id: 'clean-1',
    accommodationId: 'acc-1',
    accommodationName: 'Casa Rural Juan',
    tenantId: 'tenant-1',
    date: '2024-12-23',
    type: 'checkout',
    priority: 'high',
    status: 'pending',
    reservationCode: 'RES-2024-001',
    notes: 'Salida 11:00, limpieza profunda casa completa'
  },
  {
    id: 'clean-2',
    accommodationId: 'acc-3',
    accommodationName: 'Apartamento El Molino',
    tenantId: 'tenant-1',
    date: '2024-12-24',
    type: 'checkout',
    priority: 'high',
    status: 'pending',
    reservationCode: 'RES-2024-002',
    notes: 'Preparar para siguiente reserva'
  },
  {
    id: 'clean-3',
    accommodationId: 'acc-4',
    accommodationName: 'Apartamento La Terraza',
    tenantId: 'tenant-1',
    date: '2024-12-22',
    type: 'checkin',
    priority: 'high',
    status: 'pending',
    reservationCode: 'RES-2024-003',
    notes: 'Llegada prevista 16:00'
  },
  {
    id: 'clean-4',
    accommodationId: 'acc-2',
    accommodationName: 'Casa Rural Antonio',
    tenantId: 'tenant-1',
    date: '2024-12-19',
    type: 'periodic',
    priority: 'low',
    status: 'completed',
    notes: 'Limpieza mensual completada'
  },
  {
    id: 'clean-5',
    accommodationId: 'acc-5',
    accommodationName: 'Apartamento Centro 3',
    tenantId: 'tenant-1',
    date: '2024-12-27',
    type: 'periodic',
    priority: 'medium',
    status: 'pending',
    notes: 'Limpieza periodica mensual acordada con inquilino'
  },
  // Gestion Rural Norte
  {
    id: 'clean-6',
    accommodationId: 'acc-7',
    accommodationName: 'Casa Rural El Bosque',
    tenantId: 'tenant-2',
    date: '2024-12-28',
    type: 'checkin',
    priority: 'high',
    status: 'pending',
    reservationCode: 'RES-2024-007'
  }
]

// Mock Rentals (Media/Larga Estancia)
export const rentals: Rental[] = [
  {
    id: 'rental-1',
    accommodationId: 'acc-5',
    accommodationName: 'Apartamento Centro 3',
    tenantId: 'tenant-1',
    clientId: 'client-5',
    clientName: 'Laura Jimenez Torres',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    monthlyRent: 650,
    deposit: 1300,
    depositStatus: 'paid',
    contractStatus: 'expiring',
    paymentDay: 5
  },
  {
    id: 'rental-2',
    accommodationId: 'acc-6',
    accommodationName: 'Apartamento Centro 4',
    tenantId: 'tenant-1',
    clientId: 'client-6',
    clientName: 'Miguel Angel Ramos',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    monthlyRent: 580,
    deposit: 1160,
    depositStatus: 'paid',
    contractStatus: 'active',
    paymentDay: 1
  },
  // Gestion Rural Norte
  {
    id: 'rental-3',
    accommodationId: 'acc-9',
    accommodationName: 'Apartamento Montana',
    tenantId: 'tenant-2',
    clientId: 'client-7',
    clientName: 'Elena Martin Diaz',
    startDate: '2024-09-01',
    endDate: '2025-02-28',
    monthlyRent: 520,
    deposit: 1040,
    depositStatus: 'paid',
    contractStatus: 'active',
    paymentDay: 10
  }
]

// Mock Contracts
export const contracts: Contract[] = [
  {
    id: 'contract-1',
    rentalId: 'rental-1',
    clientName: 'Laura Jimenez Torres',
    accommodationName: 'Apartamento Centro 3',
    tenantId: 'tenant-1',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'signed',
    renewalDate: '2024-12-15'
  },
  {
    id: 'contract-2',
    rentalId: 'rental-2',
    clientName: 'Miguel Angel Ramos',
    accommodationName: 'Apartamento Centro 4',
    tenantId: 'tenant-1',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    status: 'signed'
  },
  {
    id: 'contract-3',
    rentalId: 'rental-3',
    clientName: 'Elena Martin Diaz',
    accommodationName: 'Apartamento Montana',
    tenantId: 'tenant-2',
    startDate: '2024-09-01',
    endDate: '2025-02-28',
    status: 'signed'
  }
]

// Mock Payments
export const payments: Payment[] = [
  {
    id: 'pay-1',
    rentalId: 'rental-1',
    clientId: 'client-5',
    clientName: 'Laura Jimenez Torres',
    accommodationName: 'Apartamento Centro 3',
    tenantId: 'tenant-1',
    amount: 650,
    dueDate: '2024-12-05',
    status: 'pending',
    concept: 'Alquiler mensual',
    month: 'Diciembre 2024'
  },
  {
    id: 'pay-2',
    rentalId: 'rental-2',
    clientId: 'client-6',
    clientName: 'Miguel Angel Ramos',
    accommodationName: 'Apartamento Centro 4',
    tenantId: 'tenant-1',
    amount: 580,
    dueDate: '2024-12-01',
    paidDate: '2024-12-01',
    status: 'paid',
    concept: 'Alquiler mensual',
    month: 'Diciembre 2024'
  },
  {
    id: 'pay-3',
    rentalId: 'rental-3',
    clientId: 'client-7',
    clientName: 'Elena Martin Diaz',
    accommodationName: 'Apartamento Montana',
    tenantId: 'tenant-2',
    amount: 520,
    dueDate: '2024-12-10',
    status: 'pending',
    concept: 'Alquiler mensual',
    month: 'Diciembre 2024'
  },
  {
    id: 'pay-4',
    rentalId: 'rental-1',
    clientId: 'client-5',
    clientName: 'Laura Jimenez Torres',
    accommodationName: 'Apartamento Centro 3',
    tenantId: 'tenant-1',
    amount: 650,
    dueDate: '2024-11-05',
    paidDate: '2024-11-05',
    status: 'paid',
    concept: 'Alquiler mensual',
    month: 'Noviembre 2024'
  },
  {
    id: 'pay-5',
    rentalId: 'rental-2',
    clientId: 'client-6',
    clientName: 'Miguel Angel Ramos',
    accommodationName: 'Apartamento Centro 4',
    tenantId: 'tenant-1',
    amount: 580,
    dueDate: '2024-11-01',
    paidDate: '2024-11-02',
    status: 'paid',
    concept: 'Alquiler mensual',
    month: 'Noviembre 2024'
  }
]

// Mock Alerts
export const alerts: Alert[] = [
  {
    id: 'alert-1',
    tenantId: 'tenant-1',
    accommodationId: 'acc-5',
    accommodationName: 'Apartamento Centro 3',
    type: 'contract',
    title: 'Contrato proximo a vencer',
    description: 'El contrato de Laura Jimenez vence el 31/12/2024. Contactar para renovacion.',
    priority: 'high',
    status: 'open',
    createdAt: '2024-12-01'
  },
  {
    id: 'alert-2',
    tenantId: 'tenant-1',
    accommodationId: 'acc-3',
    accommodationName: 'Apartamento El Molino',
    type: 'maintenance',
    title: 'Revisar calentador',
    description: 'El huesped reporta agua tibia. Revisar calentador antes de proxima reserva.',
    priority: 'medium',
    status: 'in-progress',
    createdAt: '2024-12-10'
  },
  {
    id: 'alert-3',
    tenantId: 'tenant-1',
    type: 'utility',
    title: 'Factura luz pendiente',
    description: 'Revisar factura de electricidad del mes anterior, posible error de lectura.',
    priority: 'low',
    status: 'open',
    createdAt: '2024-12-05'
  },
  {
    id: 'alert-4',
    tenantId: 'tenant-1',
    accommodationId: 'acc-1',
    accommodationName: 'Casa Rural Juan',
    type: 'cleaning',
    title: 'Preparar para Navidad',
    description: 'Decoracion navidena y limpieza especial antes del 24/12.',
    priority: 'medium',
    status: 'open',
    createdAt: '2024-12-15'
  },
  {
    id: 'alert-5',
    tenantId: 'tenant-2',
    accommodationId: 'acc-8',
    accommodationName: 'Apartamento Rio',
    type: 'maintenance',
    title: 'Reparacion fontaneria',
    description: 'Fuga en bano principal. Fontanero programado para el 20/12.',
    priority: 'high',
    status: 'in-progress',
    createdAt: '2024-12-12'
  },
  {
    id: 'alert-6',
    tenantId: 'tenant-1',
    accommodationId: 'acc-6',
    accommodationName: 'Apartamento Centro 4',
    type: 'tenant',
    title: 'Solicitud de reparacion',
    description: 'Miguel solicita reparacion del grifo de la cocina que gotea.',
    priority: 'medium',
    status: 'open',
    createdAt: '2024-12-18'
  }
]

// Mock Clients
export const clients: Client[] = [
  // Huespedes (corta estancia)
  {
    id: 'client-1',
    name: 'Maria Garcia Lopez',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    type: 'guest',
    lastActivity: '2024-12-20',
    totalReservations: 3
  },
  {
    id: 'client-2',
    name: 'Carlos Ruiz Martin',
    email: 'carlos.ruiz@email.com',
    phone: '+34 623 456 789',
    type: 'guest',
    lastActivity: '2024-12-21',
    totalReservations: 2
  },
  {
    id: 'client-3',
    name: 'Ana Fernandez Soto',
    email: 'ana.fernandez@email.com',
    phone: '+34 634 567 890',
    type: 'guest',
    lastActivity: '2024-12-22',
    totalReservations: 2
  },
  {
    id: 'client-4',
    name: 'Pedro Sanchez Villa',
    email: 'pedro.sanchez@email.com',
    phone: '+34 645 678 901',
    type: 'guest',
    lastActivity: '2024-12-18',
    totalReservations: 1
  },
  // Inquilinos (media/larga estancia)
  {
    id: 'client-5',
    name: 'Laura Jimenez Torres',
    email: 'laura.jimenez@email.com',
    phone: '+34 656 789 012',
    type: 'tenant',
    activeRental: 'Apartamento Centro 3',
    notes: 'Inquilina desde enero 2024'
  },
  {
    id: 'client-6',
    name: 'Miguel Angel Ramos',
    email: 'miguel.ramos@email.com',
    phone: '+34 667 890 123',
    type: 'tenant',
    activeRental: 'Apartamento Centro 4',
    notes: 'Paga siempre puntual'
  },
  {
    id: 'client-7',
    name: 'Elena Martin Diaz',
    email: 'elena.martin@email.com',
    phone: '+34 678 901 234',
    type: 'tenant',
    activeRental: 'Apartamento Montana',
    notes: 'Media estancia - hasta febrero 2025'
  }
]

// =====================
// HELPER FUNCTIONS
// =====================

export function getTenantById(id: string): Tenant | undefined {
  return tenants.find(t => t.id === id)
}

export function getAccommodationsByTenant(tenantId: string): Accommodation[] {
  return accommodations.filter(a => a.tenantId === tenantId)
}

export function getShortStayAccommodations(tenantId: string): Accommodation[] {
  return accommodations.filter(a => a.tenantId === tenantId && a.modality === 'corta-estancia')
}

export function getLongStayAccommodations(tenantId: string): Accommodation[] {
  return accommodations.filter(a => a.tenantId === tenantId && (a.modality === 'media-estancia' || a.modality === 'larga-estancia'))
}

export function getReservationsByTenant(tenantId: string): Reservation[] {
  return reservations.filter(r => r.tenantId === tenantId)
}

export function getCleaningTasksByTenant(tenantId: string): CleaningTask[] {
  return cleaningTasks.filter(c => c.tenantId === tenantId)
}

export function getRentalsByTenant(tenantId: string): Rental[] {
  return rentals.filter(r => r.tenantId === tenantId)
}

export function getContractsByTenant(tenantId: string): Contract[] {
  return contracts.filter(c => c.tenantId === tenantId)
}

export function getPaymentsByTenant(tenantId: string): Payment[] {
  return payments.filter(p => p.tenantId === tenantId)
}

export function getAlertsByTenant(tenantId: string): Alert[] {
  return alerts.filter(a => a.tenantId === tenantId)
}

export function getClientById(id: string): Client | undefined {
  return clients.find(c => c.id === id)
}

export function getGuestClients(): Client[] {
  return clients.filter(c => c.type === 'guest')
}

export function getTenantClients(): Client[] {
  return clients.filter(c => c.type === 'tenant')
}

export function getTodayReservations(tenantId: string): { checkIns: Reservation[], checkOuts: Reservation[] } {
  const today = new Date().toISOString().split('T')[0]
  const tenantReservations = getReservationsByTenant(tenantId)
  return {
    checkIns: tenantReservations.filter(r => r.checkIn === today && r.status !== 'cancelled'),
    checkOuts: tenantReservations.filter(r => r.checkOut === today && r.status !== 'cancelled')
  }
}

export function getPendingCleaningTasks(tenantId: string): CleaningTask[] {
  return getCleaningTasksByTenant(tenantId).filter(c => c.status === 'pending')
}

export function getActiveRentals(tenantId: string): Rental[] {
  return getRentalsByTenant(tenantId).filter(r => r.contractStatus === 'active' || r.contractStatus === 'expiring')
}

export function getPendingPayments(tenantId: string): Payment[] {
  return getPaymentsByTenant(tenantId).filter(p => p.status === 'pending' || p.status === 'overdue')
}

export function getOpenAlerts(tenantId: string): Alert[] {
  return getAlertsByTenant(tenantId).filter(a => a.status === 'open' || a.status === 'in-progress')
}

export function getOccupiedAccommodationsCount(tenantId: string): number {
  return getAccommodationsByTenant(tenantId).filter(a => a.status === 'ocupado').length
}

export function getActiveReservationsCount(tenantId: string): number {
  return getReservationsByTenant(tenantId).filter(r => r.status === 'confirmed' || r.status === 'pending').length
}

// Backward compatibility exports (Property -> Tenant mapping)
export type Property = Tenant
export const properties = tenants
export const getPropertyById = getTenantById
export const units = accommodations
export const getUnitsByProperty = getAccommodationsByTenant
export const getReservationsByProperty = getReservationsByTenant
export const getCleaningTasksByProperty = getCleaningTasksByTenant
export const getRentalsByProperty = getRentalsByTenant
export const getPaymentsByProperty = getPaymentsByTenant
export const getAlertsByProperty = getAlertsByTenant

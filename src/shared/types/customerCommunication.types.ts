export type CustomerCommunicationType =
  | 'EMAIL_OUT'
  | 'EMAIL_IN'
  | 'CONSULTA'
  | 'CONSULTA_REPLY'
  | 'NOTE_INTERNAL'
  | 'RESERVATION_EVENT'
  | 'DOCUMENT_SENT'
  | 'MANAGEMENT_CONFIRMATION'

export type CustomerCommunicationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'RECEIVED'
  | 'ARCHIVED'

export interface CustomerCommunication {
  id: string
  property_id: string
  related_consulta_id: string | null

  type: CustomerCommunicationType
  status: CustomerCommunicationStatus

  subject: string | null
  body_html: string | null
  body_text: string | null

  customer_email: string
  customer_name: string | null

  attachment_name: string | null
  attachment_url: string | null

  created_at: string
  metadata?: Record<string, unknown> | null
}

export interface CustomerCommunicationsFilters {
  propertyId: string
  customerEmail: string
  limit?: number
}
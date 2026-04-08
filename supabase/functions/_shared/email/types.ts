export type EmailTemplateKey =
  | 'consulta_ack'
  | 'consulta_reply'
  | 'consulta_documents'
  | 'consulta_managed';

export interface EmailBranding {
  brandName: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;

  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

export interface EmailAttachmentInfo {
  name: string;
  url?: string | null;
}

export interface EmailSummaryItem {
  label: string;
  value: string;
}

export interface BaseEmailTemplateInput {
  subject: string;
  previewText?: string;
  title: string;
  subtitle?: string;
  intro?: string;
  badge?: string;
  customerName?: string | null;
  propertyName?: string | null;
  messageHtml?: string;
  summaryItems?: EmailSummaryItem[];
  attachments?: EmailAttachmentInfo[];
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
  branding: EmailBranding;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}
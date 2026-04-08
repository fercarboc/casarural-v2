import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateTime } from '../../shared/lib/formatDateTime';
import { cn } from '../../shared/lib/cn';
import type {
  CustomerCommunication,
  CustomerCommunicationStatus,
  CustomerCommunicationType,
} from '../../shared/types/customerCommunication.types';
import { CommunicationTypeIcon } from './CommunicationTypeIcon';
import { CommunicationAttachmentButton } from './CommunicationAttachmentButton';

interface Props {
  item: CustomerCommunication;
}

function getStatusClasses(status: CustomerCommunicationStatus) {
  switch (status) {
    case 'SENT':
    case 'DELIVERED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'FAILED':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
    case 'PENDING':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'RECEIVED':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
    case 'ARCHIVED':
    default:
      return 'border-slate-600 bg-slate-800/80 text-slate-300';
  }
}

function getTypeLabel(type: CustomerCommunicationType) {
  switch (type) {
    case 'EMAIL_OUT':
      return 'Email enviado';
    case 'EMAIL_IN':
      return 'Email recibido';
    case 'CONSULTA':
      return 'Consulta';
    case 'CONSULTA_REPLY':
      return 'Respuesta a consulta';
    case 'DOCUMENT_SENT':
      return 'Documentación enviada';
    case 'MANAGEMENT_CONFIRMATION':
      return 'Gestión confirmada';
    case 'RESERVATION_EVENT':
      return 'Evento de reserva';
    case 'NOTE_INTERNAL':
    default:
      return 'Nota interna';
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPreview(item: CustomerCommunication): string {
  if (item.body_text?.trim()) return item.body_text.trim().slice(0, 220);
  if (item.body_html?.trim()) return stripHtml(item.body_html).slice(0, 220);
  return 'Sin contenido disponible';
}

export const CommunicationTimelineItem: React.FC<Props> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);

  const preview = useMemo(() => getPreview(item), [item]);

  return (
    <div className="relative pl-12">
      <div className="absolute left-[18px] top-0 h-full w-px bg-slate-800" />

      <div className="absolute left-0 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-amber-400 shadow-lg shadow-black/20">
        <CommunicationTypeIcon type={item.type} className="h-4 w-4" />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.18)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200">
                {getTypeLabel(item.type)}
              </span>

              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium',
                  getStatusClasses(item.status)
                )}
              >
                {item.status}
              </span>

              <span className="text-xs text-slate-500">
                {formatDateTime(item.created_at)}
              </span>
            </div>

            <h4 className="truncate text-sm font-semibold text-slate-100 md:text-base">
              {item.subject || 'Sin asunto'}
            </h4>

            <div className="mt-1 text-xs text-slate-400">
              {item.customer_name || 'Cliente'} · {item.customer_email}
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              {preview}
              {preview.length >= 220 ? '…' : ''}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <CommunicationAttachmentButton
              attachmentName={item.attachment_name}
              attachmentUrl={item.attachment_url}
            />

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {expanded ? 'Ocultar' : 'Ver más'}
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
            {item.body_text && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Texto plano
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">
                  {item.body_text}
                </pre>
              </div>
            )}

            {!item.body_text && item.body_html && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  HTML renderizado
                </div>
                <div
                  className="prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: item.body_html }}
                />
              </div>
            )}

            {item.related_consulta_id && (
              <div className="text-xs text-slate-500">
                Consulta relacionada: {item.related_consulta_id}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
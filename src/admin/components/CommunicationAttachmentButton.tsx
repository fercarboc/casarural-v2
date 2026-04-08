import React from 'react';
import { Paperclip, Download } from 'lucide-react';
import { cn } from '../../shared/lib/cn';

interface Props {
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  className?: string;
}

export const CommunicationAttachmentButton: React.FC<Props> = ({
  attachmentName,
  attachmentUrl,
  className,
}) => {
  if (!attachmentName || !attachmentUrl) return null;

  return (
    <a
      href={attachmentUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-500/60 hover:bg-slate-800',
        className
      )}
      title={`Descargar ${attachmentName}`}
    >
      <Paperclip className="h-4 w-4" />
      <span className="max-w-[220px] truncate">{attachmentName}</span>
      <Download className="h-4 w-4 opacity-80" />
    </a>
  );
};
import React from 'react';
import { Loader2, RefreshCw, MailSearch } from 'lucide-react';
import { useCustomerCommunications } from '../../shared/hooks/useCustomerCommunications';
import { CommunicationTimelineItem } from './CommunicationTimelineItem';

interface Props {
  propertyId?: string;
  customerEmail?: string;
  title?: string;
  limit?: number;
  className?: string;
}

export const CustomerCommunicationsTimeline: React.FC<Props> = ({
  propertyId,
  customerEmail,
  title = 'Histórico de comunicaciones',
  limit = 100,
  className,
}) => {
  const { items, loading, error, reload, hasItems } = useCustomerCommunications({
    propertyId,
    customerEmail,
    limit,
    enabled: Boolean(propertyId && customerEmail),
  });

  return (
    <section
      className={[
        'rounded-3xl border border-slate-800 bg-[#020617]/90 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]',
        className ?? '',
      ].join(' ')}
    >
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            Timeline cronológico de emails y comunicaciones del cliente
          </p>
        </div>

        <button
          type="button"
          onClick={() => void reload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar
        </button>
      </div>

      {!propertyId || !customerEmail ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
          Falta propertyId o customerEmail para cargar el histórico.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando comunicaciones...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      ) : !hasItems ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <MailSearch className="h-8 w-8 text-slate-500" />
          <div className="text-sm text-slate-300">
            No hay comunicaciones registradas para este cliente.
          </div>
          <div className="text-xs text-slate-500">
            Cuando envíes respuestas, documentos o confirmaciones aparecerán aquí.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item) => (
            <CommunicationTimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
};
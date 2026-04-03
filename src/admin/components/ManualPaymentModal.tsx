// src/admin/components/ManualPaymentModal.tsx
import { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

interface Props {
  reserva: {
    id: string;
    nombre: string;
    apellidos: string;
    total: number;
    importe_pagado: number | null;
    estado_pago: string;
    tarifa: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const METODOS = [
  { value: 'EFECTIVO',       label: '💵 Efectivo' },
  { value: 'BIZUM',          label: '📱 Bizum' },
  { value: 'TRANSFERENCIA',  label: '🏦 Transferencia' },
] as const;

export function ManualPaymentModal({ reserva, onClose, onSuccess }: Props) {
  const pendiente = reserva.total - (reserva.importe_pagado ?? 0);

  const [metodo,          setMetodo]          = useState<string>('EFECTIVO');
  const [importe,         setImporte]         = useState<string>(pendiente.toFixed(2));
  const [fecha,           setFecha]           = useState<string>(new Date().toISOString().split('T')[0]);
  const [notas,           setNotas]           = useState<string>('');
  const [generarFactura,  setGenerarFactura]  = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const importeNum = parseFloat(importe);
    if (isNaN(importeNum) || importeNum <= 0) {
      setError('El importe debe ser un número positivo');
      return;
    }
    if (importeNum > pendiente + 0.01) {
      setError(`El importe no puede superar el pendiente (${pendiente.toFixed(2)} €)`);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = { Authorization: `Bearer ${session?.access_token}` };

      const { data, error: fnError } = await supabase.functions.invoke('register-manual-payment', {
        body: {
          reservaId:      reserva.id,
          metodoPago:     metodo,
          importe:        importeNum,
          fechaPago:      fecha,
          notas:          notas || undefined,
          generarFactura,
        },
        headers: authHeader,
      });

      if (fnError) throw new Error((data as any)?.error ?? fnError.message ?? 'Error desconocido');
      if (!data?.ok) throw new Error(data?.error ?? 'Error al registrar el pago');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Registrar pago manual</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {reserva.nombre} {reserva.apellidos}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Resumen */}
        <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total reserva</span>
            <span className="font-medium">{reserva.total.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Ya pagado</span>
            <span className="font-medium text-green-600">{reserva.importe_pagado.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm mt-1 pt-1 border-t border-amber-200">
            <span className="font-semibold text-gray-800">Pendiente</span>
            <span className="font-bold text-amber-700">{pendiente.toFixed(2)} €</span>
          </div>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-4">
          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMetodo(m.value)}
                  className={`py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    metodo === m.value
                      ? 'border-stone-800 bg-stone-800 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Importe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Importe a cobrar <span className="text-gray-400 font-normal">(máx. {pendiente.toFixed(2)} €)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={importe}
                onChange={e => setImporte(e.target.value)}
                step="0.01"
                min="0.01"
                max={pendiente}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-10 text-right text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
            </div>
            <button
              onClick={() => setImporte(pendiente.toFixed(2))}
              className="mt-1 text-xs text-stone-600 underline hover:no-underline"
            >
              Cobrar todo el pendiente
            </button>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del pago</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Referencia / notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder={metodo === 'BIZUM' ? 'Nº concepto Bizum...' : metodo === 'TRANSFERENCIA' ? 'Nº referencia transferencia...' : 'Notas adicionales...'}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Generar factura */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={generarFactura}
              onChange={e => setGenerarFactura(e.target.checked)}
              className="w-4 h-4 rounded accent-stone-800"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Generar factura</p>
              <p className="text-xs text-gray-500">Se emitirá factura con IVA 10% para este pago</p>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-900 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              `Registrar ${parseFloat(importe || '0').toFixed(2)} €`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

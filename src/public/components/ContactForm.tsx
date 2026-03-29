import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export const ContactForm: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    }, 1500);
  };

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-emerald-50 rounded-2xl border border-emerald-100">
        <CheckCircle2 size={48} className="text-emerald-600 mb-4" />
        <h3 className="text-2xl font-serif font-bold text-stone-800">¡Mensaje enviado!</h3>
        <p className="mt-2 text-stone-600">Gracias por contactar con La Rasilla. Te responderemos en menos de 24 horas.</p>
        <button 
          onClick={() => setStatus('idle')}
          className="mt-6 text-sm font-bold text-emerald-700 hover:underline"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Nombre completo</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Email</label>
          <input 
            required
            type="email" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="tu@email.com"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Teléfono</label>
        <input 
          type="tel" 
          value={formData.phone}
          onChange={e => setFormData({...formData, phone: e.target.value})}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="+34 000 000 000"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Mensaje</label>
        <textarea 
          required
          rows={4}
          value={formData.message}
          onChange={e => setFormData({...formData, message: e.target.value})}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="¿En qué podemos ayudarte?"
        />
      </div>
      <button 
        type="submit"
        disabled={status === 'sending'}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-800 py-4 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-900 disabled:opacity-50"
      >
        {status === 'sending' ? 'Enviando...' : (
          <>
            Enviar mensaje
            <Send size={16} />
          </>
        )}
      </button>
    </form>
  );
};

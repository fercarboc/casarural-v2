import React, { useState } from 'react';
import { HeroSection } from '../components/HeroSection';
import { SectionContainer } from '../components/SectionContainer';
import { Mail, Phone, MapPin, Clock, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { MetaTags } from '../components/MetaTags';
import { supabase } from '../../integrations/supabase/client';

export const ContactoPage: React.FC = () => {
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.email || !form.mensaje) return;
    setSending(true);
    setError('');
    try {
      const { error: err } = await supabase.from('consultas').insert({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        telefono: form.telefono.trim() || null,
        asunto: form.asunto.trim() || 'Consulta general',
        mensaje: form.mensaje.trim(),
      });
      if (err) throw err;
      setSent(true);
    } catch (e: any) {
      setError('Ha ocurrido un error. Por favor, escríbenos directamente a info@casarurallarasilla.com');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white">
      <MetaTags
        title="Contacto | Reserva tu casa rural en Cantabria | La Rasilla"
        description="¿Tienes dudas? Contacta con La Rasilla, tu casa rural en Cantabria. Te ayudamos a planificar tu estancia en los Valles Pasiegos."
      />

      <HeroSection
        title="Estamos aquí para ayudarte"
        subtitle="¿Tienes alguna duda sobre la casa o el entorno? Contacta con nosotros y te responderemos lo antes posible."
        image="/images/pueblo3.jpg"
      />

      <SectionContainer>
        <div className="grid gap-16 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-serif font-bold text-stone-800 mb-6">Atención directa y personalizada</h2>
              <p className="text-lg text-stone-600 leading-relaxed">
                En La Rasilla creemos en el trato cercano. Al contactar con nosotros, hablas directamente con los propietarios de la <strong>casa rural en Cantabria</strong>. Sin intermediarios, sin esperas innecesarias.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex items-start gap-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700"><Phone size={24} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Teléfono y WhatsApp</h4>
                  <p className="text-stone-600">+34 690-288-707</p>
                  <p className="text-stone-600">+34 672-336-572</p>
                  <p className="text-sm text-stone-400 mt-1">Atención inmediata para tus dudas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700"><Mail size={24} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Correo Electrónico</h4>
                  <p className="text-stone-600">contacto@casarurallarasilla.com</p>
                  <p className="text-sm text-stone-400 mt-1">Respondemos en menos de 24 horas.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-700"><Clock size={24} /></div>
                <div>
                  <h4 className="font-bold text-stone-800">Horario de Atención</h4>
                  <p className="text-stone-600">Lunes a Domingo: 09:00 - 21:00</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4 items-center">
              <ShieldCheck className="text-emerald-600 shrink-0" size={32} />
              <p className="text-emerald-900 font-medium">
                Al reservar directamente con nosotros, te garantizamos el <strong>mejor precio online</strong> y condiciones flexibles.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-stone-100">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-stone-800">¡Mensaje enviado!</h3>
                <p className="text-stone-500 max-w-xs">
                  Hemos recibido tu consulta. Te responderemos en menos de 24 horas en el email <strong>{form.email}</strong>.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' }); }}
                  className="mt-4 text-sm text-emerald-700 font-medium hover:underline"
                >
                  Enviar otra consulta
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-2xl font-serif font-bold text-stone-800 mb-8">Envíanos un mensaje</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">Nombre completo *</label>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={e => set('nombre', e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => set('email', e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Teléfono</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={e => set('telefono', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      placeholder="+34 600 000 000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Asunto</label>
                    <input
                      type="text"
                      value={form.asunto}
                      onChange={e => set('asunto', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">Mensaje *</label>
                    <textarea
                      rows={4}
                      value={form.mensaje}
                      onChange={e => set('mensaje', e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      placeholder="Cuéntanos más sobre tu estancia..."
                    />
                  </div>
                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Enviar mensaje ahora'}
                  </button>
                  <p className="text-xs text-stone-400 text-center">
                    Al enviar este formulario, aceptas nuestra política de privacidad. Tus datos solo se usarán para responder a tu consulta.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </SectionContainer>
    </div>
  );
};

import { useMemo, useRef, useState } from 'react'
import { X, Loader2, FileText, Send, UploadCloud } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface Consulta {
  id: string
  property_id?: string
  nombre: string
  email: string
  telefono?: string
  asunto?: string
  mensaje: string
  estado: 'NUEVA' | 'VISTA' | 'RESPONDIDA' | 'ARCHIVADA'
  notas_admin?: string
  created_at: string
}

interface SendConsultaReplyResponse {
  ok?: boolean
  error?: string
  communicationId?: string | null
  resendId?: string | null
  status?: string
}


export function ReplyConsultaModal({
  consulta,
  onClose,
  onSent,
}: {
  consulta: Consulta
  onClose: () => void
  onSent: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const defaultSubject = useMemo(
    () => `Re: ${consulta.asunto || 'Tu consulta'}`,
    [consulta.asunto]
  )

  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(
    `Hola ${consulta.nombre},

Gracias por tu consulta.

En relación con tu mensaje:
"${consulta.mensaje}"

Te enviamos la información solicitada.

Un saludo.`
  )

  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!consulta.property_id) {
      setError('La consulta no tiene property_id asociado.')
      return
    }

    if (!subject.trim() || !body.trim()) {
      setError('Asunto y mensaje son obligatorios.')
      return
    }

    setSending(true)
    setError('')

    try {
      let attachmentName: string | null = null
      let attachmentUrl: string | null = null
      let attachmentContentType: string | null = null

      if (file) {
        const safeFileName = file.name.replace(/\s+/g, '_')
        const storagePath = `consultas/${consulta.id}/${Date.now()}-${safeFileName}`

        const { error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(storagePath, file, {
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          })

        if (uploadError) {
          throw uploadError
        }

        attachmentName = file.name
        attachmentContentType = file.type || 'application/octet-stream'

        const { data: publicUrlData } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(storagePath)

        attachmentUrl = publicUrlData?.publicUrl ?? null
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        throw sessionError
      }

      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        throw new Error('No hay sesión activa para enviar el email.')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send_consulta_reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            propertyId: consulta.property_id,
            consultaId: consulta.id,
            customerEmail: consulta.email,
            customerName: consulta.nombre,
            subject: subject.trim(),
            message: body.trim(),
            templateKey: attachmentName ? 'consulta_documents' : 'consulta_reply',
            attachmentName,
            attachmentUrl,
            attachmentContentType,
            summaryItems: [
              {
                label: 'Cliente',
                value: consulta.nombre || consulta.email,
              },
              {
                label: 'Email',
                value: consulta.email,
              },
              ...(consulta.telefono
                ? [
                    {
                      label: 'Teléfono',
                      value: consulta.telefono,
                    },
                  ]
                : []),
              ...(consulta.asunto
                ? [
                    {
                      label: 'Consulta',
                      value: consulta.asunto,
                    },
                  ]
                : []),
            ],
          }),
        }
      )

      const result = (await response.json().catch(() => ({}))) as SendConsultaReplyResponse

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'No se pudo enviar el email.')
      }

      // consulta_respuestas is already inserted by the send_consulta_reply edge function.
      // We only need to mark the consulta as RESPONDIDA here.

      const { error: consultaUpdateError } = await supabase
        .from('consultas')
        .update({
          estado: 'RESPONDIDA',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consulta.id)

      if (consultaUpdateError) {
        throw consultaUpdateError
      }

      onSent()
    } catch (err: any) {
      setError(err?.message || 'Error enviando respuesta')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-cyan-900/40 bg-[#0b1c34] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-900/40">
          <div>
            <h3 className="text-white font-bold text-lg">Contestar consulta</h3>
            <p className="text-xs text-slate-400 mt-1">
              {consulta.nombre} · {consulta.email}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#132743] text-slate-400"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Consulta original
            </p>
            <p className="text-sm text-slate-200 font-semibold">
              {consulta.asunto || 'Consulta general'}
            </p>
            <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">
              {consulta.mensaje}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Asunto del email
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-cyan-800/35 px-3 py-2.5 text-sm bg-[#132743] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
              placeholder="Asunto"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Respuesta
            </label>
            <textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-xl border border-cyan-800/35 px-3 py-3 text-sm bg-[#132743] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 resize-none"
              placeholder="Escribe aquí la respuesta..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Documento adjunto
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />

            {!file ? (
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-800/35 bg-[#132743] px-4 py-3 text-sm font-medium text-slate-200 hover:bg-[#18304f] transition-colors"
              >
                <UploadCloud size={16} />
                Seleccionar documento
              </button>
            ) : (
              <div className="rounded-2xl border border-cyan-800/35 bg-[#132743] px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 border border-cyan-800/35 hover:bg-[#18304f] transition-colors"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-300 border border-red-500/20 hover:bg-red-500/10 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
              Formatos permitidos: PDF, DOC y DOCX.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-cyan-900/40 flex justify-end gap-2">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-xl border border-cyan-800/35 text-slate-300 hover:bg-[#132743]"
          >
            Cancelar
          </button>

          <button
            onClick={handleSend}
            disabled={sending}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sending ? 'Enviando...' : 'Enviar email'}
          </button>
        </div>
      </div>
    </div>
  )
}
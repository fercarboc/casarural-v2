// src/admin/components/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content: '¡Hola! Soy el asistente de StayNex. Puedo ayudarte con cualquier duda sobre cómo usar la aplicación. ¿En qué puedo ayudarte?',
}

export const ChatWidget: React.FC = () => {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const history = messages.slice(1) // excluir el mensaje de bienvenida del historial
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.functions.invoke('chatbot-support', {
        body: { message: text, history },
      })

      if (error) throw new Error(error.message ?? 'Error del asistente')
      if (data?.error) throw new Error(data.error)

      const assistantMsg: Message = { role: 'assistant', content: data.reply ?? '' }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      setError(e.message ?? 'No se pudo obtener respuesta')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([WELCOME])
    setError('')
  }

  return (
    <>
      {/* ── Panel flotante ────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-sidebar-border bg-sidebar-bg shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/80 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/20">
                <Bot size={15} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Asistente StayNex</p>
                <p className="text-[10px] text-slate-500 leading-tight">Soporte de uso de la app</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Nueva conversación"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-sidebar-hover hover:text-slate-300 transition-colors"
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-sidebar-hover hover:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex max-h-[420px] min-h-[200px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/20">
                  <Bot size={13} className="text-brand-400" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-sidebar-border bg-admin-card px-3 py-2.5">
                  <Loader2 size={13} className="animate-spin text-slate-500" />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-sidebar-border bg-admin-card/50 px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Escribe tu pregunta…"
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-sidebar-border bg-sidebar-bg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none disabled:opacity-50"
                style={{ maxHeight: '100px', overflowY: 'auto' }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-all hover:bg-brand-700 disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-600">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}

      {/* ── Botón flotante ────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`fixed bottom-5 right-5 z-50 flex h-13 w-13 items-center justify-center rounded-2xl shadow-lg transition-all ${
          open
            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            : 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-brand-600/30 hover:shadow-xl'
        }`}
        title={open ? 'Cerrar asistente' : 'Abrir asistente de soporte'}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  )
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2.5 text-sm text-white">
          <Markdown text={msg.content} />
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700">
          <User size={12} className="text-slate-300" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/20">
        <Bot size={13} className="text-brand-400" />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-sidebar-border bg-admin-card px-3 py-2.5 text-sm text-slate-200">
        <Markdown text={msg.content} />
      </div>
    </div>
  )
}

// Render básico de Markdown: negrita, listas, saltos de línea
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />

        // Lista numerada: "1. texto"
        const numMatch = line.match(/^(\d+)\.\s+(.+)/)
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0 font-semibold text-brand-400">{numMatch[1]}.</span>
              <span><InlineMarkdown text={numMatch[2]} /></span>
            </div>
          )
        }

        // Lista con guión o asterisco: "- texto" o "* texto"
        const bulletMatch = line.match(/^[-*]\s+(.+)/)
        if (bulletMatch) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="shrink-0 text-brand-400">·</span>
              <span><InlineMarkdown text={bulletMatch[1]} /></span>
            </div>
          )
        }

        return <p key={i}><InlineMarkdown text={line} /></p>
      })}
    </div>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  // Render **negrita**
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

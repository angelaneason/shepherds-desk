'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessageSquare, X, Send, HelpCircle, Bug, Lightbulb, CheckCircle2, Loader2, Info } from 'lucide-react'

type CategoryType = 'question' | 'bug' | 'enhancement'

export function SupportChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<CategoryType>('question')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Hide floating widget inside Pulpit Mode so it never distracts during preaching
  if (pathname?.includes('/pulpit')) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || submitting) return

    setSubmitting(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          message: message.trim(),
          pageUrl: typeof window !== 'undefined' ? window.location.pathname : pathname,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message. Please try again.')
      }

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setMessage('')
        setCategory('question')
        setIsOpen(false)
      }, 2600)
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const placeholders: Record<CategoryType, string> = {
    question: 'Type your question here...',
    bug: 'Tell us what happened and what page you were on...',
    enhancement: 'Share your idea or feature request...',
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {isOpen ? (
        <div className="w-[340px] sm:w-[370px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-[#022d5c] text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-white/90" />
              <h3 className="font-semibold text-base tracking-tight">Help &amp; Support</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close Help and Support"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[340px]">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-lg text-[#022d5c]">Message Sent!</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Thank you, Pastor. Your message has been sent to our support team at{' '}
                <span className="font-semibold text-[#022d5c]">support@theshepherdsdesk.app</span> and we will follow up with you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Top Prompt & Category Selection */}
              <div className="p-5 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-11 h-11 bg-blue-50 text-[#022d5c] rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-[#022d5c] text-base">How can we help you today?</h4>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setCategory('question')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      category === 'question'
                        ? 'border-[#022d5c] bg-blue-50/50 ring-1 ring-[#022d5c]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">Ask a Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      category === 'bug'
                        ? 'border-[#022d5c] bg-blue-50/50 ring-1 ring-[#022d5c]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Bug className="w-5 h-5 text-red-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">Report a Bug</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategory('enhancement')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      category === 'enhancement'
                        ? 'border-[#022d5c] bg-blue-50/50 ring-1 ring-[#022d5c]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Lightbulb className="w-5 h-5 text-[#D0A348] shrink-0" />
                    <span className="text-sm font-semibold text-gray-800">Request Enhancement</span>
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Message Input & Send Button */}
              <div className="p-3.5 bg-gray-50/70 border-t border-gray-200 flex items-end gap-2.5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={placeholders[category]}
                  rows={3}
                  className="flex-1 resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#022d5c] focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSubmit(e)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || submitting}
                  className="w-11 h-11 rounded-xl bg-[#022d5c] hover:bg-[#061e38] disabled:bg-[#8ca0b8] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm"
                  title="Send message"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-[#022d5c] text-white rounded-full shadow-lg hover:bg-[#061e38] transition-all hover:scale-105 cursor-pointer border border-[#D0A348]/40"
          title="Help & Support"
        >
          <HelpCircle className="w-4 h-4 text-[#D0A348]" />
          <span className="text-xs font-semibold">Help</span>
        </button>
      )}
    </div>
  )
}

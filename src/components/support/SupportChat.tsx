'use client'

import { useState } from 'react'
import { MessageCircle, X, HelpCircle, Bug, Sparkles, ChevronRight, Send, ArrowLeft, BookOpen } from 'lucide-react'

type ChatView = 'menu' | 'question' | 'bug' | 'enhancement' | 'faq'

const FAQ_ITEMS = [
  { q: 'How do I create a sermon?', a: 'Go to Sermons → click "New Sermon". Fill in your title, scripture, and start writing. You can also use voice dictation!' },
  { q: 'How do I scan a handwritten sermon?', a: 'Go to Sermons → click "Scan Sermon". Take photos of each page and the AI will transcribe them.' },
  { q: 'How does the AI assistant work?', a: 'In the sermon editor, click the AI button (sparkles icon). It helps brainstorm, outline, find illustrations, and polish — but never writes for you.' },
  { q: 'How do I add recurring events?', a: 'Go to Calendar → Add Event → set the Repeat dropdown to Weekly, Bi-Weekly, or Monthly.' },
  { q: 'What is the Study Time Guardian?', a: 'It tracks your study/preparation hours and gently reminds you to protect your personal development time.' },
]

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView] = useState<ChatView>('menu')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const handleSubmit = () => {
    if (!message.trim()) return
    setSubmitted(true)
    setMessage('')
    setTimeout(() => {
      setSubmitted(false)
      setView('menu')
    }, 3000)
  }

  const resetAndClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      setView('menu')
      setSubmitted(false)
      setMessage('')
    }, 300)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 w-[340px] max-h-[480px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-[#022d5c] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <button onClick={() => setView('menu')} className="p-1 hover:bg-white/10 rounded-full mr-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">
                {view === 'menu' && 'Support'}
                {view === 'question' && 'Ask a Question'}
                {view === 'bug' && 'Report a Bug'}
                {view === 'enhancement' && 'Request Feature'}
                {view === 'faq' && 'Help & FAQ'}
              </span>
            </div>
            <button onClick={resetAndClose} className="p-1 hover:bg-white/10 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === 'menu' && (
              <div className="p-4">
                <div className="text-center mb-5">
                  <img src="/logo-dark.png" alt="The Shepherd's Desk" className="h-20 mx-auto mb-3 object-contain rounded-lg" />
                  <p className="text-sm text-gray-500">How can we help you today?</p>
                </div>
                <div className="space-y-2">
                  {[
                    { view: 'faq' as ChatView, icon: BookOpen, label: 'Help & FAQ', color: 'text-[#022d5c]' },
                    { view: 'question' as ChatView, icon: HelpCircle, label: 'Ask a Question', color: 'text-[#022d5c]' },
                    { view: 'bug' as ChatView, icon: Bug, label: 'Report a Bug', color: 'text-red-500' },
                    { view: 'enhancement' as ChatView, icon: Sparkles, label: 'Request Feature', color: 'text-[#D0A348]' },
                  ].map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        onClick={() => setView(item.view)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-[#D0A348] hover:bg-[#D0A348]/5 transition-all text-left group"
                      >
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#D0A348]" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {view === 'faq' && (
              <div className="p-4 space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium text-gray-700">{item.q}</span>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${expandedFaq === i ? 'rotate-90' : ''}`} />
                    </button>
                    {expandedFaq === i && (
                      <div className="px-4 pb-3 text-sm text-gray-500 border-t border-gray-100 pt-2">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {(view === 'question' || view === 'bug' || view === 'enhancement') && (
              <div className="p-4">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">✅</span>
                    </div>
                    <p className="font-semibold text-gray-800">Thank you!</p>
                    <p className="text-sm text-gray-500 mt-1">We&apos;ll get back to you soon.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      {view === 'question' && 'What would you like to know?'}
                      {view === 'bug' && 'Please describe the issue you encountered.'}
                      {view === 'enhancement' && 'What feature would make your ministry easier?'}
                    </p>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        view === 'question' ? 'Type your question...'
                        : view === 'bug' ? 'Describe what happened...'
                        : 'Describe your idea...'
                      }
                      className="w-full h-32 p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#D0A348] focus:ring-1 focus:ring-[#D0A348]"
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={!message.trim()}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-[#022d5c] text-white py-3 rounded-xl font-medium text-sm hover:bg-[#022d5c]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Send Message
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[#022d5c] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </>
  )
}

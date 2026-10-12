'use client'

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Copy, Check, Type, Sparkles } from 'lucide-react'

interface PulpitPrintModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  sundayDate: string
  churchName?: string
  pastorName?: string
  scriptSpoken: string
  scriptBulletin: string
}

export function PulpitPrintModal({
  isOpen,
  onClose,
  title,
  sundayDate,
  churchName = "The Shepherd's Desk",
  pastorName = '',
  scriptSpoken,
  scriptBulletin
}: PulpitPrintModalProps) {
  const [formatType, setFormatType] = useState<'spoken' | 'bulletin'>('spoken')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'pulpit'>('pulpit')
  const [copied, setCopied] = useState(false)
  const printContentRef = useRef<HTMLDivElement>(null)

  const activeContent = formatType === 'spoken' ? scriptSpoken : scriptBulletin

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=1000')
    if (!printWindow) {
      window.print()
      return
    }

    const fontSizePx = fontSize === 'pulpit' ? '20px' : fontSize === 'large' ? '17px' : '14px'
    const lineHeight = fontSize === 'pulpit' ? '1.8' : fontSize === 'large' ? '1.6' : '1.5'

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Pulpit Print</title>
          <style>
            @page {
              margin: 0.8in;
              size: letter portrait;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Georgia", "Times New Roman", serif;
              color: #111827;
              background: #ffffff;
              margin: 0;
              padding: 20px;
              font-size: ${fontSizePx};
              line-height: ${lineHeight};
            }
            .header {
              border-bottom: 2px solid #022d5c;
              padding-bottom: 14px;
              margin-bottom: 24px;
            }
            .church-name {
              font-size: 14px;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              color: #4b5563;
              font-weight: 700;
              margin: 0 0 4px 0;
            }
            .main-title {
              font-size: 24px;
              font-weight: 800;
              color: #022d5c;
              margin: 0 0 4px 0;
            }
            .meta {
              font-size: 14px;
              color: #6b7280;
              margin: 0;
            }
            .badge {
              display: inline-block;
              background: #f3f4f6;
              color: #374151;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 6px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: ${fontSizePx};
              line-height: ${lineHeight};
            }
            .footer {
              margin-top: 40px;
              padding-top: 12px;
              border-top: 1px solid #e5e7eb;
              font-size: 12px;
              color: #9ca3af;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${churchName ? `<div class="church-name">${churchName}</div>` : ''}
            <h1 class="main-title">${title}</h1>
            <p class="meta">
              Service Date: <strong>${sundayDate}</strong>
              ${pastorName ? ` &bull; Pastor: <strong>${pastorName}</strong>` : ''}
            </p>
            <div class="badge">${formatType === 'spoken' ? 'Pulpit Spoken Script' : 'Printed Church Bulletin / Slides'}</div>
          </div>

          <div class="content">${activeContent.replace(/\n/g, '<br/>')}</div>

          <div class="footer">
            Prepared with The Shepherd's Desk &bull; ${new Date().toLocaleDateString()}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-[#022d5c]">
                Pulpit & Bulletin Print View
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                {title} &bull; {sundayDate}
              </p>
            </div>

            {/* Print & Copy buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs text-[#022d5c]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Text'}
              </Button>
              <Button
                onClick={handlePrint}
                size="sm"
                className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>

          {/* Controls Bar: Format Toggle & Font Size */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFormatType('spoken')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  formatType === 'spoken'
                    ? 'bg-white text-[#022d5c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🎙️ Pulpit Script (Spoken)
              </button>
              <button
                type="button"
                onClick={() => setFormatType('bulletin')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  formatType === 'bulletin'
                    ? 'bg-white text-[#022d5c] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📄 Bulletin / Slides
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>Font Size:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setFontSize('normal')}
                  className={`px-2 py-0.5 rounded text-xs ${fontSize === 'normal' ? 'bg-white font-bold text-[#022d5c] shadow-xs' : 'text-slate-600'}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('large')}
                  className={`px-2 py-0.5 rounded text-xs ${fontSize === 'large' ? 'bg-white font-bold text-[#022d5c] shadow-xs' : 'text-slate-600'}`}
                >
                  Large
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('pulpit')}
                  className={`px-2 py-0.5 rounded text-xs ${fontSize === 'pulpit' ? 'bg-[#D0A348] font-bold text-white shadow-xs' : 'text-slate-600'}`}
                >
                  Pulpit (20pt)
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Paper Document Preview */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <div
            ref={printContentRef}
            className={`max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm transition-all ${
              fontSize === 'pulpit' ? 'text-xl leading-relaxed' : fontSize === 'large' ? 'text-base leading-relaxed' : 'text-sm leading-normal'
            }`}
          >
            <div className="border-b border-[#022d5c]/20 pb-4 mb-6">
              {churchName && (
                <div className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">
                  {churchName}
                </div>
              )}
              <h2 className="text-2xl font-black text-[#022d5c]">{title}</h2>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span>Date: <strong>{sundayDate}</strong></span>
                {pastorName && <span>Pastor: <strong>{pastorName}</strong></span>}
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                  {formatType === 'spoken' ? 'Pulpit Script' : 'Bulletin & Slides'}
                </span>
              </div>
            </div>

            <div className="whitespace-pre-wrap text-slate-800 font-serif">
              {activeContent}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Click <strong>Print / Save PDF</strong> to print directly or save a clean pulpit binder copy.
          </p>
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

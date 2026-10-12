'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Copy, Check, Type, BookOpen, ListOrdered } from 'lucide-react'
import { sermonContentToHtml, extractSermonOutline } from '@/lib/sermon-content'

interface SermonPrintModalProps {
  isOpen: boolean
  onClose: () => void
  sermon: {
    title: string
    subtitle?: string
    scripture_primary?: string
    series_name?: string
    preach_date?: string
    location?: string
    content: any
  }
  pastorName?: string
  churchName?: string
}

export function SermonPrintModal({
  isOpen,
  onClose,
  sermon,
  pastorName = '',
  churchName = "The Shepherd's Desk"
}: SermonPrintModalProps) {
  const [printMode, setPrintMode] = useState<'manuscript' | 'outline'>('manuscript')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'pulpit'>('large')
  const [copied, setCopied] = useState(false)

  const outlineItems = extractSermonOutline(sermon.content)
  const fullHtmlContent = sermonContentToHtml(sermon.content)

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000')
    if (!printWindow) {
      window.print()
      return
    }

    const fontSizePx = fontSize === 'pulpit' ? '20px' : fontSize === 'large' ? '16px' : '14px'
    const lineHeight = fontSize === 'pulpit' ? '1.8' : fontSize === 'large' ? '1.6' : '1.5'

    let bodyHtml = ''
    if (printMode === 'manuscript') {
      bodyHtml = fullHtmlContent || '<p><em>No manuscript content written yet.</em></p>'
    } else {
      if (outlineItems.length === 0) {
        bodyHtml = '<p><em>No outline points detected in this sermon yet. Add headings or bullet points to generate an outline.</em></p>'
      } else {
        bodyHtml = '<div class="outline-list">' + outlineItems.map(item => {
          const indent = item.level === 1 ? '0px' : item.level === 2 ? '24px' : item.level === 3 ? '44px' : '64px'
          const weight = item.level <= 2 ? 'bold' : 'normal'
          const color = item.level === 1 ? '#022d5c' : '#1f2937'
          const prefix = item.level === 1 ? '■ ' : item.level === 2 ? '● ' : item.level === 3 ? '◆ ' : '• '
          return `<div style="margin-left: ${indent}; font-weight: ${weight}; color: ${color}; margin-bottom: 0.6em;">${prefix}${item.text}</div>`
        }).join('') + '</div>'
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sermon.title || 'Sermon'} - Pulpit Print</title>
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
              font-size: 13px;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              color: #4b5563;
              font-weight: 700;
              margin: 0 0 4px 0;
            }
            .main-title {
              font-size: 26px;
              font-weight: 800;
              color: #022d5c;
              margin: 0 0 6px 0;
            }
            .meta {
              font-size: 14px;
              color: #4b5563;
              margin: 0 0 4px 0;
            }
            .badge {
              display: inline-block;
              background: #f3f4f6;
              color: #374151;
              padding: 3px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 6px;
            }
            .content {
              word-wrap: break-word;
              font-size: ${fontSizePx};
              line-height: ${lineHeight};
            }
            .footer {
              margin-top: 50px;
              padding-top: 14px;
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
            <h1 class="main-title">${sermon.title || 'Untitled Sermon'}</h1>
            ${sermon.subtitle ? `<div style="font-size: 16px; color: #4b5563; margin-bottom: 6px;">${sermon.subtitle}</div>` : ''}
            <div class="meta">
              ${sermon.scripture_primary ? `Scripture: <strong>${sermon.scripture_primary}</strong>` : ''}
              ${sermon.series_name ? ` &bull; Series: <strong>${sermon.series_name}</strong>` : ''}
              ${sermon.preach_date ? ` &bull; Date: <strong>${sermon.preach_date}</strong>` : ''}
              ${pastorName ? ` &bull; Pastor: <strong>${pastorName}</strong>` : ''}
            </div>
            <div class="badge">${printMode === 'manuscript' ? 'Full Manuscript' : 'Pulpit Outline'}</div>
          </div>

          <div class="content">
            ${bodyHtml}
          </div>

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
    let textToCopy = ''
    if (printMode === 'manuscript') {
      textToCopy = fullHtmlContent.replace(/<[^>]+>/g, ' ')
    } else {
      textToCopy = outlineItems.map(item => '  '.repeat(item.level - 1) + item.text).join('\n')
    }
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[95vw] max-h-[92vh] flex flex-col p-6 bg-slate-50/95 shadow-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-[#022d5c]">
                Print Sermon
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-1">
                {sermon.title || 'Untitled Sermon'} {sermon.scripture_primary ? `• ${sermon.scripture_primary}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs text-[#022d5c]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                onClick={handlePrint}
                size="sm"
                className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 gap-1.5 text-xs font-bold"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>

          {/* Mode & Font controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-slate-200">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setPrintMode('manuscript')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  printMode === 'manuscript'
                    ? 'bg-[#022d5c] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Full Manuscript
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('outline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  printMode === 'outline'
                    ? 'bg-[#022d5c] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Pulpit Outline
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Type className="w-3.5 h-3.5 text-slate-400" />
              <span>Font Size:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFontSize('normal')}
                  className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${fontSize === 'normal' ? 'bg-[#022d5c] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Standard (14pt)
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('large')}
                  className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${fontSize === 'large' ? 'bg-[#022d5c] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Large (16pt)
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize('pulpit')}
                  className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${fontSize === 'pulpit' ? 'bg-[#D0A348] font-bold text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Pulpit (20pt)
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Paper Document Preview Area */}
        <div className="flex-1 overflow-y-auto py-6 px-4 bg-slate-200/50 rounded-xl border border-slate-300/60 shadow-inner flex justify-center">
          <div
            className={`max-w-3xl w-full bg-white p-10 sm:p-14 rounded-xs border border-slate-300 shadow-xl transition-all font-serif min-h-[650px] ${
              fontSize === 'pulpit' ? 'text-xl leading-relaxed' : fontSize === 'large' ? 'text-base leading-relaxed' : 'text-sm leading-normal'
            }`}
          >
            <div className="border-b-2 border-[#022d5c] pb-5 mb-8">
              {churchName && (
                <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-1">
                  {churchName}
                </div>
              )}
              <h2 className="text-3xl font-black text-[#022d5c] leading-tight">{sermon.title || 'Untitled Sermon'}</h2>
              {sermon.subtitle && (
                <div className="text-base text-slate-600 mt-1.5 italic font-sans">{sermon.subtitle}</div>
              )}
              <div className="text-xs text-slate-500 mt-3 flex flex-wrap items-center gap-3 font-sans">
                {sermon.scripture_primary && <span>Scripture: <strong>{sermon.scripture_primary}</strong></span>}
                {sermon.series_name && <span>• Series: <strong>{sermon.series_name}</strong></span>}
                {sermon.preach_date && <span>• Date: <strong>{sermon.preach_date}</strong></span>}
                {pastorName && <span>• Pastor: <strong>{pastorName}</strong></span>}
                <span className="bg-[#D0A348]/15 text-[#8b6920] px-2.5 py-0.5 rounded font-bold text-[11px] ml-auto">
                  {printMode === 'manuscript' ? 'Full Manuscript' : 'Pulpit Outline'}
                </span>
              </div>
            </div>

            {printMode === 'manuscript' ? (
              <div
                className="text-slate-900 print-preview-body"
                dangerouslySetInnerHTML={{ __html: fullHtmlContent || '<p class="italic text-slate-400">No content entered yet.</p>' }}
              />
            ) : (
              <div className="space-y-3 text-slate-900">
                {outlineItems.length === 0 ? (
                  <p className="italic text-slate-400 text-xs">
                    No outline items detected. Use headings or bullet points in the sermon editor to populate the pulpit outline.
                  </p>
                ) : (
                  outlineItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{ paddingLeft: `${(item.level - 1) * 24}px` }}
                      className={`${item.level <= 2 ? 'font-bold text-[#022d5c]' : 'text-slate-800'} py-1 flex items-start gap-2.5`}
                    >
                      <span className="text-[#D0A348] select-none shrink-0 mt-0.5">
                        {item.level === 1 ? '■' : item.level === 2 ? '●' : item.level === 3 ? '◆' : '•'}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex justify-between items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Click <strong>Print / Save PDF</strong> for a clean, distraction-free pulpit printout.
          </p>
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

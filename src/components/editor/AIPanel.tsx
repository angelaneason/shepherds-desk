'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Copy, RefreshCw, Loader2, Search, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sermonContent: string;
  selectedText: string;
  onInsertText: (text: string) => void;
}

export function AIPanel({ isOpen, onClose, sermonContent, selectedText, onInsertText }: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [topicInput, setTopicInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const handleAction = async (action: string, customText?: string) => {
    setLoading(true);
    setError('');
    setResult('');
    setLastAction(action);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          context: sermonContent,
          selection: selectedText || customText || '',
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data.result);
    } catch (err: any) {
      setError(err.message || "I had trouble with that. Let's try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatResult = (text: string) => {
    const formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*(\d+)\.\s/gm, '<br/><strong>$1.</strong> ')
      .replace(/^\s*[-•]\s/gm, '<br/>• ')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#F8F5EE] border-l border-[#D0A348]/30 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 translate-x-0">
      <div className="p-4 border-b border-[#D0A348]/20 bg-[#022d5c] text-white flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#D0A348]" />
            AI Assistant
          </h2>
          <p className="text-sm mt-1 text-gray-200">Your calling. Your voice. God's Message.</p>
          <p className="text-xs mt-1 text-gray-300 italic">AI simply helps you organize and develop what God has placed on your heart.</p>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {!result && !loading && (
          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-[#D0A348]/40 shadow-xs space-y-2">
              <label className="text-xs font-semibold text-[#022d5c] block">
                Scripture Passage or Topic
              </label>
              <Input 
                placeholder="e.g. John 3:16, Grace in the storm..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="bg-[#F8F5EE]/50 border-gray-200 text-sm focus-visible:ring-[#D0A348]"
              />
              <p className="text-[11px] text-gray-500">
                Type your passage or topic above, then pick an action below:
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assistant Actions</p>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#022d5c]/20 hover:bg-[#022d5c]/5" onClick={() => handleAction('brainstorm_titles', topicInput || customPrompt)}>✨ Brainstorm Titles</Button>
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#022d5c]/20 hover:bg-[#022d5c]/5" onClick={() => handleAction('generate_outline', topicInput || customPrompt)}>📝 Generate Outline</Button>
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#022d5c]/20 hover:bg-[#022d5c]/5" onClick={() => handleAction('find_illustrations', topicInput || customPrompt)}>💡 Find Illustrations</Button>
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#022d5c]/20 hover:bg-[#022d5c]/5" onClick={() => handleAction('suggest_transitions', topicInput || customPrompt)}>🔗 Suggest Transitions</Button>
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#022d5c]/20 hover:bg-[#022d5c]/5" onClick={async () => {
                  const scripture = topicInput || customPrompt;
                  if (!scripture) { setError('Enter a scripture passage above first.'); return; }
                  setLoading(true); setError(''); setResult(''); setLastAction('cross_reference');
                  try {
                    const res = await fetch('/api/ai/cross-reference', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ scripture, context: sermonContent?.substring(0, 500) })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed');
                    const refs = Array.isArray(data) ? data : data.references || [];
                    const formatted = refs.map((r: any) => `📖 ${r.reference} (${r.type})\n${r.explanation}`).join('\n\n');
                    setResult(formatted || 'No cross-references found.');
                  } catch (err: any) { setError(err.message); }
                  setLoading(false);
                }}>📖 Cross-References</Button>
                <Button variant="outline" className="justify-start text-[#022d5c] border-[#D0A348] bg-[#D0A348]/10 hover:bg-[#D0A348]/20 font-medium" onClick={() => handleAction('search_sermons', topicInput || customPrompt)}>🔍 Search My Sermons & Notes</Button>
                
                {selectedText && (
                  <>
                    <Button variant="outline" className="justify-start text-[#022d5c] border-[#D0A348] hover:bg-[#D0A348]/10" onClick={() => handleAction('polish_text')}>✏️ Polish Selected Text</Button>
                    <Button variant="outline" className="justify-start text-[#022d5c] border-[#D0A348] hover:bg-[#D0A348]/10" onClick={() => handleAction('expand_point')}>📖 Expand Point</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-[#022d5c]">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-sm">Thinking...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">
            {error}
            <Button variant="link" className="px-0 ml-2 text-red-800" onClick={() => lastAction && handleAction(lastAction, topicInput || customPrompt)}>Try again</Button>
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="self-start text-[#022d5c] hover:bg-[#022d5c]/10 -ml-2 text-xs font-semibold flex items-center gap-1.5"
              onClick={() => { setResult(''); setError(''); }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Assistant Menu
            </Button>

            <div className="bg-white rounded-md border border-[#D0A348]/30 p-4 shadow-sm flex flex-col">
              <div className="prose prose-sm max-w-none text-gray-800">
                {formatResult(result)}
              </div>
              
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-500 hover:text-[#022d5c]"
                  onClick={() => { setResult(''); setError(''); }}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => lastAction && handleAction(lastAction, topicInput || customPrompt)}>
                    <RefreshCw className="h-4 w-4 mr-1.5" /> Retry
                  </Button>
                  <Button size="sm" className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white" onClick={() => onInsertText(result)}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy to Editor
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#D0A348]/20 bg-white">
        <div className="flex gap-2">
          <Textarea 
            placeholder="Ask anything or request specific sermon help..." 
            className="min-h-[60px] resize-none focus-visible:ring-[#D0A348]"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (customPrompt.trim()) {
                  const p = customPrompt.trim();
                  setCustomPrompt('');
                  handleAction('custom', p);
                }
              }
            }}
          />
          <Button 
            size="icon" 
            className="bg-[#D0A348] hover:bg-[#D0A348]/90 text-white shrink-0 self-end"
            onClick={() => {
              if (customPrompt.trim()) {
                const p = customPrompt.trim();
                setCustomPrompt('');
                handleAction('custom', p);
              }
            }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

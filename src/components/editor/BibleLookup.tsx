'use client';

import React, { useState } from 'react';
import { BookOpen, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BibleLookupProps {
  onInsert: (text: string) => void;
}

export function BibleLookup({ onInsert }: BibleLookupProps) {
  const [reference, setReference] = useState('');
  const [translation, setTranslation] = useState('kjv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reference: string; text: string; translation: string } | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/bible?reference=${encodeURIComponent(reference)}&translation=${translation}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch verse');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error looking up verse. Please check the reference.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (result) {
      const formattedText = `<blockquote><p>${result.text}</p><footer>— ${result.reference} (${result.translation})</footer></blockquote><p></p>`;
      onInsert(formattedText);
      setResult(null);
      setReference('');
    }
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="Look up a verse (e.g. John 3:16)"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          className="flex-1 focus-visible:ring-[#D0A348]"
        />
        <select 
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D0A348]"
        >
          <option value="kjv">KJV</option>
          <option value="asv">ASV</option>
          <option value="web">WEB</option>
          <option value="bbe">BBE</option>
          <option value="darby">Darby</option>
          <option value="ylt">YLT</option>
        </select>
        <Button type="submit" size="icon" className="bg-[#082C50] hover:bg-[#082C50]/90 text-white shrink-0" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-red-600 mb-2">{error}</p>
      )}

      {result && (
        <div className="space-y-3">
          <div className="p-3 bg-[#F8F5EE] border-l-4 border-[#D0A348] rounded-r-md">
            <p className="text-sm text-gray-800 italic">{result.text}</p>
            <p className="text-xs text-gray-500 font-semibold mt-2 text-right">
              {result.reference} ({result.translation})
            </p>
          </div>
          <Button 
            className="w-full bg-[#D0A348] hover:bg-[#D0A348]/90 text-white" 
            onClick={handleInsert}
          >
            <BookOpen className="h-4 w-4 mr-2" /> Insert into Sermon
          </Button>
        </div>
      )}
    </div>
  );
}

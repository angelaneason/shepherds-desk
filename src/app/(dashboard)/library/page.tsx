'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  REFERENCE_SERMONS,
  REFERENCE_VOLUMES,
  ReferenceSermon,
  searchReferenceLibrary,
} from '@/lib/data/referenceLibrary';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  BookOpen,
  Landmark,
  HeartHandshake,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Printer,
  ChevronRight,
  ExternalLink,
  BookMarked,
  Quote,
  Lightbulb,
  ArrowRight,
  Bookmark,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ReferenceLibraryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolume, setSelectedVolume] = useState<string>('all');
  const [selectedTestament, setSelectedTestament] = useState<string>('all');
  const [selectedSermonId, setSelectedSermonId] = useState<string>(REFERENCE_SERMONS[0].id);
  const [activeTab, setActiveTab] = useState<'manuscript' | 'outline'>('outline');
  const [isAdapting, setIsAdapting] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState<string | null>(null);
  const [savedIdeaMsg, setSavedIdeaMsg] = useState<string | null>(null);

  // Filtered sermons
  const filteredSermons = useMemo(() => {
    return searchReferenceLibrary(searchQuery, selectedVolume, selectedTestament);
  }, [searchQuery, selectedVolume, selectedTestament]);

  // Currently selected sermon
  const currentSermon = useMemo(() => {
    return REFERENCE_SERMONS.find((s) => s.id === selectedSermonId) || filteredSermons[0] || REFERENCE_SERMONS[0];
  }, [selectedSermonId, filteredSermons]);

  // Handler: Adapt as My Sermon
  const handleAdaptAsMySermon = async () => {
    if (!currentSermon) return;
    setIsAdapting(true);

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        alert('Please sign in to save this sermon to your personal drafts.');
        setIsAdapting(false);
        return;
      }

      // Format markdown content including outline and manuscript
      let initialContent = `# ${currentSermon.title}\n\n`;
      initialContent += `**Series:** ${currentSermon.series_name}\n`;
      initialContent += `**Scripture:** ${currentSermon.scripture_primary}\n\n`;
      initialContent += `> *Big Idea:* ${currentSermon.big_idea}\n\n`;

      initialContent += `## Homiletical Outline\n\n`;
      currentSermon.outline.forEach((point) => {
        initialContent += `### Point ${point.roman}: ${point.title}\n`;
        if (point.explanation) {
          initialContent += `${point.explanation}\n\n`;
        }
        if (point.subpoints && point.subpoints.length > 0) {
          point.subpoints.forEach((sp) => {
            initialContent += `- ${sp}\n`;
          });
          initialContent += '\n';
        }
      });

      if (currentSermon.illustrations && currentSermon.illustrations.length > 0) {
        initialContent += `## Pastoral Illustrations\n\n`;
        currentSermon.illustrations.forEach((ill) => {
          initialContent += `### ${ill.title}\n${ill.content}\n\n`;
        });
      }

      initialContent += `## Manuscript & Exposition\n\n${currentSermon.full_text}\n\n`;
      initialContent += `## Practical Applications\n\n`;
      currentSermon.application_points.forEach((app) => {
        initialContent += `1. ${app}\n`;
      });

      // Insert into sermons table
      const { data: newSermon, error: insertErr } = await supabase
        .from('sermons')
        .insert({
          author_id: user.id,
          title: currentSermon.title,
          subtitle: currentSermon.subtitle,
          scripture_primary: currentSermon.scripture_primary,
          series_name: currentSermon.series_name,
          content: initialContent,
          status: 'draft',
        } as any)
        .select()
        .single();

      if (insertErr) {
        throw insertErr;
      }

      if (newSermon) {
        router.push(`/sermons/${newSermon.id}`);
      }
    } catch (err: any) {
      console.error('Error adapting sermon:', err);
      alert(err.message || 'Failed to adapt sermon. Please try again.');
    } finally {
      setIsAdapting(false);
    }
  };

  // Handler: Save quote/illustration to ideas
  const handleSaveToIdeas = async (text: string, category = 'Sermon Idea') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to save ideas.');
        return;
      }

      const { error } = await supabase.from('ideas').insert({
        profile_id: user.id,
        content: `[${category}] ${text}`,
        source_type: 'reference_library',
        archived: false,
      } as any);

      if (error) throw error;
      setSavedIdeaMsg('Saved to Ideas!');
      setTimeout(() => setSavedIdeaMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save to Ideas.');
    }
  };

  const handleCopyQuote = (quote: string) => {
    navigator.clipboard.writeText(quote);
    setCopiedQuote(quote);
    setTimeout(() => setCopiedQuote(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] pb-24 text-slate-900">
      {/* Header Banner */}
      <div className="border-b border-[#E5E0D0] bg-[#022d5c] px-6 py-10 text-white shadow-md">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[#D0A348] text-sm font-semibold tracking-wider uppercase mb-2">
                <BookMarked className="h-4 w-4" />
                The Preacher's Archive
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-white">
                Pastoral Reference Library
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-200 max-w-2xl leading-relaxed">
                A prestigious compendium of timeless classic manuscripts and structured homiletical outlines. 
                Study the masters, cross-reference scripture, or adapt any outline directly into your sermon builder.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/sermons">
                <Button variant="outline" className="border-slate-400 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  Back to My Sermons
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-8 max-w-3xl relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Scripture (e.g. Romans 8, Psalm 23), preacher, topic, or keyword..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 shadow-inner focus:border-[#D0A348] focus:outline-none focus:ring-1 focus:ring-[#D0A348]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-3 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Volume Filter Pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {REFERENCE_VOLUMES.map((vol) => (
              <button
                key={vol.id}
                onClick={() => setSelectedVolume(vol.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  selectedVolume === vol.id
                    ? 'bg-[#D0A348] text-slate-950 font-semibold shadow-sm'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {vol.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
        {savedIdeaMsg && (
          <div className="mb-4 rounded-lg bg-emerald-100 border border-emerald-300 p-3 text-emerald-800 text-sm font-medium flex items-center gap-2">
            <Check className="h-4 w-4" />
            {savedIdeaMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Shelf Index (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D0]">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Library Shelf ({filteredSermons.length})
              </span>
              <span className="text-xs text-slate-400">Click to study</span>
            </div>

            {filteredSermons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-white/60">
                <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-600">No manuscripts match your query.</p>
                <p className="text-xs text-slate-400 mt-1">Try searching by scripture or clearing filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedVolume('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[85vh] overflow-y-auto pr-1">
                {filteredSermons.map((sermon) => {
                  const isSelected = sermon.id === currentSermon.id;
                  return (
                    <div
                      key={sermon.id}
                      onClick={() => setSelectedSermonId(sermon.id)}
                      className={`group cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left ${
                        isSelected
                          ? 'border-[#022d5c] bg-white shadow-md ring-2 ring-[#022d5c]/10'
                          : 'border-[#E5E0D0] bg-white/80 hover:bg-white hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-flex items-center rounded-md bg-[#022d5c]/10 px-2 py-0.5 text-[11px] font-semibold text-[#022d5c]">
                          {sermon.scripture_primary}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {sermon.year || sermon.era}
                        </span>
                      </div>

                      <h3 className={`font-serif text-base font-bold leading-snug ${
                        isSelected ? 'text-[#022d5c]' : 'text-slate-900 group-hover:text-[#022d5c]'
                      }`}>
                        {sermon.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-1.5">
                        {sermon.big_idea}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                        <span className="text-slate-600 font-medium truncate max-w-[180px]">
                          {sermon.author}
                        </span>
                        <span className="text-[#D0A348] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Read <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: The Manuscript Reader (8 Cols) */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-[#E5E0D0] bg-white shadow-lg overflow-hidden">
              {/* Reader Action Header */}
              <div className="border-b border-[#E5E0D0] bg-[#FAF8F3] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold text-slate-700">
                    <button
                      onClick={() => setActiveTab('outline')}
                      className={`rounded-md px-3 py-1.5 transition-all ${
                        activeTab === 'outline' ? 'bg-white text-[#022d5c] shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      Homiletical Outline
                    </button>
                    <button
                      onClick={() => setActiveTab('manuscript')}
                      className={`rounded-md px-3 py-1.5 transition-all ${
                        activeTab === 'manuscript' ? 'bg-white text-[#022d5c] shadow-sm' : 'hover:text-slate-900'
                      }`}
                    >
                      Full Manuscript
                    </button>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAdaptAsMySermon}
                    disabled={isAdapting}
                    className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white text-xs font-semibold px-4 py-2 shadow-md gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#D0A348]" />
                    {isAdapting ? 'Creating Draft...' : 'Adapt as My Sermon'}
                  </Button>

                  <Link href={`/study?scripture=${encodeURIComponent(currentSermon.scripture_primary)}`}>
                    <Button variant="outline" size="sm" className="text-xs border-slate-300 hover:bg-slate-50 gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                      Study Passage
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrint}
                    className="text-slate-500 hover:text-slate-900 p-2"
                    title="Print Manuscript"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Manuscript Content Body */}
              <div className="p-6 md:p-8 space-y-8">
                {/* Title & Metadata Banner */}
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2.5">
                    <Badge className="bg-[#022d5c] text-white hover:bg-[#022d5c] text-xs">
                      {currentSermon.volumeLabel}
                    </Badge>
                    <Badge variant="outline" className="border-[#D0A348] text-[#977323] font-semibold text-xs bg-[#FAF5E8]">
                      {currentSermon.scripture_primary}
                    </Badge>
                    {currentSermon.year && (
                      <span className="text-xs text-slate-500 font-medium">
                        Circa {currentSermon.year}
                      </span>
                    )}
                  </div>

                  <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#022d5c] leading-tight">
                    {currentSermon.title}
                  </h1>

                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {currentSermon.subtitle}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-bold text-slate-900">{currentSermon.author}</span>
                    <span>•</span>
                    <span className="italic">{currentSermon.series_name}</span>
                  </div>
                </div>

                {/* Big Idea Quote Callout */}
                <div className="rounded-xl border-l-4 border-[#D0A348] bg-[#FAF6EC] p-4 text-slate-800 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-[#977323] block mb-1">
                        Central Homiletical Thesis (Big Idea)
                      </span>
                      <p className="font-serif text-base italic leading-relaxed text-slate-900">
                        "{currentSermon.big_idea}"
                      </p>
                    </div>
                    <button
                      onClick={() => handleSaveToIdeas(currentSermon.big_idea, 'Big Idea')}
                      className="text-slate-400 hover:text-[#022d5c] p-1"
                      title="Save to Ideas"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Historical Context Callout (if available) */}
                {currentSermon.historical_context && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">
                      🏛️ Historical & Setting Context
                    </span>
                    {currentSermon.historical_context}
                  </div>
                )}

                {/* Tab View 1: Homiletical Outline */}
                {activeTab === 'outline' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                        3-Point Expository Framework
                      </h2>
                      <div className="space-y-4">
                        {currentSermon.outline.map((point) => (
                          <div
                            key={point.roman}
                            className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm hover:border-[#022d5c]/40 transition-colors"
                          >
                            <div className="flex items-baseline gap-3">
                              <span className="font-serif font-bold text-lg text-[#022d5c]">
                                {point.roman}.
                              </span>
                              <div className="flex-1">
                                <h3 className="font-serif font-bold text-base text-slate-900">
                                  {point.title}
                                </h3>

                                {point.explanation && (
                                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                    {point.explanation}
                                  </p>
                                )}

                                {point.subpoints && point.subpoints.length > 0 && (
                                  <ul className="mt-3 space-y-1.5 pl-4 border-l-2 border-slate-100 text-xs text-slate-700">
                                    {point.subpoints.map((sub, idx) => (
                                      <li key={idx} className="list-disc">
                                        {sub}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Illustrations */}
                    {currentSermon.illustrations && currentSermon.illustrations.length > 0 && (
                      <div className="pt-4 border-t border-slate-200">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                          Pulpit Illustrations
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                          {currentSermon.illustrations.map((ill, idx) => (
                            <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-serif font-bold text-sm text-[#022d5c]">
                                  💡 {ill.title}
                                </span>
                                <button
                                  onClick={() => handleSaveToIdeas(ill.content, 'Illustration')}
                                  className="text-xs font-semibold text-[#D0A348] hover:text-[#977323] flex items-center gap-1"
                                >
                                  <Copy className="h-3 w-3" /> Save to Ideas
                                </button>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed italic">
                                "{ill.content}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Practical Applications */}
                    {currentSermon.application_points && currentSermon.application_points.length > 0 && (
                      <div className="pt-4 border-t border-slate-200">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Pastoral Action & Congregation Application
                        </h2>
                        <div className="space-y-2">
                          {currentSermon.application_points.map((app, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#022d5c] text-[10px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed mt-0.5">{app}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab View 2: Full Manuscript */}
                {activeTab === 'manuscript' && (
                  <div className="prose prose-slate max-w-none font-serif text-sm leading-relaxed text-slate-800 space-y-4">
                    <div className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
                      {currentSermon.full_text}
                    </div>
                  </div>
                )}

                {/* Bottom Cloner Banner */}
                <div className="rounded-xl border border-[#D0A348]/40 bg-[#FAF7F0] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#022d5c]">
                      Ready to preach this message?
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Clone this outline into your private Sermons workspace to customize notes, add announcements, and schedule for Sunday.
                    </p>
                  </div>
                  <Button
                    onClick={handleAdaptAsMySermon}
                    disabled={isAdapting}
                    className="bg-[#022d5c] hover:bg-[#022d5c]/90 text-white text-xs font-semibold px-5 py-2.5 shadow-md gap-2 shrink-0"
                  >
                    <Sparkles className="h-4 w-4 text-[#D0A348]" />
                    {isAdapting ? 'Creating Draft...' : 'Adapt as My Sermon'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

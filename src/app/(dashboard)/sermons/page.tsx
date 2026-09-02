"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, Clock, Edit, ScanLine, LayoutGrid, Layers, Filter, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScanSermon } from "@/components/capture/ScanSermon";
import { cn } from "@/lib/utils";

type Sermon = {
  id: string;
  title: string;
  subtitle: string | null;
  status: "draft" | "review" | "ready" | "preached";
  preach_date: string | null;
  updated_at: string;
  series_name: string | null;
  series_order: number | null;
  scripture_primary: string | null;
  content: any;
};

// Extract plain text from Tiptap JSON content for search
function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  let text = '';
  if (node.text) text += node.text;
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      text += ' ' + extractText(child);
    }
  }
  return text;
}

export default function SermonsPage() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'series'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    async function fetchSermons() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false }) as any;

      if (error) {
        console.error("Error fetching sermons:", error);
      } else {
        setSermons(data || []);
        // Auto-expand all series in series view
        const seriesNames = new Set<string>();
        (data || []).forEach((s: Sermon) => {
          if (s.series_name) seriesNames.add(s.series_name);
        });
        setExpandedSeries(seriesNames);
      }
      setLoading(false);
    }

    fetchSermons();
  }, [supabase]);

  // Multi-field search
  const filteredSermons = sermons.filter((sermon) => {
    const q = searchQuery.toLowerCase();
    
    // Status filter
    if (statusFilter !== 'all' && sermon.status !== statusFilter) return false;
    
    // Series filter
    if (seriesFilter !== 'all') {
      if (seriesFilter === '__none__' && sermon.series_name) return false;
      if (seriesFilter !== '__none__' && sermon.series_name !== seriesFilter) return false;
    }
    
    // Search query (multi-field)
    if (q) {
      const titleMatch = (sermon.title || '').toLowerCase().includes(q);
      const subtitleMatch = (sermon.subtitle || '').toLowerCase().includes(q);
      const scriptureMatch = (sermon.scripture_primary || '').toLowerCase().includes(q);
      const seriesMatch = (sermon.series_name || '').toLowerCase().includes(q);
      const contentText = extractText(sermon.content).toLowerCase();
      const contentMatch = contentText.includes(q);
      
      if (!titleMatch && !subtitleMatch && !scriptureMatch && !seriesMatch && !contentMatch) return false;
    }
    
    return true;
  });

  // Get unique series names for filter
  const seriesNames = [...new Set(sermons.map(s => s.series_name).filter(Boolean))] as string[];

  // Group sermons by series for series view
  const seriesGroups = seriesNames.map(name => ({
    name,
    sermons: filteredSermons
      .filter(s => s.series_name === name)
      .sort((a, b) => (a.series_order || 0) - (b.series_order || 0))
  })).filter(g => g.sermons.length > 0);

  const standaloneSermons = filteredSermons.filter(s => !s.series_name);

  const toggleSeries = (name: string) => {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const getStatusColor = (status: Sermon["status"]) => {
    switch (status) {
      case "draft":
        return "bg-slate-200 text-slate-800 hover:bg-slate-300";
      case "review":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "ready":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "preached":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      default:
        return "bg-slate-200 text-slate-800";
    }
  };

  const getStatusDot = (status: Sermon["status"]) => {
    switch (status) {
      case "draft": return "bg-slate-400";
      case "review": return "bg-yellow-400";
      case "ready": return "bg-green-400";
      case "preached": return "bg-blue-400";
      default: return "bg-slate-400";
    }
  };

  const SermonCard = ({ sermon }: { sermon: Sermon }) => (
    <Link href={`/sermons/${sermon.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow border-slate-200 group">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <Badge className={getStatusColor(sermon.status)} variant="secondary">
              {sermon.status.charAt(0).toUpperCase() + sermon.status.slice(1)}
            </Badge>
            {sermon.series_name && viewMode === 'all' && (
              <span className="text-xs text-[#D0A348] font-medium truncate max-w-[120px]">{sermon.series_name}</span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-[#022d5c] line-clamp-2">
            {sermon.title || "Untitled Sermon"}
          </h3>
          {sermon.subtitle && (
            <p className="text-sm text-slate-500 line-clamp-1 mt-1">{sermon.subtitle}</p>
          )}
        </CardHeader>
        <CardContent className="pb-3 flex-grow">
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            {sermon.scripture_primary && (
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-[#D0A348]" />
                <span className="text-[#022d5c] font-medium">{sermon.scripture_primary}</span>
              </div>
            )}
            {sermon.preach_date && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                {format(new Date(sermon.preach_date + 'T12:00:00'), "MMM d, yyyy")}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Updated {format(new Date(sermon.updated_at), "MMM d, yyyy")}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <Edit className="h-4 w-4 text-[#022d5c]" />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-[#022d5c] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#022d5c] font-playfair">Sermons</h1>
          <p className="text-slate-500 mt-1">Manage and write your messages.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsScanModalOpen(true)}
            variant="outline"
            className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scan Sermon
          </Button>
          <Link href="/sermons/new">
            <Button className="bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90">
              <Plus className="h-4 w-4 mr-2" />
              New Sermon
            </Button>
          </Link>
        </div>
      </div>

      <ScanSermon isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} />

      {/* Search, Filters, and View Toggle */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, scripture, series, or content..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('all')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'all' ? "bg-[#022d5c] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <LayoutGrid className="w-4 h-4" /> All
            </button>
            <button
              onClick={() => setViewMode('series')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'series' ? "bg-[#022d5c] text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Layers className="w-4 h-4" /> By Series
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-slate-400" />
          
          {/* Status Filter */}
          {['all', 'draft', 'review', 'ready', 'preached'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                statusFilter === status
                  ? "bg-[#022d5c] text-white border-[#022d5c]"
                  : "bg-white text-slate-600 border-slate-200 hover:border-[#022d5c]/30"
              )}
            >
              {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}

          {/* Series Filter */}
          {seriesNames.length > 0 && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <select
                value={seriesFilter}
                onChange={(e) => setSeriesFilter(e.target.value)}
                className="px-3 py-1 rounded-full text-xs font-medium border border-slate-200 bg-white text-slate-600 focus:outline-none focus:border-[#022d5c]/30"
              >
                <option value="all">All Series</option>
                <option value="__none__">Standalone</option>
                {seriesNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </>
          )}

          {/* Result count */}
          <span className="text-xs text-slate-400 ml-auto">
            Showing {filteredSermons.length} of {sermons.length} sermon{sermons.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      {filteredSermons.length === 0 ? (
        <div className="text-center py-16 bg-[#F8F5EE] rounded-lg border border-slate-200">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-[#022d5c] mb-2">No sermons found</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || statusFilter !== 'all' || seriesFilter !== 'all'
                ? "Try adjusting your search or filters."
                : "Start writing your first message!"}
            </p>
            {!searchQuery && statusFilter === 'all' && seriesFilter === 'all' && (
              <Link href="/sermons/new">
                <Button className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sermon
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : viewMode === 'all' ? (
        /* ─── Grid View ─────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSermons.map((sermon) => (
            <SermonCard key={sermon.id} sermon={sermon} />
          ))}
        </div>
      ) : (
        /* ─── Series View ───────────────────────────────── */
        <div className="space-y-6">
          {seriesGroups.map(group => (
            <Card key={group.name} className="shadow-sm rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSeries(group.name)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {expandedSeries.has(group.name) 
                    ? <ChevronDown className="w-5 h-5 text-[#022d5c]" />
                    : <ChevronRight className="w-5 h-5 text-[#022d5c]" />
                  }
                  <div>
                    <h3 className="text-lg font-bold text-[#022d5c] font-playfair">{group.name}</h3>
                    <p className="text-sm text-slate-500">
                      {group.sermons.length} sermon{group.sermons.length !== 1 ? 's' : ''} · 
                      {' '}{group.sermons.filter(s => s.status === 'preached').length} preached
                    </p>
                  </div>
                </div>
                {/* Series Progress Dots */}
                <div className="flex items-center gap-1.5 mr-2">
                  {group.sermons.map((s, i) => (
                    <div
                      key={s.id}
                      className={cn("w-3 h-3 rounded-full", getStatusDot(s.status))}
                      title={`${s.title || 'Untitled'} (${s.status})`}
                    />
                  ))}
                </div>
              </button>

              {expandedSeries.has(group.name) && (
                <div className="border-t border-gray-100">
                  {/* Timeline */}
                  <div className="p-5 space-y-0">
                    {group.sermons.map((sermon, index) => (
                      <Link key={sermon.id} href={`/sermons/${sermon.id}`}>
                        <div className="flex gap-4 group hover:bg-gray-50 p-3 rounded-lg transition-colors relative">
                          {/* Timeline connector */}
                          <div className="flex flex-col items-center">
                            <div className={cn("w-4 h-4 rounded-full border-2 shrink-0", 
                              sermon.status === 'preached' ? "bg-blue-400 border-blue-400" :
                              sermon.status === 'ready' ? "bg-green-400 border-green-400" :
                              sermon.status === 'review' ? "bg-yellow-400 border-yellow-400" :
                              "bg-white border-slate-300"
                            )} />
                            {index < group.sermons.length - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[24px]" />
                            )}
                          </div>
                          
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#D0A348]">#{(sermon.series_order || index + 1)}</span>
                              <h4 className="font-semibold text-[#022d5c] group-hover:text-[#022d5c]/80">
                                {sermon.title || 'Untitled Sermon'}
                              </h4>
                              <Badge className={cn("text-xs", getStatusColor(sermon.status))} variant="secondary">
                                {sermon.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                              {sermon.scripture_primary && (
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> {sermon.scripture_primary}
                                </span>
                              )}
                              {sermon.preach_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {format(new Date(sermon.preach_date + 'T12:00:00'), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Standalone Sermons */}
          {standaloneSermons.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#022d5c] font-playfair mb-4 px-1">Standalone Sermons</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {standaloneSermons.map(sermon => (
                  <SermonCard key={sermon.id} sermon={sermon} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

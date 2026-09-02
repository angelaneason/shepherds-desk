"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Presentation, Trash2, BookOpen, Loader2, Copy, X, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SermonEditor } from "@/components/editor/SermonEditor";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EditSermonPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [series, setSeries] = useState("");
  const [preachDate, setPreachDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"draft" | "review" | "ready" | "preached">("draft");
  const [content, setContent] = useState<any>(null);

  // Devotional Generator
  const [devDrawerOpen, setDevDrawerOpen] = useState(false);
  const [devDays, setDevDays] = useState(5);
  const [devLoading, setDevLoading] = useState(false);
  const [devResult, setDevResult] = useState<any[]>([]);
  const [devSaving, setDevSaving] = useState(false);

  const fetchSermon = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("id", id)
        .single<any>();

      if (error) throw error;
      
      if (data) {
        setTitle(data.title || "");
        setSubtitle(data.subtitle || "");
        setScripture(data.scripture_primary || "");
        setSeries(data.series_name || "");
        setPreachDate(data.preach_date || "");
        setLocation(data.location || "");
        setStatus(data.status || "draft");
        setContent(data.content);
      }
    } catch (error) {
      console.error("Error fetching sermon:", error);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchSermon();
  }, [fetchSermon]);

  // Auto-save
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      handleSave(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [title, subtitle, scripture, series, preachDate, location, status, content, loading]);

  const handleSave = async (isAutoSave = false) => {
    if (!isAutoSave) setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("sermons")
        .update({
          title: title || "Untitled Sermon",
          subtitle,
          scripture_primary: scripture,
          series_name: series,
          preach_date: preachDate || null,
          location: location || null,
          status,
          content,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", id);

      if (error) throw error;
      
      if (preachDate && user) {
        // check if calendar event exists
        const { data: calData } = await supabase
          .from("calendar_events")
          .select("id")
          .eq("sermon_id", id)
          .maybeSingle() as any;
          
        if (calData) {
          await supabase.from("calendar_events").update({
            title: title || "Untitled Sermon",
            start_time: new Date(`${preachDate}T09:00:00`).toISOString(),
            end_time: new Date(`${preachDate}T10:00:00`).toISOString(),
            location: location || null
          } as any).eq("id", calData.id);
        } else {
          await supabase.from("calendar_events").insert({
            profile_id: user.id,
            title: title || "Untitled Sermon",
            event_type: "service",
            start_time: new Date(`${preachDate}T09:00:00`).toISOString(),
            end_time: new Date(`${preachDate}T10:00:00`).toISOString(),
            location: location || null,
            sermon_id: id,
            all_day: true,
            color: "#a855f7"
          } as any);
        }
      }
    } catch (error) {
      console.error("Error saving sermon:", error);
    } finally {
      if (!isAutoSave) setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("sermons")
        .delete()
        .eq("id", id);

      if (error) throw error;
      router.push("/sermons");
    } catch (error) {
      console.error("Error deleting sermon:", error);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading sermon...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <header className="flex items-center justify-between border-b px-6 py-4 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <Link href="/sermons">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-[#022d5c]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex gap-2">
            {(["draft", "review", "ready", "preached"] as const).map((s) => (
              <Badge
                key={s}
                variant={status === s ? "default" : "outline"}
                className={`cursor-pointer ${
                  status === s 
                    ? "bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c]/90" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setStatus(s)}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Sermon</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this sermon? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => {}}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline"
            onClick={() => setDevDrawerOpen(true)}
            className="hidden md:flex border-[#022d5c]/20 text-[#022d5c] hover:bg-[#022d5c]/5 gap-2"
          >
            <BookOpen className="h-4 w-4" />
            Devotional
          </Button>

          <Link href={`/sermons/${id}/pulpit`}>
            <Button variant="outline" className="border-[#022d5c] text-[#022d5c] hover:bg-[#022d5c]/10">
              <Presentation className="h-4 w-4 mr-2" />
              Pulpit Mode
            </Button>
          </Link>

          <Button 
            onClick={() => handleSave(false)} 
            disabled={isSaving}
            className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F8F5EE]/30">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sermon Title"
              className="text-4xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto placeholder:text-slate-300 text-[#022d5c]"
            />
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtitle or scripture reference"
              className="text-xl border-none shadow-none focus-visible:ring-0 px-0 h-auto placeholder:text-slate-400 text-slate-600"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Preach Date</label>
                <Input 
                  type="date" 
                  value={preachDate}
                  onChange={(e) => setPreachDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Location</label>
                <Input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Main Sanctuary"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Series Name</label>
                <Input 
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="e.g. Gospel of John"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase">Scripture Ref</label>
                <Input 
                  value={scripture}
                  onChange={(e) => setScripture(e.target.value)}
                  placeholder="e.g. John 3:16"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <SermonEditor 
            content={content} 
            onChange={setContent} 
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Devotional Generator Drawer */}
      {devDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDevDrawerOpen(false)} />
          <div className="relative w-full sm:w-[480px] bg-[#F8F5EE] shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-[#F8F5EE] border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-[#022d5c] font-playfair">📅 Devotional Generator</h3>
              <button onClick={() => setDevDrawerOpen(false)} className="p-1 rounded hover:bg-gray-200">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {devResult.length === 0 && !devLoading && (
                <>
                  <p className="text-sm text-gray-600">
                    Generate a multi-day devotional plan from this sermon. 
                    Perfect for sharing with your congregation or small groups.
                  </p>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-[#022d5c]">Duration</label>
                    <div className="flex gap-2">
                      {[5, 7].map(d => (
                        <button
                          key={d}
                          onClick={() => setDevDays(d)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            devDays === d 
                              ? 'bg-[#022d5c] text-white' 
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#022d5c]/30'
                          }`}
                        >
                          {d}-Day Plan
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={async () => {
                      setDevLoading(true);
                      try {
                        // Extract text content from Tiptap JSON
                        function extractText(node: any): string {
                          if (!node) return '';
                          let t = '';
                          if (node.text) t += node.text;
                          if (node.content) node.content.forEach((c: any) => { t += ' ' + extractText(c); });
                          return t;
                        }
                        const plainText = extractText(content);
                        
                        const res = await fetch('/api/ai/devotional', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            sermonTitle: title,
                            sermonContent: plainText.substring(0, 3000),
                            scripture: scripture,
                            days: devDays
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to generate');
                        setDevResult(Array.isArray(data) ? data : data.devotional || []);
                      } catch (err: any) {
                        alert('Error generating devotional: ' + err.message);
                      }
                      setDevLoading(false);
                    }}
                    className="w-full bg-[#D0A348] text-white hover:bg-[#D0A348]/90 gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Generate {devDays}-Day Devotional
                  </Button>
                </>
              )}

              {devLoading && (
                <div className="flex flex-col items-center justify-center py-16 text-[#022d5c]">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p className="text-sm font-medium">Crafting your devotional...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
                </div>
              )}

              {devResult.length > 0 && (
                <>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = devResult.map(d => 
                          `Day ${d.day}: ${d.title}\nScripture: ${d.scripture}\n\n${d.text}\n\nReflection: ${d.question}\n\nPrayer: ${d.prayer}`
                        ).join('\n\n---\n\n');
                        navigator.clipboard.writeText(text);
                        alert('Copied to clipboard!');
                      }}
                      className="gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={devSaving}
                      onClick={async () => {
                        setDevSaving(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error('Not logged in');
                          await supabase.from('saved_devotionals').insert({
                            profile_id: user.id,
                            sermon_id: id,
                            title: `${title} — ${devDays}-Day Devotional`,
                            days: devDays,
                            content: devResult
                          } as any);
                          alert('Devotional saved to your library!');
                        } catch (err: any) {
                          alert('Error saving: ' + err.message);
                        }
                        setDevSaving(false);
                      }}
                      className="gap-1"
                    >
                      <Download className="w-3 h-3" /> {devSaving ? 'Saving...' : 'Save to Library'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDevResult([])}
                      className="ml-auto text-gray-500"
                    >
                      Start Over
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {devResult.map((day: any, i: number) => (
                      <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#022d5c] text-white text-xs font-bold px-2 py-1 rounded">Day {day.day || i + 1}</span>
                          <h4 className="font-semibold text-[#022d5c]">{day.title}</h4>
                        </div>
                        <p className="text-xs text-[#D0A348] font-semibold">{day.scripture}</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{day.text}</p>
                        <div className="bg-[#F8F5EE] p-3 rounded-md">
                          <p className="text-xs font-semibold text-[#022d5c] mb-1">Reflection Question</p>
                          <p className="text-sm text-gray-600 italic">{day.question}</p>
                        </div>
                        <div className="border-t pt-2">
                          <p className="text-xs font-semibold text-[#022d5c] mb-1">🙏 Prayer</p>
                          <p className="text-sm text-gray-600">{day.prayer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

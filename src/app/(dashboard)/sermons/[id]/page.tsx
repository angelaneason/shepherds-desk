"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Presentation, Trash2 } from "lucide-react";
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, ChevronDown, ChevronUp, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SermonEditor } from "@/components/editor/SermonEditor";
import { Badge } from "@/components/ui/badge";

export default function NewSermonPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [scripture, setScripture] = useState("");
  const [series, setSeries] = useState("");
  const [preachDate, setPreachDate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"draft" | "review" | "ready" | "preached">("draft");
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Study Sessions State
  const [studySessions, setStudySessions] = useState<{ id: string; date: string; start: string; end: string }[]>([]);
  const [isStudyScheduleOpen, setIsStudyScheduleOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newSessionStart, setNewSessionStart] = useState("09:00");
  const [newSessionEnd, setNewSessionEnd] = useState("11:00");

  useEffect(() => {
    if (preachDate && !newSessionDate) {
      const pDate = new Date(preachDate);
      pDate.setDate(pDate.getDate() - 3); // Default 3 days before
      setNewSessionDate(pDate.toISOString().split('T')[0]);
    }
  }, [preachDate, newSessionDate]);

  const handleAddSession = () => {
    if (!newSessionDate || !newSessionStart || !newSessionEnd) return;
    setStudySessions([
      ...studySessions,
      {
        id: Math.random().toString(36).substr(2, 9),
        date: newSessionDate,
        start: newSessionStart,
        end: newSessionEnd,
      }
    ]);
  };

  const handleRemoveSession = (id: string) => {
    setStudySessions(studySessions.filter(s => s.id !== id));
  };
  
  const supabase = createClient();

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sermons")
        .insert({
          author_id: user.id,
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
        .select()
        .single();

      if (error) throw error;
      
      if (preachDate) {
        await supabase.from("calendar_events").insert({
          profile_id: user.id,
          title: title || "Untitled Sermon",
          event_type: "service",
          start_time: new Date(`${preachDate}T09:00:00`).toISOString(),
          end_time: new Date(`${preachDate}T10:00:00`).toISOString(),
          location: location || null,
          sermon_id: data.id,
          all_day: true,
          color: "#a855f7"
        } as any);
      }
      
      if (studySessions.length > 0) {
        const studyEvents = studySessions.map(session => ({
          profile_id: user.id,
          title: `Study: ${title || 'Sermon Prep'}`,
          event_type: "study",
          start_time: new Date(`${session.date}T${session.start}:00`).toISOString(),
          end_time: new Date(`${session.date}T${session.end}:00`).toISOString(),
          description: `sermon_study:${data.id}`,
          all_day: false,
          color: "#022d5c"
        }));
        await supabase.from("calendar_events").insert(studyEvents as any);
      }
      
      router.push(`/sermons/${data.id}`);
    } catch (error) {
      console.error("Error saving sermon:", error);
    } finally {
      setIsSaving(false);
    }
  };

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
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Sermon"}
        </Button>
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

            {preachDate && (
              <div className="pt-4 border-t mt-4">
                <button 
                  onClick={() => setIsStudyScheduleOpen(!isStudyScheduleOpen)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-sm font-semibold text-[#022d5c] flex items-center gap-2">
                    📚 Schedule Study Time
                  </h3>
                  {isStudyScheduleOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                
                {isStudyScheduleOpen && (
                  <div className="mt-4 space-y-4">
                    {studySessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-md border text-sm">
                        <div>
                          <p className="font-medium">{new Date(session.date).toLocaleDateString()}</p>
                          <p className="text-slate-500">{session.start} - {session.end}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveSession(session.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="bg-gray-50 p-3 rounded-md border space-y-3">
                      <p className="font-medium text-sm">Add Study Session</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Date</label>
                          <Input 
                            type="date" 
                            value={newSessionDate}
                            onChange={(e) => setNewSessionDate(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">Start</label>
                          <Input 
                            type="time" 
                            value={newSessionStart}
                            onChange={(e) => setNewSessionStart(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">End</label>
                          <Input 
                            type="time" 
                            value={newSessionEnd}
                            onChange={(e) => setNewSessionEnd(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <Button 
                          type="button" 
                          onClick={handleAddSession}
                          className="bg-[#D0A348] text-white hover:bg-[#D0A348]/90 h-8 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <SermonEditor 
            content={content} 
            onChange={setContent} 
          />
        </div>
      </div>
    </div>
  );
}

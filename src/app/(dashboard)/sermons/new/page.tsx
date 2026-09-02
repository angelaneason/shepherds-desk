"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
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
  const [status, setStatus] = useState<"draft" | "review" | "ready" | "preached">("draft");
  const [content, setContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
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
          status,
          content,
          updated_at: new Date().toISOString()
        } as any)
        .select()
        .single();

      if (error) throw error;
      
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
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
          />
        </div>
      </div>
    </div>
  );
}

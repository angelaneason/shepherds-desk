"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Timer, 
  Clock, 
  Printer, 
  Sun, 
  Moon, 
  BookOpen, 
  ListOrdered,
  FastForward,
  Mic
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sermonContentToHtml, extractSermonOutline } from "@/lib/sermon-content";
import { SermonPrintModal } from "@/components/sermons/SermonPrintModal";
import SermonAudioTranscriberModal from "@/components/sermons/SermonAudioTranscriberModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PulpitModePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [sermon, setSermon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [pastorProfile, setPastorProfile] = useState<{ full_name?: string; church_name?: string }>({});
  
  // Display theme: dark (auditorium) or light (pulpit paper)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // View mode: 'manuscript' or 'outline'
  const [viewMode, setViewMode] = useState<'manuscript' | 'outline'>('manuscript');

  // Timer mode: 'countdown' or 'stopwatch'
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('stopwatch');
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [countdownRunning, setCountdownRunning] = useState(false);
  
  // Stopwatch state
  const [elapsed, setElapsed] = useState(0); // seconds
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  
  // Font Size
  const [fontSize, setFontSize] = useState(30);

  // Auto-scroll / Teleprompter
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1); // 1, 2, or 3
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnimRef = useRef<number | null>(null);

  // Keep screen awake while in Pulpit Mode
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error("Wake Lock error:", err);
      }
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release().catch(console.error); };
  }, []);

  // Fetch sermon and profile data
  const fetchSermon = useCallback(async () => {
    const supabase = createClient();
    const [sermonRes, userRes] = await Promise.all([
      supabase
        .from("sermons")
        .select("*")
        .eq("id", id)
        .single(),
      supabase.auth.getUser()
    ]);

    if (!sermonRes.error && sermonRes.data) setSermon(sermonRes.data);
    if (userRes.data?.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, church_name")
        .eq("id", userRes.data.user.id)
        .maybeSingle();
      if (prof) setPastorProfile(prof);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchSermon();
  }, [fetchSermon]);

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdownRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCountdownRunning(false);
    }
    return () => clearInterval(interval);
  }, [countdownRunning, timeLeft]);

  // Stopwatch timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stopwatchRunning) {
      interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

  // Auto-scroll teleprompter loop
  useEffect(() => {
    if (!autoScroll) {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
      return;
    }

    const step = () => {
      if (scrollContainerRef.current) {
        // speed 1 = 0.5px/frame, speed 2 = 1.0px/frame, speed 3 = 1.8px/frame
        const delta = scrollSpeed === 1 ? 0.5 : scrollSpeed === 2 ? 1.0 : 1.8;
        scrollContainerRef.current.scrollTop += delta;
      }
      scrollAnimRef.current = requestAnimationFrame(step);
    };

    scrollAnimRef.current = requestAnimationFrame(step);

    return () => {
      if (scrollAnimRef.current) {
        cancelAnimationFrame(scrollAnimRef.current);
        scrollAnimRef.current = null;
      }
    };
  }, [autoScroll, scrollSpeed]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleTimer = () => {
    if (timerMode === 'countdown') {
      setCountdownRunning(!countdownRunning);
    } else {
      setStopwatchRunning(!stopwatchRunning);
    }
  };

  const resetTimer = () => {
    if (timerMode === 'countdown') {
      setCountdownRunning(false);
      setTimeLeft(30 * 60);
    } else {
      setStopwatchRunning(false);
      setElapsed(0);
    }
  };

  const isRunning = timerMode === 'countdown' ? countdownRunning : stopwatchRunning;
  const displayTime = timerMode === 'countdown' ? timeLeft : elapsed;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#021833] flex items-center justify-center text-white text-xl z-50">
        Preparing Pulpit Mode...
      </div>
    );
  }

  if (!sermon) {
    return (
      <div className="fixed inset-0 bg-[#021833] flex flex-col items-center justify-center text-white gap-4 z-50">
        <p className="text-xl">Sermon not found.</p>
        <Link href="/sermons">
          <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
            Return to Sermons
          </Button>
        </Link>
      </div>
    );
  }

  const htmlContent = sermonContentToHtml(sermon.content, theme);
  const outlineItems = extractSermonOutline(sermon.content);

  const isDark = theme === 'dark';

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col font-serif select-none overflow-hidden transition-colors duration-300",
        isDark ? "bg-[#021833] text-white" : "bg-[#FBF9F5] text-[#0F172A]"
      )}
    >
      {/* Sleek Top Control Bar */}
      <header 
        className={cn(
          "w-full px-4 py-2.5 flex flex-wrap justify-between items-center z-50 border-b backdrop-blur-md shadow-md gap-3",
          isDark 
            ? "bg-[#011226]/95 border-white/10 text-white" 
            : "bg-white/95 border-gray-200 text-gray-800"
        )}
      >
        {/* Left: Exit & View Mode */}
        <div className="flex items-center gap-2">
          <Link href={`/sermons/${id}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-9 w-9 rounded-full", isDark ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-100")} 
              title="Exit Pulpit Mode"
            >
              <X className="h-5 w-5" />
            </Button>
          </Link>

          {/* Manuscript vs Outline toggle */}
          <div className={cn("flex items-center rounded-lg p-0.5 border", isDark ? "border-white/15 bg-black/30" : "border-gray-200 bg-gray-100")}>
            <button
              onClick={() => setViewMode('manuscript')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                viewMode === 'manuscript'
                  ? isDark ? "bg-[#D0A348] text-[#021833]" : "bg-white text-[#022d5c] shadow-sm"
                  : isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Manuscript</span>
            </button>
            <button
              onClick={() => setViewMode('outline')}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                viewMode === 'outline'
                  ? isDark ? "bg-[#D0A348] text-[#021833]" : "bg-white text-[#022d5c] shadow-sm"
                  : isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span>Outline</span>
            </button>
          </div>
        </div>
        
        {/* Center: Preaching Timer */}
        <div className={cn("flex items-center gap-3 px-3 py-1.5 rounded-full border", isDark ? "bg-black/40 border-white/15" : "bg-gray-50 border-gray-200")}>
          <button 
            onClick={() => setTimerMode(timerMode === 'stopwatch' ? 'countdown' : 'stopwatch')}
            className={cn("p-1.5 rounded-full transition-colors", isDark ? "hover:bg-white/10 text-white/70" : "hover:bg-gray-200 text-gray-600")}
            title={timerMode === 'stopwatch' ? 'Switch to Countdown (30 min)' : 'Switch to Stopwatch (Elapsed)'}
          >
            {timerMode === 'stopwatch' ? <Clock className="h-4 w-4" /> : <Timer className="h-4 w-4 text-[#D0A348]" />}
          </button>
          
          <div className={cn(
            "text-xl md:text-2xl font-mono font-bold w-18 text-center tracking-wider",
            timerMode === 'countdown' && timeLeft < 300 
              ? "text-red-400 animate-pulse" 
              : isDark ? "text-white" : "text-[#022d5c]"
          )}>
            {formatTime(displayTime)}
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTimer}
              className={cn(
                "p-1.5 rounded-full transition-all cursor-pointer",
                isRunning 
                  ? "bg-amber-500 text-black hover:bg-amber-400" 
                  : isDark ? "bg-white/20 text-white hover:bg-white/30" : "bg-[#022d5c] text-white hover:bg-[#022d5c]/90"
              )}
              title={isRunning ? "Pause Timer" : "Start Timer"}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button 
              onClick={resetTimer}
              className={cn("p-1.5 rounded-full transition-colors cursor-pointer", isDark ? "hover:bg-white/10 text-white/60" : "hover:bg-gray-200 text-gray-500")}
              title="Reset Timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          
          <span className={cn("text-[10px] uppercase font-bold tracking-wider hidden sm:inline", isDark ? "text-white/40" : "text-gray-400")}>
            {timerMode === 'stopwatch' ? 'Elapsed' : 'Remaining'}
          </span>
        </div>

        {/* Record Live Preaching in Pulpit Mode */}
        <button
          onClick={() => setRecordModalOpen(true)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0",
            isDark 
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30" 
              : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
          )}
          title="Record Live Preaching directly into this sermon"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <Mic className="h-3.5 w-3.5 text-rose-500" />
          <span className="hidden sm:inline">Record Preaching</span>
        </button>

        {/* Right: Teleprompter, Font Scale, Theme, Print */}
        <div className="flex items-center gap-2">
          {/* Teleprompter Auto-Scroll */}
          <div className={cn("flex items-center rounded-lg p-0.5 border", isDark ? "border-white/15 bg-black/30" : "border-gray-200 bg-gray-100")}>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer",
                autoScroll
                  ? "bg-emerald-500 text-white shadow-sm"
                  : isDark ? "text-white/70 hover:text-white" : "text-gray-600 hover:text-gray-900"
              )}
              title={autoScroll ? "Pause Teleprompter Scroll" : "Start Teleprompter Auto-Scroll"}
            >
              {autoScroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Auto-Scroll</span>
            </button>
            {autoScroll && (
              <button
                onClick={() => setScrollSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 3 : 1))}
                className={cn("px-2 py-1 text-xs font-bold transition-colors cursor-pointer", isDark ? "text-[#D0A348]" : "text-[#022d5c]")}
                title="Change Scroll Speed"
              >
                {scrollSpeed}x
              </button>
            )}
          </div>

          {/* Font Size Scaling */}
          <div className={cn("flex items-center rounded-lg border px-1", isDark ? "border-white/15 bg-black/30" : "border-gray-200 bg-gray-100")}>
            <button 
              className={cn("px-2 py-1 text-xs font-bold cursor-pointer", isDark ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-200")}
              onClick={() => setFontSize(prev => Math.max(18, prev - 4))}
              title="Decrease Font Size"
            >
              A-
            </button>
            <span className={cn("text-[11px] font-mono px-1 font-semibold", isDark ? "text-white/50" : "text-gray-400")}>
              {fontSize}
            </span>
            <button 
              className={cn("px-2 py-1 text-xs font-bold cursor-pointer", isDark ? "text-white hover:bg-white/10" : "text-gray-700 hover:bg-gray-200")}
              onClick={() => setFontSize(prev => Math.min(56, prev + 4))}
              title="Increase Font Size"
            >
              A+
            </button>
          </div>

          {/* Dark / Light Theme Toggle */}
          <button 
            className={cn("p-2 rounded-lg border transition-colors cursor-pointer", isDark ? "border-white/15 bg-black/30 text-[#D0A348] hover:bg-white/10" : "border-gray-200 bg-gray-100 text-[#022d5c] hover:bg-gray-200")}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            title={isDark ? "Switch to Light Mode (Pulpit Paper)" : "Switch to Dark Mode (Auditorium)"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Print Button */}
          <button 
            className={cn(
              "px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
              isDark 
                ? "border-white/15 bg-white/10 text-white hover:bg-white/20" 
                : "border-gray-200 bg-white text-gray-800 hover:bg-gray-50 shadow-sm"
            )}
            onClick={() => setPrintModalOpen(true)}
            title="Open Print Dialog"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Print</span>
          </button>
        </div>
      </header>

      {/* Main Preaching Scroll Surface */}
      <main 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-24 py-16 pb-64 focus:outline-none"
        style={{ scrollBehavior: autoScroll ? 'auto' : 'smooth' }}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Block */}
          <div className={cn("border-b pb-6", isDark ? "border-white/15" : "border-gray-300")}>
            <h1 
              className={cn(
                "font-extrabold tracking-tight mb-2 leading-tight",
                isDark ? "text-[#D0A348]" : "text-[#022d5c]"
              )}
              style={{ fontSize: `${Math.round(fontSize * 1.35)}px` }}
            >
              {sermon.title || "Untitled Sermon"}
            </h1>

            {/* Scripture and Subtitle metadata */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm md:text-base font-sans">
              {sermon.scripture_primary && (
                <span className={cn("font-bold", isDark ? "text-amber-300" : "text-[#D0A348]")}>
                  📖 {sermon.scripture_primary}
                </span>
              )}
              {sermon.series_name && (
                <span className={cn(isDark ? "text-white/60" : "text-gray-500")}>
                  Series: {sermon.series_name}
                </span>
              )}
              {sermon.preach_date && (
                <span className={cn(isDark ? "text-white/50" : "text-gray-400")}>
                  Preach Date: {sermon.preach_date}
                </span>
              )}
            </div>

            {sermon.subtitle && (
              <p 
                className={cn("italic mt-2.5", isDark ? "text-white/70" : "text-gray-600")}
                style={{ fontSize: `${Math.round(fontSize * 0.75)}px` }}
              >
                {sermon.subtitle}
              </p>
            )}
          </div>

          {/* Manuscript View */}
          {viewMode === 'manuscript' && (
            <div 
              className="pulpit-body font-serif transition-all"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
            >
              {htmlContent ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: htmlContent }} 
                  className={cn(
                    "pulpit-rendered-content space-y-4",
                    isDark ? "text-[#F8FAFC]" : "text-[#1E293B]"
                  )}
                />
              ) : (
                <div className={cn("py-12 text-center italic text-lg", isDark ? "text-white/50" : "text-gray-400")}>
                  No sermon notes or manuscript found. Tap Exit to return to the editor and write your message.
                </div>
              )}
            </div>
          )}

          {/* Outline View */}
          {viewMode === 'outline' && (
            <div className="pulpit-outline space-y-4 py-4">
              {outlineItems.length > 0 ? (
                outlineItems.map((item, idx) => {
                  const indent = item.level === 1 ? '0px' : item.level === 2 ? '24px' : item.level === 3 ? '48px' : '68px';
                  const isTopLevel = item.level <= 2;
                  return (
                    <div 
                      key={idx}
                      style={{ 
                        marginLeft: indent, 
                        fontSize: isTopLevel ? `${Math.round(fontSize * 1.1)}px` : `${fontSize}px`,
                        lineHeight: 1.55 
                      }}
                      className={cn(
                        "flex items-start gap-2.5",
                        isTopLevel 
                          ? isDark ? "text-[#D0A348] font-bold" : "text-[#022d5c] font-bold" 
                          : isDark ? "text-white/90" : "text-gray-800"
                      )}
                    >
                      <span className={cn("select-none mt-1 text-xs", isDark ? "text-amber-400" : "text-[#D0A348]")}>
                        {item.level === 1 ? '■' : item.level === 2 ? '●' : '◆'}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  );
                })
              ) : (
                <div className={cn("py-12 text-center italic text-lg", isDark ? "text-white/50" : "text-gray-400")}>
                  No outline points detected. Add headings (H1, H2, H3) or numbered points in your sermon to view them here.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sermon Print Modal */}
      {sermon && (
        <SermonPrintModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          sermon={sermon}
          pastorName={pastorProfile.full_name}
          churchName={pastorProfile.church_name}
        />
      )}

      {/* Record Preaching Modal in Pulpit Mode */}
      <SermonAudioTranscriberModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        existingSermonId={id}
        existingTitle={sermon?.title}
        onSermonSaved={() => {
          fetchSermon();
        }}
      />
    </div>
  );
}

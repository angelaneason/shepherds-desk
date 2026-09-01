"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { X, Play, Pause, RotateCcw, Type, Timer, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SermonEditor } from "@/components/editor/SermonEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PulpitModePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [sermon, setSermon] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Timer mode: 'countdown' or 'stopwatch'
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('stopwatch');
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [countdownRunning, setCountdownRunning] = useState(false);
  
  // Stopwatch state
  const [elapsed, setElapsed] = useState(0); // seconds
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  
  // Settings
  const [fontSize, setFontSize] = useState(32);

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

  useEffect(() => {
    async function fetchSermon() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sermons")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setSermon(data);
      setLoading(false);
    }
    fetchSermon();
  }, [id]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdownRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setCountdownRunning(false);
    }
    return () => clearInterval(interval);
  }, [countdownRunning, timeLeft]);

  // Stopwatch timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stopwatchRunning) {
      interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

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
    return <div className="min-h-screen bg-[#082C50] flex items-center justify-center text-white text-2xl">Loading...</div>;
  }

  if (!sermon) {
    return <div className="min-h-screen bg-[#082C50] flex items-center justify-center text-white">Sermon not found.</div>;
  }

  return (
    <div className="min-h-screen bg-[#082C50] text-white flex flex-col font-serif selection:bg-[#D0A348] selection:text-white">
      {/* Top Bar - Fades in on hover */}
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center opacity-0 hover:opacity-100 transition-opacity duration-300 z-50 bg-gradient-to-b from-[#082C50] to-transparent">
        <Link href={`/sermons/${id}`}>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <X className="h-6 w-6" />
          </Button>
        </Link>
        
        <div className="flex items-center gap-4 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
          {/* Timer Mode Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 h-8 w-8"
            onClick={() => setTimerMode(timerMode === 'stopwatch' ? 'countdown' : 'stopwatch')}
            title={timerMode === 'stopwatch' ? 'Switch to Countdown' : 'Switch to Stopwatch'}
          >
            {timerMode === 'stopwatch' ? <Clock className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
          </Button>
          
          {/* Timer Display */}
          <div className={cn(
            "text-2xl font-mono font-bold w-20 text-center",
            timerMode === 'countdown' && timeLeft < 300 ? "text-red-400" : "text-white"
          )}>
            {formatTime(displayTime)}
          </div>
          
          {/* Timer Controls */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={toggleTimer}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-8 w-8"
              onClick={resetTimer}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Mode Label */}
          <span className="text-xs text-white/50 uppercase tracking-wider">
            {timerMode === 'stopwatch' ? 'Elapsed' : 'Remaining'}
          </span>
          
          <div className="w-px h-6 bg-white/20 mx-2" />
          <div className="flex items-center gap-1">
            <Type className="h-4 w-4 text-white/70 mr-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-8 w-8 text-lg"
              onClick={() => setFontSize(prev => Math.max(20, prev - 4))}
            >
              -
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white hover:bg-white/20 h-8 w-8 text-lg"
              onClick={() => setFontSize(prev => Math.min(64, prev + 4))}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 overflow-y-auto px-8 md:px-16 py-24 pb-48"
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-[1.5em] font-bold mb-2 text-[#D0A348]">{sermon.title}</h1>
          {sermon.subtitle && (
            <h2 className="text-[0.8em] text-white/70 mb-8 border-b border-white/20 pb-8">{sermon.subtitle}</h2>
          )}
          
          <div className="pulpit-content">
            <SermonEditor 
              content={sermon.content} 
              readOnly={true} 
            />
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .pulpit-content .ProseMirror {
          color: white !important;
        }
        .pulpit-content .ProseMirror p {
          margin-bottom: 1em;
        }
        .pulpit-content .ProseMirror h1,
        .pulpit-content .ProseMirror h2,
        .pulpit-content .ProseMirror h3 {
          color: #D0A348 !important;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .pulpit-content .ProseMirror ul,
        .pulpit-content .ProseMirror ol {
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .pulpit-content .ProseMirror li {
          margin-bottom: 0.5em;
        }
        .pulpit-content .ProseMirror blockquote {
          border-left: 4px solid #D0A348;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          color: rgba(255, 255, 255, 0.9);
        }
        .pulpit-content .ProseMirror mark {
          background-color: rgba(208, 163, 72, 0.3);
          color: white;
          padding: 0.1em 0.2em;
          border-radius: 0.2em;
        }
        /* Override editor background for pulpit mode */
        .pulpit-content > div {
          background-color: transparent !important;
          border: none !important;
        }
        .pulpit-content > div > div {
          background-color: transparent !important;
          padding: 0 !important;
        }
      `}</style>
    </div>
  );
}

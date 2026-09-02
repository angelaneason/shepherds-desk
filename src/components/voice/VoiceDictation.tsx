'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function VoiceDictation({ 
  onTranscript, 
  className 
}: { 
  onTranscript: (text: string) => void;
  className?: string;
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              onTranscript(event.results[i][0].transcript);
              setTranscript('');
            } else {
              currentTranscript += event.results[i][0].transcript;
            }
          }
          if (currentTranscript) {
            setTranscript(currentTranscript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setTranscript('');
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscript]);

  const toggleListening = () => {
    if (!isSupported) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting speech recognition", error);
      }
    }
  };

  if (!isSupported) {
    return (
      <div className={cn("relative group inline-block", className)}>
        <Button disabled variant="outline" size="icon">
          <Mic className="h-4 w-4 text-gray-400" />
        </Button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-max bg-gray-800 text-white text-xs rounded px-2 py-1">
          Voice not supported in this browser
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Button
        type="button"
        onClick={toggleListening}
        variant="outline"
        size="icon"
        className={cn(
          "transition-all duration-300",
          isListening 
            ? "bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-500" 
            : "bg-[#D0A348] hover:bg-[#D0A348]/90 text-white border-[#D0A348]"
        )}
      >
        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      {isListening && transcript && (
        <div className="mt-2 text-sm text-gray-600 italic">
          {transcript}
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Send,
  Heart,
  Hospital,
  Church,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";

export type TextComposerProps = {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone?: string | null;
  defaultCategory?: string;
  defaultCustomPrompt?: string;
  pastorName?: string;
  churchName?: string;
};

const CATEGORIES = [
  {
    id: "encouragement",
    label: "💛 Thinking of You & Praying",
    description: "Uplifting encouragement and love",
  },
  {
    id: "hospital",
    label: "🏥 Hospital & Recovery",
    description: "Surgery, sickness, or healing check-in",
  },
  {
    id: "bereavement",
    label: "🕊️ Bereavement & Comfort",
    description: "Tender comfort in times of grief",
  },
  {
    id: "missing_church",
    label: "⛪ Missed You Sunday",
    description: "Warm, no-guilt 'we missed you' note",
  },
  {
    id: "prayer_followup",
    label: "🙏 Prayer Follow-up",
    description: "Checking on a specific prayer need",
  },
  {
    id: "announcement",
    label: "📢 Church Announcement",
    description: "Friendly event or schedule reminder",
  },
];

export default function AiTextComposerModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  defaultCategory = "encouragement",
  defaultCustomPrompt = "",
  pastorName = "",
  churchName = "",
}: TextComposerProps) {
  const [category, setCategory] = useState(defaultCategory);
  const [customPrompt, setCustomPrompt] = useState(defaultCustomPrompt);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory || "encouragement");
      setCustomPrompt(defaultCustomPrompt || "");
      setMessage("");
      setCopied(false);
      setError(null);
    }
  }, [isOpen, defaultCategory, defaultCustomPrompt]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/compose-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          category,
          customPrompt,
          pastorName,
          churchName,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate pastoral text message");
      }

      const data = await res.json();
      if (data.text) {
        setMessage(data.text);
      } else {
        throw new Error("No text generated");
      }
    } catch (err: any) {
      console.error("AI text error:", err);
      setError(err?.message || "Could not generate text. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const cleanPhone = (recipientPhone || "").replace(/[^\d+]/g, "");

  const handleSendSms = () => {
    if (!cleanPhone) {
      alert("No phone number available for this contact.");
      return;
    }
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const handleCopy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy error:", err);
    }
  };

  const charCount = message.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-[#F8F5EE] border-[#022d5c]/20 shadow-2xl">
        {/* Header */}
        <div className="bg-[#022d5c] text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#D0A348]/20 text-[#D0A348] rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-playfair font-bold text-white">
                  AI Pastoral Text Assistant
                </DialogTitle>
                <p className="text-xs text-white/80 mt-0.5">
                  Send a warm, personal text to{" "}
                  <span className="font-semibold text-[#D0A348]">
                    {recipientName || "Church Member"}
                  </span>
                  {recipientPhone ? ` (${recipientPhone})` : ""}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Tone Selectors */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">
              Select Pastoral Purpose:
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "bg-[#022d5c] text-white border-[#022d5c] shadow-sm font-medium"
                        : "bg-white text-gray-700 border-gray-200 hover:border-[#D0A348] hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-semibold truncate">{cat.label}</div>
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isSelected ? "text-white/80" : "text-gray-500"
                      }`}
                    >
                      {cat.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Notes / Specific Situation */}
          <div>
            <Label htmlFor="custom-notes" className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">
              Specific Details or Prayer Need (Optional):
            </Label>
            <Input
              id="custom-notes"
              placeholder="e.g., Surgery went well yesterday; loved having their family in church; etc."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="mt-1 bg-white border-gray-300 text-xs sm:text-sm text-gray-800"
            />
          </div>

          {/* Generate Button */}
          <div>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#022d5c] to-[#044389] hover:from-[#03366e] hover:to-[#0551a3] text-white font-semibold py-2.5 shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#D0A348]" />
                  Composing Pastoral Message...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D0A348]" />
                  {message ? "Regenerate Message with AI" : "Generate Pastoral Message"}
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              {error}
            </div>
          )}

          {/* Editable Textbox */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="message-preview" className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">
                Text Message Preview (Editable):
              </Label>
              <span
                className={`text-[11px] font-medium ${
                  charCount > 300 ? "text-amber-600" : "text-gray-500"
                }`}
              >
                {charCount} characters • {segments} SMS {segments === 1 ? "segment" : "segments"}
              </span>
            </div>
            <Textarea
              id="message-preview"
              rows={4}
              placeholder="Click 'Generate Pastoral Message' above or type your text here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-white border-gray-300 text-sm text-gray-900 leading-relaxed focus:border-[#022d5c] focus:ring-[#022d5c]"
            />
            <p className="text-[11px] text-gray-500 italic">
              💡 You can freely edit or personalize this message before sending.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {message && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="text-xs border-gray-300 text-gray-700 hover:bg-gray-100 flex-1 sm:flex-none"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    Copy Text
                  </>
                )}
              </Button>
            )}

            {cleanPhone && (
              <a
                href={`sms:${cleanPhone}`}
                className="text-[11px] text-gray-500 hover:text-[#022d5c] underline py-1 px-2"
                title="Open empty SMS draft in your phone's messaging app"
              >
                Direct SMS (Blank)
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-gray-300 text-gray-700"
            >
              Close
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendSms}
              disabled={!cleanPhone || !message.trim()}
              className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs shadow-sm flex-1 sm:flex-none"
              title="Opens your device's default texting app with contact and message pre-filled"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send via Text (SMS)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Printer, Copy, Check, ArrowRight, Gift, Heart } from 'lucide-react';

function GiftSuccessContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [copied, setCopied] = useState(false);
  const [giftData, setGiftData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }

    fetch(`/api/gifts/redeem?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.gift) {
          setGiftData(data.gift);
        }
      })
      .catch((err) => console.error('Error loading gift details:', err))
      .finally(() => setLoading(false));
  }, [code]);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-lg border border-gray-100 text-center relative overflow-hidden">
        {/* Top Celebration Accent */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] mb-2">
          Your Gift Has Been Processed!
        </h1>
        <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto mb-8">
          Thank you for your generosity in blessing your pastor's ministry and study.
        </p>

        {/* Gift Summary Box */}
        <div className="bg-[#FAF7F0] border-2 border-dashed border-[#D0A348] rounded-2xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between border-b border-[#D0A348]/30 pb-3 mb-4">
            <span className="text-xs font-bold text-[#022d5c] uppercase tracking-wider flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#D0A348]" /> Gift Subscription Details
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Paid &bull; Ready to Redeem
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm mb-4">
            <div>
              <span className="text-gray-500 block">Recipient:</span>
              <strong className="text-[#022d5c]">{giftData?.recipient_name || 'Your Pastor'}</strong>
              {giftData?.recipient_church && (
                <span className="text-gray-500 block text-xs">{giftData.recipient_church}</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block">Package:</span>
              <strong className="text-[#022d5c]">
                {giftData?.plan_duration_months >= 12 ? '1 Full Year' : '6 Months'} Pro Access
              </strong>
            </div>
          </div>

          {/* Code Box */}
          <div className="bg-white rounded-xl p-4 border border-[#D0A348]/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold block">
                Redemption Code:
              </span>
              <span className="font-mono text-xl font-bold text-[#022d5c] tracking-widest">
                {code || 'GIFT-XXXX-XXXX'}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#022d5c] hover:bg-[#033b78] text-white px-4 py-2 rounded-lg text-xs font-bold transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#D0A348]" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Code
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/gift/certificate/${encodeURIComponent(code)}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#D0A348] hover:bg-[#c2953d] text-[#022d5c] font-bold px-6 py-3.5 rounded-xl shadow-md transition"
          >
            <Printer className="w-5 h-5" />
            View &amp; Print Gift Certificate
          </Link>
          <Link
            href="/welcome"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3.5 rounded-xl transition text-sm"
          >
            Return to Homepage
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-8">
          A receipt and certificate link have also been sent to your email.
        </p>
      </div>
    </div>
  );
}

export default function GiftSuccessPage() {
  return (
    <div className="min-h-screen bg-[#F8F5EE]">
      <header className="bg-[#022d5c] border-b border-[#D0A348]/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/welcome">
            <Image 
              src="/logo-dark.png" 
              alt="The Shepherd's Desk" 
              width={200} 
              height={50} 
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>
      </header>

      <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading gift details...</div>}>
        <GiftSuccessContent />
      </Suspense>
    </div>
  );
}

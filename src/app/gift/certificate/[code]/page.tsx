"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Printer, ArrowLeft, CheckCircle2, Heart, Sparkles, AlertCircle } from 'lucide-react';

export default function GiftCertificatePage() {
  const params = useParams();
  const rawCode = params?.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode || '';

  const [gift, setGift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setError('No gift code specified.');
      setLoading(false);
      return;
    }

    fetch(`/api/gifts/redeem?code=${encodeURIComponent(code)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gift not found.');
        setGift(data.gift);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || 'Unable to load gift certificate.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center text-gray-500 font-medium">
        Loading Pastoral Gift Certificate...
      </div>
    );
  }

  if (error || !gift) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Certificate Not Found</h2>
        <p className="text-gray-600 text-sm max-w-sm mb-6">{error || 'This certificate code could not be verified.'}</p>
        <Link href="/gift" className="text-[#022d5c] underline font-medium text-sm">
          Return to Gift Page
        </Link>
      </div>
    );
  }

  const durationText = (gift.plan_duration_months || 12) >= 12 ? 'One Full Year' : 'Six Months';
  const formattedDate = gift.created_at
    ? new Date(gift.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#E5E0D4] py-8 px-4 sm:px-6">
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            box-shadow: none !important;
            border: 4px double #D0A348 !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
          }
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
        }
      `}</style>

      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/gift"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#022d5c] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Gift Studio
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 bg-[#022d5c] hover:bg-[#033b78] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition"
          >
            <Printer className="w-4 h-4 text-[#D0A348]" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* The Printable Certificate Container */}
      <div className="print-container max-w-4xl mx-auto bg-[#FFFDF9] rounded-2xl p-8 sm:p-14 shadow-2xl border-8 border-double border-[#D0A348] relative overflow-hidden">
        {/* Subtle Watermark or Corner Accents */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-[#D0A348]"></div>
        <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#D0A348]"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-[#D0A348]"></div>
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-[#D0A348]"></div>

        {/* Header Branding */}
        <div className="text-center mb-8 relative">
          <div className="flex justify-center mb-3">
            <Image
              src="/shepherds-desk-banner-logo.png"
              alt="The Shepherd's Desk"
              width={260}
              height={65}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-[#D0A348] mb-1">
            Certificate of Pastoral Appreciation
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] tracking-wide">
            A Ministry Blessing
          </h1>
          <div className="w-24 h-0.5 bg-[#D0A348] mx-auto mt-3"></div>
        </div>

        {/* Certificate Body */}
        <div className="text-center space-y-5 my-8">
          <p className="text-xs sm:text-sm uppercase tracking-widest text-gray-500 font-medium">
            This Certificate is joyfully presented to
          </p>

          <div className="border-b-2 border-[#022d5c]/20 pb-2 inline-block min-w-[280px] sm:min-w-[420px]">
            <h2 className="text-2xl sm:text-4xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c]">
              Pastor {gift.recipient_name}
            </h2>
            {gift.recipient_church && (
              <p className="text-sm font-semibold text-gray-600 mt-1">{gift.recipient_church}</p>
            )}
          </div>

          <p className="text-sm sm:text-base text-gray-700 max-w-xl mx-auto leading-relaxed pt-2">
            In grateful honor of your faithful service, spiritual leadership, and heartfelt devotion to God's flock, you have been blessed with
          </p>

          {/* Subscription Banner */}
          <div className="bg-[#FAF7F0] border border-[#D0A348]/60 rounded-xl p-4 max-w-lg mx-auto shadow-sm">
            <div className="text-lg sm:text-xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c]">
              {durationText} of The Shepherd's Desk Pro
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Full access for sermon preparation, sacred study time, pulpit prompter, and member care.
            </p>
          </div>

          {/* Personal Message */}
          {gift.personal_message && (
            <div className="max-w-xl mx-auto my-6 bg-white/70 border-l-4 border-[#D0A348] p-4 rounded-r-lg text-left shadow-inner">
              <p className="text-xs sm:text-sm italic text-[#022d5c] leading-relaxed">
                "{gift.personal_message}"
              </p>
              <p className="text-xs font-bold text-[#D0A348] text-right mt-2">
                — {gift.giver_name}
              </p>
            </div>
          )}

          {/* Romans Scripture Verse */}
          <div className="pt-2 max-w-md mx-auto">
            <p className="text-xs sm:text-sm italic font-serif text-gray-600">
              "How beautiful are the feet of those who bring good news!"
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[#022d5c] mt-1">
              — Romans 10:15
            </p>
          </div>
        </div>

        {/* Certificate Signatures & Code Footer */}
        <div className="border-t-2 border-[#D0A348]/40 pt-6 mt-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end text-center">
            
            {/* Date */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Date of Presentation</p>
              <p className="text-sm font-bold text-[#022d5c]">{formattedDate}</p>
            </div>

            {/* Redemption Code Centerpiece */}
            <div className="bg-[#FAF7F0] border-2 border-dashed border-[#D0A348] rounded-xl p-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                Redemption Code
              </span>
              <span className="font-mono text-base sm:text-lg font-extrabold text-[#022d5c] tracking-widest">
                {gift.code}
              </span>
            </div>

            {/* Presented By */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Presented With Love By</p>
              <p className="text-sm font-bold text-[#022d5c]">{gift.giver_name}</p>
            </div>
          </div>

          {/* Simple instructions */}
          <div className="text-center mt-6 text-[11px] text-gray-500">
            To activate your subscription, visit <strong className="text-[#022d5c]">theshepherdsdesk.app/gift/redeem</strong> and enter code <strong className="text-[#022d5c] font-mono">{gift.code}</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

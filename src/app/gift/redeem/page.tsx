"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  Gift, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  BookOpen, 
  Heart,
  Check
} from 'lucide-react';

function RedeemGiftContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [gift, setGift] = useState<any>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<any>(null);

  const supabase = createClient();

  // Check current auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
    });
  }, []);

  // If code is in URL on load, check it automatically
  useEffect(() => {
    if (initialCode) {
      verifyCode(initialCode);
    }
  }, [initialCode]);

  const verifyCode = async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim().toUpperCase();
    if (!cleanCode) return;

    setLoadingCheck(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/gifts/redeem?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      if (!res.ok || !data.gift) {
        throw new Error(data.error || 'Gift code not found.');
      }
      setGift(data.gift);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid or unverified gift code.');
      setGift(null);
    } finally {
      setLoadingCheck(false);
    }
  };

  const handleManualCheck = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(code);
  };

  const handleRedeem = async () => {
    if (!gift?.code) return;
    setRedeeming(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/gifts/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: gift.code }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to claim gift subscription.');
      }

      setSuccessResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error claiming gift. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  // Success State
  if (successResult) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] mb-3">
          Gift Subscription Activated!
        </h1>
        <p className="text-gray-600 text-sm sm:text-base mb-6">
          Your Pro account is now active. May this platform richly bless your weekly sermon preparation and pastoral care!
        </p>

        <div className="bg-[#FAF7F0] border border-[#D0A348]/50 rounded-2xl p-5 mb-8 text-left">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Active Until</p>
          <p className="text-lg font-bold text-[#022d5c]">
            {new Date(successResult.expiresAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            No credit card will be charged. All Pro tools—including Sermon Studio, AI Pastoral Texts, and Sacred Study Time—are unlocked.
          </p>
        </div>

        <Link
          href="/"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#022d5c] hover:bg-[#033b78] text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition"
        >
          Go to My Dashboard &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-[#D0A348]/20 text-[#022d5c] font-bold text-xs px-3.5 py-1.5 rounded-full uppercase tracking-wider">
          <Gift className="w-4 h-4 text-[#D0A348]" /> Pastoral Gift Redemption
        </div>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c]">
          Claim Your Gift Subscription
        </h1>
        <p className="text-sm text-gray-600 max-w-sm mx-auto">
          Enter your unique gift redemption code below to unlock your subscription.
        </p>
      </div>

      {/* Code Input Form (if not verified yet) */}
      {!gift && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
          <form onSubmit={handleManualCheck} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                Redemption Code
              </label>
              <input
                type="text"
                placeholder="e.g. GIFT-7K2P-9M4X"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] font-mono text-base font-bold text-[#022d5c] uppercase tracking-wider outline-none transition text-center"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingCheck || !code.trim()}
              className="w-full bg-[#022d5c] hover:bg-[#033b78] text-white font-bold py-3.5 px-6 rounded-xl text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingCheck ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                </>
              ) : (
                <>
                  Verify Gift Code &rarr;
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Verified Gift Card Preview */}
      {gift && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-gray-200 space-y-6">
          <div className="bg-[#FAF7F0] border-2 border-[#D0A348] rounded-2xl p-6 text-center space-y-4">
            <p className="text-xs uppercase tracking-widest text-[#022d5c]/70 font-bold">
              Special Ministry Gift Dedicated To
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c]">
              Pastor {gift.recipient_name}
            </h2>
            {gift.recipient_church && (
              <p className="text-xs font-semibold text-gray-600">{gift.recipient_church}</p>
            )}

            <div className="bg-white rounded-xl p-3 border border-[#D0A348]/40 inline-block px-6">
              <span className="font-bold text-[#022d5c] text-sm">
                {(gift.plan_duration_months || 12) >= 12 ? '1 Full Year' : '6 Months'} The Shepherd's Desk Pro
              </span>
            </div>

            {gift.personal_message && (
              <div className="bg-white/70 border-l-4 border-[#D0A348] p-4 rounded-r-lg text-left my-3 shadow-inner">
                <p className="text-xs italic text-[#022d5c] leading-relaxed">
                  "{gift.personal_message}"
                </p>
                <p className="text-[11px] font-bold text-[#D0A348] text-right mt-1.5">
                  — Gifted with appreciation by {gift.giver_name}
                </p>
              </div>
            )}
          </div>

          {/* Status check */}
          {gift.status === 'redeemed' ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs sm:text-sm text-center">
              ⚠️ This gift subscription code has already been claimed.
            </div>
          ) : gift.status !== 'paid' ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs sm:text-sm text-center">
              ⏳ This gift order is still processing payment.
            </div>
          ) : (
            <div>
              {user ? (
                /* Authenticated Pastor Claim View */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center justify-between">
                    <span>Signed in as: <strong>{user.email}</strong></span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="w-full bg-[#022d5c] hover:bg-[#033b78] text-white font-bold py-4 px-6 rounded-xl text-base shadow-md flex items-center justify-center gap-2 border-2 border-[#D0A348] transition disabled:opacity-50"
                  >
                    {redeeming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Activating Gift...
                      </>
                    ) : (
                      <>
                        <span>Claim &amp; Activate My Subscription</span>
                        <ArrowRight className="w-5 h-5 text-[#D0A348]" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Unauthenticated view */
                <div className="space-y-4 text-center">
                  <p className="text-xs text-gray-600">
                    To apply this gift to your pastoral workspace, please sign in or create a free account.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href={`/login?mode=signup&gift=${encodeURIComponent(gift.code)}`}
                      className="flex-1 bg-[#022d5c] hover:bg-[#033b78] text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-sm"
                    >
                      Create Free Account &amp; Claim
                    </Link>
                    <Link
                      href={`/login?gift=${encodeURIComponent(gift.code)}`}
                      className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 rounded-xl text-sm transition"
                    >
                      Sign In to Claim
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setGift(null);
                setCode('');
                setErrorMsg('');
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Enter a different code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GiftRedeemPage() {
  return (
    <div className="min-h-screen bg-[#F8F5EE]">
      <header className="bg-[#022d5c] border-b border-[#D0A348]/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/welcome">
            <Image 
              src="/shepherds-desk-banner-logo.png" 
              alt="The Shepherd's Desk" 
              width={200} 
              height={50} 
              className="h-9 w-auto object-contain"
            />
          </Link>
          <Link
            href="/gift"
            className="text-xs sm:text-sm font-semibold text-white/80 hover:text-[#D0A348] transition-colors"
          >
            Want to gift a pastor? &rarr;
          </Link>
        </div>
      </header>

      <main className="py-12 px-6">
        <Suspense fallback={<div className="text-center py-20 text-gray-500">Loading redemption...</div>}>
          <RedeemGiftContent />
        </Suspense>
      </main>
    </div>
  );
}

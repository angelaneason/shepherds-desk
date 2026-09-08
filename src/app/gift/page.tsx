"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Gift, 
  Heart, 
  Sparkles, 
  Printer, 
  Mail, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Loader2
} from 'lucide-react';

export default function GiftPage() {
  const [duration, setDuration] = useState<12 | 6>(12);
  const [deliveryMethod, setDeliveryMethod] = useState<'print' | 'email'>('print');
  const [recipientName, setRecipientName] = useState('');
  const [recipientChurch, setRecipientChurch] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [giverName, setGiverName] = useState('');
  const [giverEmail, setGiverEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState(
    "Thank you for faithfully shepherding our church and proclaiming God's Word with love and devotion. We pray this tool blesses your study and ministry time!"
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const price = duration === 12 ? 149 : 79;
  const durationLabel = duration === 12 ? '1 Full Year' : '6 Months';

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!giverName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!giverEmail.trim() || !giverEmail.includes('@')) {
      setErrorMsg('Please enter a valid email for your receipt.');
      return;
    }
    if (!recipientName.trim()) {
      setErrorMsg("Please enter your pastor's name.");
      return;
    }
    if (deliveryMethod === 'email' && (!recipientEmail.trim() || !recipientEmail.includes('@'))) {
      setErrorMsg("Please enter your pastor's email address for digital delivery.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/gifts/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giverName: giverName.trim(),
          giverEmail: giverEmail.trim(),
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim() || undefined,
          recipientChurch: recipientChurch.trim() || undefined,
          personalMessage: personalMessage.trim(),
          planDuration: duration,
          deliveryMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout session.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#1F2937]">
      {/* Navigation Bar */}
      <header className="bg-[#022d5c] border-b border-[#D0A348]/30 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/welcome" className="flex items-center gap-3">
            <Image 
              src="/shepherds-desk-banner-logo.png" 
              alt="The Shepherd's Desk" 
              width={220} 
              height={55} 
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link 
              href="/welcome" 
              className="text-white/80 hover:text-[#D0A348] text-sm font-medium transition-colors hidden sm:inline-block"
            >
              Learn More
            </Link>
            <Link 
              href="/gift/redeem" 
              className="text-xs sm:text-sm font-semibold bg-[#D0A348]/20 hover:bg-[#D0A348]/30 text-[#D0A348] border border-[#D0A348]/40 px-3.5 py-1.5 rounded-lg transition-all"
            >
              Have a Gift Code? Redeem &rarr;
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#022d5c] to-[#033b78] text-white py-14 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#D0A348]/20 border border-[#D0A348]/50 text-[#D0A348] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Gift className="w-4 h-4" /> Pastor Appreciation &amp; Ministry Gift
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-[family-name:var(--font-playfair)] mb-4 leading-tight">
            Gift <span className="text-[#D0A348]">The Shepherd's Desk</span> to Your Pastor
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
            Give your pastor the gift of focused study time, organized sermon preparation, and effortless care tracking. 
            A meaningful, practical blessing with no recurring fees for you.
          </p>

          <div className="mt-6 flex flex-wrap justify-center items-center gap-6 text-xs sm:text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#D0A348]" /> 100% One-Time Purchase
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#D0A348]" /> Instant Printable Certificate
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#D0A348]" /> No Credit Card Required for Pastor
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Form & Live Preview */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <form onSubmit={handleCheckout} className="space-y-8">
              
              {/* Step 1: Select Duration */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white text-xs font-bold flex items-center justify-center">1</span>
                  <h2 className="text-lg font-bold text-[#022d5c]">Choose Gift Duration</h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1 Year Option */}
                  <div 
                    onClick={() => setDuration(12)}
                    className={`cursor-pointer rounded-xl p-5 border-2 transition-all relative ${
                      duration === 12 
                        ? 'border-[#D0A348] bg-[#FAF7F0] shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-3 bg-[#022d5c] text-[#D0A348] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Most Popular &bull; Save 20%
                    </div>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-gray-900 text-base">1 Full Year</span>
                      <span className="text-2xl font-bold text-[#022d5c] font-[family-name:var(--font-playfair)]">$149</span>
                    </div>
                    <p className="text-xs text-gray-600">365 days of full Pro access. One-time prepaid gift.</p>
                  </div>

                  {/* 6 Months Option */}
                  <div 
                    onClick={() => setDuration(6)}
                    className={`cursor-pointer rounded-xl p-5 border-2 transition-all ${
                      duration === 6 
                        ? 'border-[#D0A348] bg-[#FAF7F0] shadow-sm' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-bold text-gray-900 text-base">6 Months</span>
                      <span className="text-2xl font-bold text-[#022d5c] font-[family-name:var(--font-playfair)]">$79</span>
                    </div>
                    <p className="text-xs text-gray-600">Half-year ministry blessing. One-time prepaid gift.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Pastor's Information */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white text-xs font-bold flex items-center justify-center">2</span>
                  <h2 className="text-lg font-bold text-[#022d5c]">Who is this gift for?</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Pastor's Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Pastor David Miller"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Church / Ministry Name <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Grace Community Church"
                      value={recipientChurch}
                      onChange={(e) => setRecipientChurch(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Your Info & Message */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white text-xs font-bold flex items-center justify-center">3</span>
                  <h2 className="text-lg font-bold text-[#022d5c]">From You</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                        Your Name / Family Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. The Anderson Family or Deacons"
                        value={giverName}
                        onChange={(e) => setGiverName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                        Your Email <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="email" 
                        placeholder="For your receipt and certificate link"
                        value={giverEmail}
                        onChange={(e) => setGiverEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Personal Message of Appreciation
                    </label>
                    <textarea 
                      rows={3}
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                      placeholder="Write a warm note of thanks and encouragement..."
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Delivery Method */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white text-xs font-bold flex items-center justify-center">4</span>
                  <h2 className="text-lg font-bold text-[#022d5c]">How would you like to give it?</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Print / In-Person */}
                  <div 
                    onClick={() => setDeliveryMethod('print')}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-start gap-3 ${
                      deliveryMethod === 'print'
                        ? 'border-[#022d5c] bg-[#FAF7F0]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Printer className={`w-5 h-5 mt-0.5 ${deliveryMethod === 'print' ? 'text-[#022d5c]' : 'text-gray-400'}`} />
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">Printable Certificate</span>
                      <p className="text-xs text-gray-500 mt-0.5">I'll print the certificate and slip it into a card or present it in person.</p>
                    </div>
                  </div>

                  {/* Email Delivery */}
                  <div 
                    onClick={() => setDeliveryMethod('email')}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all flex items-start gap-3 ${
                      deliveryMethod === 'email'
                        ? 'border-[#022d5c] bg-[#FAF7F0]'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Mail className={`w-5 h-5 mt-0.5 ${deliveryMethod === 'email' ? 'text-[#022d5c]' : 'text-gray-400'}`} />
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">Email to Pastor</span>
                      <p className="text-xs text-gray-500 mt-0.5">We will email the gift announcement and redemption link directly to your pastor.</p>
                    </div>
                  </div>
                </div>

                {deliveryMethod === 'email' && (
                  <div className="mt-4 animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
                      Pastor's Email Address <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="email" 
                      placeholder="pastor@church.org"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#022d5c] focus:ring-1 focus:ring-[#022d5c] text-sm outline-none transition"
                      required
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 text-red-700 text-xs sm:text-sm rounded-lg border border-red-200">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#022d5c] hover:bg-[#033b78] text-white font-bold py-4 px-6 rounded-xl text-base shadow-md flex items-center justify-center gap-2 border-2 border-[#D0A348] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Preparing Secure Checkout...
                    </>
                  ) : (
                    <>
                      <span>Complete Gift Purchase &bull; ${price} (One-Time)</span>
                      <ArrowRight className="w-5 h-5 text-[#D0A348]" />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-3 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Processed securely via Stripe &bull; No recurring charge &bull; 100% Satisfaction Guarantee
                </p>
              </div>

            </form>
          </div>

          {/* Right Column: Live Certificate Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#D0A348]" /> Live Certificate Preview
                </span>
                <span className="text-xs text-gray-400 font-medium">Updates live</span>
              </div>

              {/* The Visual Certificate */}
              <div className="bg-[#FAF7F0] border-4 border-double border-[#D0A348] rounded-xl p-6 shadow-inner text-center relative overflow-hidden">
                {/* Decorative header */}
                <div className="mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#022d5c]/60">
                    Certificate of Appreciation &bull; Ministry Gift
                  </div>
                  <h3 className="text-xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] mt-1">
                    The Shepherd's Desk
                  </h3>
                  <div className="w-12 h-0.5 bg-[#D0A348] mx-auto mt-2"></div>
                </div>

                <div className="space-y-3 my-4">
                  <p className="text-xs text-gray-500">Presented with gratitude to</p>
                  <p className="text-lg font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] border-b border-[#D0A348]/40 pb-1 inline-block min-w-[200px]">
                    {recipientName.trim() || 'Pastor [Name]'}
                  </p>
                  {recipientChurch.trim() && (
                    <p className="text-xs text-gray-600 font-medium">{recipientChurch.trim()}</p>
                  )}
                  
                  <div className="bg-white/80 rounded-lg p-3 border border-[#D0A348]/30 my-3">
                    <p className="text-xs text-[#022d5c] font-bold">
                      {durationLabel} Full Access Subscription
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Dedicated for Sermon Study, Care Tracking &amp; Pastoral Ministry
                    </p>
                  </div>

                  {personalMessage.trim() && (
                    <p className="text-xs italic text-gray-700 line-clamp-3 px-2">
                      "{personalMessage.trim()}"
                    </p>
                  )}

                  <p className="text-xs text-gray-600 pt-2">
                    Gifted with appreciation by <strong className="text-[#022d5c]">{giverName.trim() || '[Your Name]'}</strong>
                  </p>
                </div>

                {/* Footer seal */}
                <div className="pt-3 border-t border-[#D0A348]/30 flex items-center justify-between text-[10px] text-gray-500">
                  <span>Romans 10:15</span>
                  <span className="font-mono text-[#022d5c] font-bold">GIFT-XXXX-XXXX</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  High-resolution, printable PDF version generated upon checkout.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  Includes simple 1-click redemption instructions for your pastor.
                </p>
              </div>
            </div>

            {/* What's Included Callout Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-bold text-sm text-[#022d5c] uppercase tracking-wide mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#D0A348]" /> What Your Gift Includes
              </h3>
              <ul className="space-y-2.5 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-[#022d5c] mt-0.5 flex-shrink-0" />
                  <span><strong>Sermon Studio &amp; Pulpit Mode:</strong> Distraction-free sermon writing with a live preaching prompter clock.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-[#022d5c] mt-0.5 flex-shrink-0" />
                  <span><strong>AI Pastoral Care Assistant:</strong> Hospital visits, grief checks, and pastoral texting tools.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#022d5c] mt-0.5 flex-shrink-0" />
                  <span><strong>Sacred Study Time Scheduler:</strong> Guard weekly deep study and sermon prep hours.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-[#022d5c] mt-0.5 flex-shrink-0" />
                  <span><strong>Mobile &amp; Web Synchronization:</strong> Full access across phone, tablet, and computer.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* FAQ Section */}
      <section className="bg-white border-t border-gray-200 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c] text-center mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6 text-sm">
            <div className="border-b border-gray-100 pb-4">
              <h4 className="font-bold text-[#022d5c] mb-1">Will my card be billed again next year?</h4>
              <p className="text-gray-600">
                No. Gift packages are strictly <strong>one-time payments</strong>. You will never be automatically charged again.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="font-bold text-[#022d5c] mb-1">What if my pastor already has an account?</h4>
              <p className="text-gray-600">
                When your pastor enters the gift redemption code, it will automatically extend their existing subscription by 6 or 12 months, completely free of charge.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="font-bold text-[#022d5c] mb-1">How does my pastor claim the gift?</h4>
              <p className="text-gray-600">
                Your pastor visits <strong>theshepherdsdesk.app/gift/redeem</strong>, enters their gift code, and clicks "Claim". They will not be asked for a credit card.
              </p>
            </div>

            <div className="border-b border-gray-100 pb-4">
              <h4 className="font-bold text-[#022d5c] mb-1">Can I get a receipt for tax or church reimbursement purposes?</h4>
              <p className="text-gray-600">
                Yes, an itemized Stripe tax receipt is emailed to you instantly upon checkout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#022d5c] text-white/70 py-8 px-6 text-center text-xs">
        <p>© {new Date().getFullYear()} The Shepherd's Desk &bull; Built with love for those who shepherd God's people.</p>
      </footer>
    </div>
  );
}

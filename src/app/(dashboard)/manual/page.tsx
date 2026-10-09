'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Smartphone,
  QrCode,
  Send,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Printer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  Lock,
  ArrowRight,
  Heart,
  MessageSquare,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FAQItem {
  question: string
  answer: string
}

const FAQS: FAQItem[] = [
  {
    question: 'Do my church members need to download an app to get texts?',
    answer:
      'No. Members receive standard SMS text messages on their regular phone. They do not need to install anything, sign up, or create an account.',
  },
  {
    question: 'Can members reply to my text?',
    answer:
      'Yes. Because the message is sent directly through your personal mobile carrier, any reply comes straight to your phone native Messages app, allowing private pastoral conversation.',
  },
  {
    question: 'Does The Shepherd Desk store or read my personal text conversations?',
    answer:
      'Never. The server only holds outgoing broadcast texts in temporary memory during the few seconds it takes to dispatch them to your paired phone, then wipes the text. Your phone is always the private source of truth.',
  },
  {
    question: 'What if I lose my phone or switch to a new phone?',
    answer:
      'Simply navigate to Settings > Phone Bridge on the web dashboard and click Disconnect Phone. This instantly revokes pairing tokens. You can then scan a new QR code to pair your new device in seconds.',
  },
  {
    question: 'Why does Phone Bridge pause between messages during broadcasts?',
    answer:
      'Major mobile carriers like Verizon, AT&T, and T-Mobile will flag or block phone numbers that blast out dozens of texts in the exact same second. Smart Pacing spaces texts 8 to 15 seconds apart to keep your phone number completely safe and trusted.',
  },
  {
    question: 'What happens if a broadcast runs late into the evening?',
    answer:
      'Phone Bridge respects pastoral quiet hours. If a broadcast is still sending between 9:00 PM and 8:00 AM, the app automatically pauses sending so your members are not woken up at night. Sending safely resumes in the morning.',
  },
]

export default function ManualPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<string>('all')

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 print:p-0 print:max-w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#022d5c] via-[#033c7a] to-[#022d5c] text-white rounded-2xl p-6 md:p-8 shadow-lg border border-[#D0A348]/20 print:border-none print:shadow-none print:bg-white print:text-black">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D0A348]/20 text-[#D0A348] text-xs font-semibold uppercase tracking-wider print:hidden">
              <BookOpen className="w-3.5 h-3.5" />
              Pastor Reference Manual
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-serif print:text-2xl">
              The Shepherd&apos;s Desk &amp; Phone Bridge
            </h1>
            <p className="text-white/80 text-sm md:text-base max-w-2xl print:text-gray-700">
              A simple, step-by-step user manual designed specifically for pastors and ministry leaders.
              Learn how to connect your phone, send warm pastoral care messages, and manage your flock.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Manual
            </Button>
            <Link href="/settings">
              <Button className="bg-[#D0A348] hover:bg-[#b88f3b] text-[#022d5c] font-semibold gap-2 shadow cursor-pointer">
                <Smartphone className="w-4 h-4" />
                Phone Bridge Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Jump Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 print:hidden">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Jump to Section
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="#welcome"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            Welcome
          </a>
          <a
            href="#setup"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            1. One-Time Setup
          </a>
          <a
            href="#pastoral-care"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            2. 1:1 Care Texts
          </a>
          <a
            href="#broadcasts"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            3. Church Broadcasts
          </a>
          <a
            href="#smart-pacing"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            4. Smart Pacing
          </a>
          <a
            href="#directory"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            5. Member Directory
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            6. FAQ
          </a>
        </div>
      </div>

      {/* Section: Welcome */}
      <section id="welcome" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c]/10 text-[#022d5c] flex items-center justify-center font-bold text-lg">
            📖
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Welcome to The Shepherd&apos;s Desk</h2>
            <p className="text-xs text-gray-500">Your calm sanctuary for pastoral ministry</p>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed text-sm md:text-base">
          The Shepherd&apos;s Desk is crafted to give you a single, peaceful place to shepherd your congregation.
          It brings together pastoral care tracking, sermon preparation, prayer requests, calendar events, and church communication.
        </p>

        <div className="bg-[#f8f5ee] border-l-4 border-[#D0A348] p-4 rounded-r-xl space-y-2">
          <h3 className="text-sm font-bold text-[#022d5c] flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#D0A348]" />
            What is Phone Bridge?
          </h3>
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
            <strong>Phone Bridge</strong> is your companion utility that links your computer web dashboard directly to your mobile phone.
            It allows you to comfortably type care messages and announcements on your full computer keyboard, but sends them through your own personal phone carrier.
          </p>
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
            Your church members receive a warm, recognizable text directly from their pastor, not an impersonal robot or random five-digit short code.
          </p>
        </div>
      </section>

      {/* Section 1: One-Time Phone Setup */}
      <section id="setup" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Getting Started: One-Time Phone Setup</h2>
            <p className="text-xs text-gray-500">Takes less than two minutes to pair your phone</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1 */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D0A348] text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h3 className="font-bold text-[#022d5c] text-sm md:text-base">Install Phone Bridge</h3>
            </div>
            <ol className="space-y-2.5 text-xs md:text-sm text-gray-700 list-decimal list-inside pl-1">
              <li>
                Download and install <strong>Shepherd&apos;s Desk Phone Bridge</strong> on your Android phone.
              </li>
              <li>
                Open the app. You will see a welcome screen explaining that messages will send from your carrier phone number.
              </li>
              <li>
                Tap <strong>Continue</strong> and grant the standard SMS and Notification permissions when prompted.
              </li>
              <li>
                Sign in using the exact same email and password you use for The Shepherd&apos;s Desk web dashboard.
              </li>
            </ol>
          </div>

          {/* Step 2 */}
          <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#D0A348] text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h3 className="font-bold text-[#022d5c] text-sm md:text-base">Pair Your Phone</h3>
            </div>
            <ol className="space-y-2.5 text-xs md:text-sm text-gray-700 list-decimal list-inside pl-1">
              <li>
                On your computer or tablet, go to{' '}
                <Link href="/settings" className="text-[#022d5c] font-semibold underline">
                  Settings
                </Link>{' '}
                and look for the <strong>Phone Bridge</strong> card.
              </li>
              <li>
                Click <strong>Connect Phone</strong> (or Pair Device) to display your unique pairing QR code on screen.
              </li>
              <li>
                On your phone, tap <strong>Scan QR Code</strong> and point your camera at the computer screen.
              </li>
              <li>
                Your phone will instantly confirm <strong>&quot;Ready to Bridge&quot;</strong> with your device name.
              </li>
            </ol>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-amber-900 leading-relaxed">
            <strong>Battery Optimization Tip:</strong> For uninterrupted background sending, go to your phone&apos;s{' '}
            <em>Settings &gt; Apps &gt; Phone Bridge &gt; Battery</em> and select <strong>Unrestricted</strong>.
            This ensures your phone does not pause long broadcasts when the screen turns off.
          </div>
        </div>
      </section>

      {/* Section 2: Sending 1:1 Pastoral Care Messages */}
      <section id="pastoral-care" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Sending 1:1 Pastoral Care Messages</h2>
            <p className="text-xs text-gray-500">Checking on sick members, following up, or sending scripture</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          When you want to reach out to an individual member without picking up your phone to type:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022d5c]">
              <Heart className="w-4 h-4 text-red-500" />
              1. Open Member Profile
            </div>
            <p className="text-xs text-gray-600">
              In the web dashboard, open the <strong>Care</strong> or <strong>People</strong> tab and click on the member profile.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022d5c]">
              <Sparkles className="w-4 h-4 text-[#D0A348]" />
              2. Draft Your Note
            </div>
            <p className="text-xs text-gray-600">
              Click <strong>Write Text</strong>. Draft your personal note or choose an AI pastoral encouragement prompt.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022d5c]">
              <Send className="w-4 h-4 text-emerald-600" />
              3. Send from Phone
            </div>
            <p className="text-xs text-gray-600">
              Click <strong>Send from my phone</strong>. The message dispatches through your mobile carrier and appears in your Messages app.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Sending Church-Wide Text Broadcasts */}
      <section id="broadcasts" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Sending Church-Wide Text Broadcasts</h2>
            <p className="text-xs text-gray-500">Prayer alerts, church cancelations, and mid-week encouragement</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 space-y-3">
            <h3 className="font-bold text-[#022d5c] text-sm md:text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">
                A
              </span>
              Step 1: Choose Your Recipients
            </h3>
            <ul className="space-y-1.5 text-xs md:text-sm text-gray-700 list-disc list-inside pl-2">
              <li>In the left sidebar, click <strong>Communication</strong> (or Announcements).</li>
              <li>Select the <strong>Text Broadcast</strong> tab.</li>
              <li>
                Choose <strong>Members</strong> (all contacts with a gold star) or <strong>Everyone</strong> (all active directory contacts), or manually check individual people.
              </li>
              <li>
                Anyone marked with <strong>Do Not Text</strong> is automatically excluded by the system.
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 space-y-3">
            <h3 className="font-bold text-[#022d5c] text-sm md:text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">
                B
              </span>
              Step 2: Personalize with Member Names
            </h3>
            <p className="text-xs md:text-sm text-gray-700">
              Type your announcement in the composer. Use the tag <code className="bg-gray-200 px-1.5 py-0.5 rounded text-[#022d5c] font-mono text-xs">{`{first_name}`}</code> anywhere in the message.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs md:text-sm text-gray-600 italic">
              Example: &quot;Good morning {`{first_name}`}, prayer meeting is at 7 tonight in the fellowship hall.&quot;
            </div>
            <p className="text-xs md:text-sm text-gray-700">
              When dispatched, each member receives a message with their real first name!
            </p>
          </div>

          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50 space-y-3">
            <h3 className="font-bold text-[#022d5c] text-sm md:text-base flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs">
                C
              </span>
              Step 3: Quick Biometric Authorization
            </h3>
            <p className="text-xs md:text-sm text-gray-700">
              For security, whenever you click <strong>Send from my phone</strong> on the web, a quick prompt arrives on your Android phone:
            </p>
            <div className="bg-[#f8f5ee] border-l-4 border-[#022d5c] p-3 rounded-r-lg text-xs md:text-sm text-[#022d5c] font-medium">
              &quot;Send broadcast to 25 members?&quot; &rarr; Tap notification &rarr; Confirm with Fingerprint or PIN.
            </div>
            <p className="text-xs text-gray-600">
              Once approved, your phone takes over and sends each message automatically in the background.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: How Smart Pacing Protects Your Phone Number */}
      <section id="smart-pacing" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">How Smart Pacing Protects Your Phone Number</h2>
            <p className="text-xs text-gray-500">Carrier spam protection built right into your phone</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Major mobile carriers like AT&amp;T, Verizon, and T-Mobile actively watch for spam bots.
          If a single phone blasts out fifty texts at the exact same fraction of a second, the carrier may suspend the line.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022d5c]">
              <Clock className="w-4 h-4 text-[#022d5c]" />
              Natural 8 to 15 Second Delays
            </div>
            <p className="text-xs text-gray-700">
              Phone Bridge spaces every message 8 to 15 seconds apart. To the carrier network, this looks like a human pastor sending texts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#022d5c]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Live Progress &amp; Pause Control
            </div>
            <p className="text-xs text-gray-700">
              While sending, a quiet notification appears: &quot;Sending message 4 of 24...&quot;. You can tap Pause or Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Member Privacy & Directory Management */}
      <section id="directory" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            5
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Member Privacy &amp; Directory Management</h2>
            <p className="text-xs text-gray-500">Protecting your congregation and honoring preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">⭐ Starred Members vs Regular Directory Contacts</h3>
            <p className="text-xs md:text-sm text-gray-700">
              Clicking the gold star on a contact marks them as an official church member.
              Contacts without a star remain respected contacts (such as visiting pastors, community partners, or guests). No negative labels are ever shown.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">🚫 &quot;Do Not Text&quot; Protection</h3>
            <p className="text-xs md:text-sm text-gray-700">
              If someone asks not to receive group SMS texts, toggle on <strong>Do Not Text</strong> on their profile.
              The system will completely lock their number out of broadcasts, while still allowing phone calls and pastoral visits.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">📁 Archiving vs Safe Deleting</h3>
            <p className="text-xs md:text-sm text-gray-700">
              <strong>Archiving:</strong> When someone moves away, archive their profile to keep your active list clean while keeping all past care history safe.
            </p>
            <p className="text-xs md:text-sm text-gray-700">
              <strong>Safe Deleting:</strong> Permanent deletion removes the contact but keeps historical care logs intact as &quot;Member (deleted)&quot;, preventing broken reports.
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Frequently Asked Questions */}
      <section id="faq" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            6
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Frequently Asked Questions</h2>
            <p className="text-xs text-gray-500">Quick answers to common questions from pastors</p>
          </div>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index
            return (
              <div
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden transition-all bg-white"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-xs md:text-sm text-[#022d5c]">
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs md:text-sm text-gray-700 leading-relaxed border-t border-gray-100 bg-gray-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Need Help Footer Banner */}
      <div className="rounded-2xl p-6 bg-[#022d5c] text-white text-center space-y-3 print:hidden">
        <h3 className="font-bold text-lg font-serif">Have Questions or Need Personal Assistance?</h3>
        <p className="text-xs md:text-sm text-white/80 max-w-xl mx-auto">
          We are here to support your ministry. You can email us anytime or open the live support chat in the bottom right corner.
        </p>
        <div className="pt-2">
          <a
            href="mailto:support@theshepherdsdesk.app"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D0A348] text-[#022d5c] font-bold text-sm hover:bg-[#b88f3b] transition-colors"
          >
            Email Support: support@theshepherdsdesk.app
          </a>
        </div>
      </div>
    </div>
  )
}

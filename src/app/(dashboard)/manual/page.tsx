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
  Calendar,
  FileText,
  RefreshCw,
  Lightbulb,
  Share2,
  HeartHandshake,
  BookMarked,
  Mic,
  Gift,
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
  {
    question: 'How does calendar scanning protect my private pastoral counseling notes?',
    answer:
      'When curating Sunday Announcements, the calendar scanner automatically filters for sensitive entries. Keywords such as counseling, doctor, dentist, private, and personal appointments are detected and excluded from the public church announcements by default.',
  },
  {
    question: 'Can I edit the generated Sunday Announcements before printing or broadcasting?',
    answer:
      'Yes. You have complete editorial control. Both the Pulpit Spoken Script and the Church Bulletin text can be edited directly inside the browser or mobile app before saving, printing, or sending as a broadcast.',
  },
  {
    question: 'Can I print my sermon manuscript or outline directly from my tablet or phone?',
    answer:
      'Yes. The sermon print preview allows you to select either Full Manuscript or Pulpit Outline, choose your font size (Standard 14pt, Large 16pt, or Pulpit Binder 20pt), and print directly to any network printer, AirPrint device, or export a clean PDF.',
  },
  {
    question: 'How do I use voice commands with the Smart Pastoral Assistant?',
    answer:
      'Tap the microphone icon or the Smart Assistant button on mobile or web. You can speak naturally, such as: "Remind me to visit Sister Mary tomorrow at 2 PM", "Add a new sermon titled Walking in Faith", or "Add Brother John to the prayer list". The assistant processes your intent and updates your calendar, sermons, or care notes automatically.',
  },
  {
    question: 'Can I convert my thoughts in Ideas into a full sermon?',
    answer:
      'Yes. Every idea card has a "Convert to Sermon" button. Tapping it instantly creates a new sermon draft in Sermon Studio with your notes, title, scripture references, and voice transcriptions pre-populated.',
  },
  {
    question: 'Where does the Community Relief directory get local resources?',
    answer:
      'The Resource Center queries verified public databases by ZIP code for verified local food pantries, shelters, utility assistance, and free health clinics. You can also save your own custom church benevolence contacts to the directory.',
  },
  {
    question: 'How does the Refer a Pastor program work?',
    answer:
      'In the Refer a Pastor section, you have a unique personal referral link and pre-written pastoral invitation messages. When a fellow pastor signs up through your link, they receive VIP onboarding and you can track their status in your dashboard.',
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
            href="#people"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            5. People &amp; Pastoral Care
          </a>
          <a
            href="#smart-assistant"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            6. Smart Assistant
          </a>
          <a
            href="#sermon-studio"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            7. Sermon Studio &amp; Pulpit
          </a>
          <a
            href="#ideas"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            8. Ministry Ideas
          </a>
          <a
            href="#calendar-setup"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            9. Ministry Calendar
          </a>
          <a
            href="#sunday-announcements"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            10. Sunday Announcements
          </a>
          <a
            href="#resources"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            11. Rich Resource Center
          </a>
          <a
            href="#referrals"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            12. Refer a Pastor
          </a>
          <a
            href="#pulpit-printing"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            13. Pulpit Printing &amp; PDF
          </a>
          <a
            href="#faq"
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-[#022d5c] hover:text-white transition-colors text-gray-700"
          >
            14. FAQ
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

      {/* Section 1: One-Time Setup */}
      <section id="setup" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Getting Started: One-Time Setup</h2>
            <p className="text-xs text-gray-500">Connect your mobile phone carrier and live Google or Apple calendar in under 5 minutes</p>
          </div>
        </div>

        {/* Part 1: Phone Bridge Setup */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Smartphone className="w-4 h-4 text-[#D0A348]" />
            <h3 className="font-bold text-[#022d5c] text-base">Part A: Phone Bridge Setup (2 Minutes)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D0A348] text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h4 className="font-bold text-[#022d5c] text-sm md:text-base">Install Phone Bridge</h4>
              </div>
              <ol className="space-y-2.5 text-xs md:text-sm text-gray-700 list-decimal list-inside pl-1">
                <li>
                  Download and install <strong>Shepherd&apos;s Desk Phone Bridge</strong> on your Android phone.
                </li>
                <li>
                  Open the app. You will see a welcome screen explaining that messages will send from your carrier phone number.
                </li>
                <li>
                  Tap <strong>Continue</strong> and grant standard SMS and Notification permissions when prompted.
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
                <h4 className="font-bold text-[#022d5c] text-sm md:text-base">Pair Your Phone</h4>
              </div>
              <ol className="space-y-2.5 text-xs md:text-sm text-gray-700 list-decimal list-inside pl-1">
                <li>
                  On your computer or tablet, go to{' '}
                  <Link href="/settings" className="text-[#022d5c] font-semibold underline">
                    Settings
                  </Link>{' '}
                  and locate the <strong>Phone Bridge</strong> card.
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
        </div>

        {/* Part 2: Live Calendar Auto-Sync (Google & Apple) */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
            <Calendar className="w-4 h-4 text-[#D0A348]" />
            <h3 className="font-bold text-[#022d5c] text-base">Part B: Live Calendar Auto-Sync (Google &amp; Apple)</h3>
          </div>

          <p className="text-gray-700 text-xs md:text-sm leading-relaxed">
            Connecting your live calendar automatically feeds your church gatherings, services, and ministry outings directly into your weekly Sunday announcements, while automatically shielding private counseling notes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Calendar Instructions */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs font-bold">
                  G
                </span>
                <h4 className="font-bold text-[#022d5c] text-sm md:text-base">Google Calendar (Secret iCal Link)</h4>
              </div>
              <ol className="space-y-2.5 text-xs text-gray-700 list-decimal list-inside pl-1">
                <li>
                  In Google Calendar on your computer, click the <strong>Gear icon &gt; Settings</strong>.
                </li>
                <li>
                  In the left sidebar, look down under <strong>&quot;Settings for my calendars&quot;</strong> and click your calendar name.
                </li>
                <li>
                  Click <strong>&quot;Integrate calendar&quot;</strong> in the left submenu (or scroll down to that section).
                </li>
                <li>
                  Find <strong>&quot;Secret address in iCal format&quot;</strong> and click the <strong>Copy button</strong> (the two overlapping squares next to the eye icon).
                </li>
              </ol>
              <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                <strong>Important:</strong> Do <em>not</em> copy the &quot;Public address in iCal format&quot;. Always copy the <strong>&quot;Secret address in iCal format&quot;</strong> so your schedule and appointments sync properly.
              </div>
            </div>

            {/* Apple iCloud Calendar Instructions */}
            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#022d5c] text-white flex items-center justify-center text-xs font-bold">
                  
                </span>
                <h4 className="font-bold text-[#022d5c] text-sm md:text-base">Apple Calendar / iCloud (webcal://)</h4>
              </div>
              <ol className="space-y-2.5 text-xs text-gray-700 list-decimal list-inside pl-1">
                <li>
                  Open the <strong>Calendar app</strong> on your Mac, iPad, or iPhone (or visit <em>icloud.com/calendar</em>).
                </li>
                <li>
                  Click or tap the <strong>share/info icon</strong> next to the calendar you want to sync.
                </li>
                <li>
                  Enable <strong>Public Calendar</strong> to generate a secure read-only feed link.
                </li>
                <li>
                  Tap <strong>Copy Link</strong> to copy the <em>webcal://</em> feed address to your clipboard.
                </li>
              </ol>
              <div className="text-xs text-blue-900 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <strong>Paste in The Shepherd&apos;s Desk:</strong> Go to <strong>Calendar &gt; Sync</strong>, paste your copied link, check <strong>&quot;Automatically sync when opening calendar&quot;</strong>, and click <strong>Sync Live Google &amp; Apple Feed</strong>.
              </div>
            </div>
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

      {/* Section 5: People & Pastoral Care */}
      <section id="people" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            5
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">People &amp; Pastoral Care (Shepherding the Flock)</h2>
            <p className="text-xs text-gray-500">Member profiles, hospital visit logs, prayer tracking, and care check-ins</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Ministry is about people, not paperwork. The People section serves as your private pastoral relationship manager, keeping your congregation organized and cared for with compassion.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Users className="w-4 h-4 text-[#D0A348]" />
              Member Profiles &amp; Families
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Store contact numbers, email, physical addresses, family relationships, birthdays, anniversaries, and key spiritual milestones like baptisms and dedications.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Heart className="w-4 h-4 text-[#D0A348]" />
              Hospital &amp; Bedside Care Logs
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Log hospital room visits, nursing home check-ins, and pastoral counseling sessions. Add private notes on scripture read and prayers offered so you always remember their journey.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Active Prayer List Tracker
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Maintain an active prayer list for ongoing medical and family needs. When God answers, mark them answered to celebrate God&apos;s faithfulness with your church.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Send className="w-4 h-4 text-[#022d5c]" />
              Direct 1:1 Care Messaging
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Tap the message icon beside any member to instantly send a personal, caring text through your carrier phone. Replies return directly to your phone for private conversation.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">⭐ Starred Members vs Community Contacts</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Clicking the gold star on a contact marks them as an active church member for Sunday announcements and group broadcasts. Contacts without a star remain respected community contacts (such as visiting ministers, vendors, or guests).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">🚫 &quot;Do Not Text&quot; Protection</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              If someone requests not to receive group SMS broadcasts, toggle on <strong>Do Not Text</strong> on their profile. The system will lock their number out of bulk broadcasts while still letting you make personal phone calls or pastoral visits.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/care">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to People &amp; Pastoral Care
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 6: Smart Pastoral Assistant */}
      <section id="smart-assistant" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            6
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Smart Pastoral Assistant</h2>
            <p className="text-xs text-gray-500">Voice-activated reminders, sermon drafting, and hands-free pastoral help</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Your Smart Pastoral Assistant is built to lighten the pastoral load. You can speak or type in plain language, and the assistant handles scheduling, sermon drafting, and care reminders without making you navigate deep menus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#78350F] text-sm">
              <Mic className="w-4 h-4 text-[#D97706]" />
              Natural Voice Commands
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Tap the microphone or assistant button and speak naturally:
            </p>
            <ul className="text-xs text-gray-800 space-y-1.5 pl-2 border-l-2 border-[#D0A348]">
              <li>&bull; <em>&quot;Remind me to visit Sister Mary at the hospital tomorrow at 2 PM&quot;</em></li>
              <li>&bull; <em>&quot;Add a new sermon titled Walking in Faith on Hebrews 11&quot;</em></li>
              <li>&bull; <em>&quot;Add Brother John to our prayer list for surgery on Friday&quot;</em></li>
              <li>&bull; <em>&quot;Draft a warm follow-up text checking on the Miller family&quot;</em></li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#78350F] text-sm">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              Sermon &amp; Service Study Help
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Within Sermon Studio, your assistant provides instant study support:
            </p>
            <ul className="text-xs text-gray-800 space-y-1.5 pl-2 border-l-2 border-[#D0A348]">
              <li>&bull; Brainstorm fresh sermon titles and three-point outlines</li>
              <li>&bull; Uncover historical illustrations and cultural context</li>
              <li>&bull; Generate Sunday announcements and church bulletin copy</li>
              <li>&bull; Create children&apos;s sermon lessons and discussion questions</li>
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Respects Your Pastoral Calling and Voice
          </div>
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
            The assistant never writes generic sermons or replaces the guidance of the Holy Spirit. It functions as an attentive pastoral researcher and scribe, helping you organize and express what God has already placed on your heart.
          </p>
        </div>
      </section>

      {/* Section 7: Sermon Studio & Pulpit Mode */}
      <section id="sermon-studio" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            7
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Sermon Studio &amp; Pulpit Mode</h2>
            <p className="text-xs text-gray-500">Prepare, research, outline, write, and preach your weekly messages</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Sermon Studio provides a peaceful, distraction-free environment to prepare what God has placed on your heart. It seamlessly links biblical research, voice dictation, an intelligent pastoral assistant, devotional generation, and high-contrast pulpit preaching.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#022d5c]" />
              1. Organizing &amp; Drafting
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Set your <strong>Sermon Title</strong>, <strong>Primary Scripture</strong> (e.g. <em>2 Chronicles 20:12-17</em>), Series Name, and Preach Date. Move each message through four status badges: <strong>Draft</strong>, <strong>Review</strong>, <strong>Ready</strong>, and <strong>Preached</strong>. Every keystroke auto-saves every 3 seconds.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#D0A348]" />
              2. Bible Lookup &amp; Study Tools
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Tap <strong>Bible</strong> to search across multiple translations (KJV, ASV, WEB, BBE, Darby, and YLT) and insert verses with one click. Tap <strong>Study</strong> to search the biblical concordance for original Greek and Hebrew meanings, or access Matthew Henry commentary.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#022d5c]/5 border border-[#022d5c]/10 space-y-3">
          <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D0A348]" />
            Sermon Assistant &amp; Devotional Generator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">✨ Sermon Assistant</span>
              <p className="text-xs text-gray-700 leading-relaxed">
                Automatically locks onto your sermon scripture. Brainstorms 5 titles, drafts a 3-point structured outline, discovers modern illustrations, suggests natural transitions, and finds cross-references with zero robotic dashes.
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">📅 Devotional Generator</span>
              <p className="text-xs text-gray-700 leading-relaxed">
                Transforms your sermon into a 5-day or 7-day devotional plan for your congregation or small group. Each day includes scripture, reflection, a practical question, and a prayer prompt.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
          <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#022d5c]" />
            Pulpit Mode (Live Preaching)
          </h3>
          <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
            Tap <strong>Pulpit Mode</strong> in the header for a distraction-free preaching view. Features high-contrast scalable text (A+ / A-), a built-in stopwatch or countdown timer, and a smooth teleprompter auto-scroll with adjustable speed controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/sermons">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Sermon Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 8: Sermon & Ministry Ideas Studio */}
      <section id="ideas" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            8
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Sermon &amp; Ministry Ideas Studio</h2>
            <p className="text-xs text-gray-500">Capture spontaneous thoughts, voice memos, and sermon sparks before they fade</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Pastors receive inspiration at all times: while driving, reading scripture, visiting members, or in personal prayer. The Ideas Studio gives you an instant capture inbox so meaningful thoughts are never lost.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Lightbulb className="w-4 h-4 text-[#D0A348]" />
              Quick Thought Capture
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Jot down a title idea, illustration, book quote, or scripture reference with a quick title and notes. Your ideas stay organized in a clean card view.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Mic className="w-4 h-4 text-[#D0A348]" />
              Audio Memos &amp; Automatic Transcription
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              On the road or between hospital visits? Tap the microphone button in the mobile app to record an audio note. The app automatically transcribes your voice into clean, searchable text.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <BookMarked className="w-4 h-4 text-[#022d5c]" />
              Topic Tagging &amp; Series Planning
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Tag your ideas by subject (such as Faith, Grace, Stewardship, or Family) or assign them to upcoming sermon series so your research is ready when you begin writing.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <ArrowRight className="w-4 h-4 text-emerald-600" />
              One-Tap &quot;Convert to Sermon&quot;
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              When an idea is ready to become Sunday&apos;s message, tap <strong>Convert to Sermon</strong>. It instantly opens Sermon Studio with your title, scripture, notes, and transcriptions pre-populated.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/ideas">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Ideas Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 9: Calendar & Church Events Setup */}
      <section id="calendar-setup" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            9
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Calendar &amp; Church Events Setup</h2>
            <p className="text-xs text-gray-500">Color-coded pastoral scheduling, Google/Apple iCal sync, and event management</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          The Shepherd&apos;s Desk Calendar keeps your pastoral schedule organized and connects church gatherings directly into your weekly Sunday announcements.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#022d5c]" />
              1. Pastoral Event Types
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Color-code your week: <strong>Sermon Study</strong> (Navy) for sermon preparation blocks, <strong>Church Service</strong> (Purple) for Sunday and mid-week services, <strong>Pastoral Visit</strong> (Green) for hospital calls, <strong>Ministry Meeting</strong> (Blue) for committees, and <strong>Personal</strong> (Gold) for family time.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#D0A348]" />
              2. Google &amp; Apple Calendar Sync
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Link your existing calendar using a secret iCal or webcal URL. In Google Calendar, go to <em>Settings &gt; Integrate calendar &gt; Secret address in iCal format</em>. In Apple Calendar, copy the public link. Paste it into the <strong>Sync</strong> dialog in The Shepherd&apos;s Desk to sync appointments automatically.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
          <h3 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Automatic Feeds into Sunday Announcements
          </h3>
          <p className="text-xs md:text-sm text-emerald-800 leading-relaxed">
            All your upcoming church outings, services, and meetings are automatically surfaced when you generate Sunday Announcements. Sensitive appointments (counseling, doctor visits, and personal lunches) are automatically excluded and protected by the Counseling Privacy Shield.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/calendar">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Calendar
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 10: Sunday Announcements Workflow */}
      <section id="sunday-announcements" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            10
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Sunday Announcements Workflow</h2>
            <p className="text-xs text-gray-500">Curate calendar events into spoken scripts and church bulletins</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          The Sunday Announcements workflow eliminates the stress of gathering weekly notices across ministries.
          It scans your church calendar, lets you add custom pastoral highlights, and automatically produces two tailored scripts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#022d5c]" />
              1. Scan Church Calendar
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Open <strong>Communication &gt; Sunday</strong> tab and tap <strong>New Sunday Announcements</strong>.
              Choose your service date and scan window (7, 14, or 30 days). The system automatically pulls upcoming gatherings and events.
            </p>
            <div className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium">
              🛡️ <strong>Counseling Privacy Shield:</strong> Doctor visits, private pastoral counseling, and personal lunch appointments are automatically excluded and unchecked.
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D0A348]" />
              2. Add Pastoral Notes &amp; Tone
            </h3>
            <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
              Type custom pastoral highlights (such as shut-in visits, benevolence offerings, or volunteer calls) and select your tone:
              <strong> Pastoral and Warm</strong>, <strong>Celebratory</strong>, or <strong>Clear and Concise</strong>.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#022d5c]/5 border border-[#022d5c]/10 space-y-3">
          <h3 className="font-bold text-[#022d5c] text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D0A348]" />
            Dual Script Generation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">🎙️ Pulpit Spoken Script</span>
              <p className="text-xs text-gray-700 leading-relaxed">
                Written for spoken delivery with natural stage cues (like <em>[PAUSE FOR WELCOME]</em> or <em>[WARM SMILE]</em>) and bold key dates for glance-reading while speaking.
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#022d5c]">📄 Church Bulletin / Slides</span>
              <p className="text-xs text-gray-700 leading-relaxed">
                A clean, concise summary with dates, times, and locations ready for printed bulletin handouts, projection slides, or weekly email newsletters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/announcements">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Sunday Announcements
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 11: Rich Resource Center & Counseling Directory */}
      <section id="resources" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            11
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Rich Resource Center &amp; Counseling Directory</h2>
            <p className="text-xs text-gray-500">Biblical counseling wisdom and local community benevolence referrals</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          When people turn to the church in distress, pastors need immediate access to spiritual wisdom and practical community aid. The Resource Center combines biblical counseling guides with a verified local community referral network.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <BookOpen className="w-4 h-4 text-[#D0A348]" />
              Biblical Counseling Guides
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Access curated scripture, pastoral talking points, and counsel notes for:
            </p>
            <ul className="text-xs text-gray-800 space-y-1 pl-2 border-l-2 border-[#D0A348]">
              <li>&bull; Grief and loss of a loved one</li>
              <li>&bull; Marital conflict and restoration</li>
              <li>&bull; Anxiety, fear, and depression</li>
              <li>&bull; Addictions, recovery, and spiritual crisis</li>
              <li>&bull; Parenting challenges and youth discipleship</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <HeartHandshake className="w-4 h-4 text-[#022d5c]" />
              Local Community Relief Directory
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Search by church ZIP code to find immediate relief agencies in your neighborhood:
            </p>
            <ul className="text-xs text-gray-800 space-y-1 pl-2 border-l-2 border-[#022d5c]">
              <li>&bull; Verified local food pantries and hot meals</li>
              <li>&bull; Emergency shelters and transitional housing</li>
              <li>&bull; Utility and rent assistance funds</li>
              <li>&bull; Free medical and dental clinics</li>
              <li>&bull; 24/7 crisis hotlines and specialized counseling</li>
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-2">
          <h3 className="font-bold text-[#022d5c] text-sm">📲 Sharing Resources Directly with Church Members</h3>
          <p className="text-xs text-gray-700 leading-relaxed">
            Every resource includes a one-click <strong>Share</strong> button. You can send contact details, phone numbers, and addresses directly to a church family in need via text message or email without copying and pasting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/resources">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Resource Center
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 12: Refer a Pastor & VIP Invitations */}
      <section id="referrals" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            12
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Refer a Pastor &amp; VIP Invitations</h2>
            <p className="text-xs text-gray-500">Bless fellow pastors, share your link, and track ministry referrals</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Pastoral ministry can be lonely, and fellow pastors often carry heavy burdens alone. You can introduce your pastor friends, colleagues, and association members to The Shepherd&apos;s Desk with pre-written personal notes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Share2 className="w-4 h-4 text-[#D0A348]" />
              Personal Referral Link
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Every pastor receives a unique invite link. Copy and share it via text, email, pastor text groups, or social media. Fellow pastors receive immediate full trial access with your personal recommendation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <MessageSquare className="w-4 h-4 text-[#022d5c]" />
              Pastor-to-Pastor Invitation Templates
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Choose from ready-to-send messages written specifically pastor-to-pastor. You can send directly from your phone through SMS or WhatsApp with your link already included.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Referral Dashboard &amp; Tracking
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Track when friends sign up. The dashboard shows pending invites, active joined pastors, and milestone celebrations as your pastor network grows.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#022d5c] text-sm">
              <Gift className="w-4 h-4 text-[#D0A348]" />
              Pastoral Gift Subscriptions
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">
              Want to bless a pastor or mentor? Gift a prepaid 6-month or 1-year subscription, complete with a personalized message and printable presentation certificate for Pastor Appreciation, Christmas, or ordinations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/referrals">
            <Button className="bg-[#022d5c] text-white hover:bg-[#022d5c]/90 text-xs font-semibold gap-1.5 cursor-pointer">
              Go to Refer a Pastor
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href="/gift">
            <Button variant="outline" className="text-[#022d5c] border-[#022d5c] text-xs font-semibold gap-1.5 cursor-pointer">
              <Gift className="w-3.5 h-3.5 text-[#D0A348]" />
              Gift a Pastor
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 13: Pulpit Printing & PDF Export */}
      <section id="pulpit-printing" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            13
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#022d5c]">Pulpit Printing &amp; PDF Export</h2>
            <p className="text-xs text-gray-500">Read comfortably from any pulpit, music stand, or binder</p>
          </div>
        </div>

        <p className="text-gray-700 text-sm md:text-base leading-relaxed">
          Both the web dashboard and mobile app feature a dedicated document print preview designed for clean reading in the pulpit.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">📖 Full Manuscript View</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Prints the complete text of your sermon with generous line spacing and clear margins for pastors who preach word-for-word.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">📝 Pulpit Outline View</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Automatically extracts main points, roman numerals, headings, and scripture references into an indented, high-contrast binder outline.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
            <h3 className="font-bold text-[#022d5c] text-sm">🔍 Pulpit 20pt Font Size</h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              Toggle between Standard (14pt), Large (16pt), and Pulpit (20pt) so you can glance down from chest height without leaning or reading glasses.
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs font-bold text-[#022d5c]">AirPrint &amp; PDF Sharing on Mobile</div>
            <p className="text-xs text-gray-600">
              In the mobile app, tap Print in any sermon or Sunday announcement to send directly to your wireless printer or export a clean PDF via AirDrop, Save to Files, or email.
            </p>
          </div>
          <Link href="/sermons">
            <Button variant="outline" className="text-[#022d5c] border-[#022d5c] text-xs font-semibold gap-1.5 shrink-0 cursor-pointer">
              Open Sermon Studio
            </Button>
          </Link>
        </div>
      </section>

      {/* Section 14: Frequently Asked Questions */}
      <section id="faq" className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#022d5c] text-white flex items-center justify-center font-bold text-lg">
            14
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

import Link from "next/link"
import Image from "next/image"
import { 
  BookOpen, 
  Book, 
  Camera, 
  CalendarDays, 
  Heart, 
  Monitor,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Gift
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function WelcomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-ivory text-charcoal selection:bg-gold/20 selection:text-navy">
      
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden py-20 lg:py-32" style={{ backgroundColor: '#022d5c' }}>
        {/* Subtle background decoration - only behind text, not logo */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <div className="mb-8">
            <Image 
              src="/the_shepherds_desk_logo_transparent.png" 
              alt="The Shepherd's Desk" 
              width={500} 
              height={150} 
              className="h-32 md:h-48 w-auto object-contain"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 max-w-4xl font-[family-name:var(--font-playfair)]">
            Your calling. Your voice. <span className="text-gold">God's Message.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray/80 max-w-2xl mb-10 font-light leading-relaxed">
            The all-in-one sermon preparation and ministry management platform built for Pastors, Preachers, Teachers, and Ministers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
            <Link href="/login" className="inline-flex items-center justify-center bg-gold hover:bg-gold/90 text-navy font-semibold text-base h-14 px-8 rounded-full shadow-lg shadow-gold/20">
              Start Free Trial <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
            <Link href="/gift" className="inline-flex items-center justify-center bg-white/15 hover:bg-white/25 border border-gold/60 text-white font-semibold text-base h-14 px-8 rounded-full transition-all">
              <Gift className="mr-2 h-5 w-5 text-gold" /> Gift a Pastor
            </Link>
            <a href="#features" className="inline-flex items-center justify-center border border-white/30 hover:bg-white/10 text-white font-semibold text-base h-14 px-8 rounded-full bg-transparent">
              See Features
            </a>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <div className="bg-charcoal text-white/70 py-6 border-b border-white/10 text-center px-6">
        <p className="text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-4">
          <span className="w-12 h-px bg-white/20 hidden sm:inline-block"></span>
          Everything you need to shepherd your flock
          <span className="w-12 h-px bg-white/20 hidden sm:inline-block"></span>
        </p>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] text-navy mb-4">Pastoral Tools for the Modern Church</h2>
          <p className="text-charcoal/70 max-w-2xl mx-auto">Thoughtfully designed features that help you focus more on people and less on paperwork.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: BookOpen,
              title: "Sermon Studio",
              description: "Write, organize, and polish your sermons with a beautiful distraction-free editor. AI-powered tools help you brainstorm, outline, and refine your message."
            },
            {
              icon: Book,
              title: "Bible at Your Fingertips",
              description: "Look up any verse in 6 translations, search Strong's Concordance, and access classic commentaries — all without leaving your sermon."
            },
            {
              icon: Camera,
              title: "Snap & Digitize",
              description: "Photograph handwritten notes, napkin scribbles, or book highlights. Our AI reads your handwriting and converts it to searchable digital text."
            },
            {
              icon: CalendarDays,
              title: "Ministry Calendar",
              description: "Color-coded scheduling for services, visits, meetings, and personal time. See your whole week at a glance."
            },
            {
              icon: Heart,
              title: "Pastoral Care Tracker",
              description: "Never let a follow-up slip through the cracks. Track hospital visits, phone calls, member care, and prayer needs."
            },
            {
              icon: Monitor,
              title: "Pulpit Mode",
              description: "Clean, distraction-free sermon display with built-in timer. Your notes, beautifully formatted for the pulpit."
            }
          ].map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-gray/50 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-navy/5 text-navy rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-gold" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-navy font-[family-name:var(--font-playfair)]">{feature.title}</h3>
              <p className="text-charcoal/80 leading-relaxed text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Section Highlight */}
      <section className="bg-gold py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 lg:p-16 shadow-xl flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 bg-gold/10 text-navy px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Sparkles className="h-4 w-4" /> Built-in Assistant
              </div>
              <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-playfair)] text-navy mb-6">AI That Respects Your Voice</h2>
              <p className="text-charcoal/80 mb-6 leading-relaxed text-lg">
                The Shepherd's Desk AI doesn't write your sermons - it helps you develop what God has already placed on your heart. Brainstorm titles, generate outlines, find illustrations, and polish your prose.
              </p>
              <p className="font-[family-name:var(--font-playfair)] text-xl text-navy italic">
                Your calling. Your voice. God's message.
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <div className="bg-gray/30 rounded-2xl p-6 border border-gray">
                <div className="flex gap-4 mb-4">
                  <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">You</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-sm">
                    Can you help me find a historical illustration about grace for my sermon on Ephesians 2?
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-navy" />
                  </div>
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm text-sm">
                    Consider the story of John Newton, the former slave ship captain who wrote "Amazing Grace." His life demonstrates how radically God's unmerited favor can transform a person...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-5xl text-center">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] text-navy mb-16">Three Steps to Better Ministry</h2>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-1/6 right-1/6 h-0.5 bg-gray border-t border-dashed border-gray"></div>
            
            {[
              { num: "1", title: "Sign Up", desc: "Takes 30 seconds. No credit card required for your free trial." },
              { num: "2", title: "Import or Start Fresh", desc: "Bring your existing notes or start with a clean slate in the Studio." },
              { num: "3", title: "Preach with Confidence", desc: "Everything organized, beautifully formatted, and always accessible." }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-navy text-white text-2xl font-bold flex items-center justify-center mb-6 shadow-lg shadow-navy/20 border-4 border-white">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3 text-navy font-[family-name:var(--font-playfair)]">{step.title}</h3>
                <p className="text-charcoal/70 text-sm max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 bg-ivory">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-navy rounded-3xl p-8 md:p-12 lg:p-16 text-white text-center shadow-2xl relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gold/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gold/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] mb-4">Simple, Transparent Pricing</h2>
              <p className="text-white/80 mb-10 max-w-lg mx-auto">Full pastoral access. 30-day free trial on all plans. No surprises.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10 text-left">
                {/* Annual Plan */}
                <div className="bg-white/15 rounded-2xl p-7 backdrop-blur-md border-2 border-gold relative shadow-xl">
                  <div className="absolute -top-3.5 right-6 bg-gold text-navy text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-md">
                    Best Value • Save $24/yr
                  </div>
                  <div className="text-sm font-semibold uppercase tracking-wider text-gold mb-1">Annual Plan</div>
                  <div className="text-4xl font-bold font-[family-name:var(--font-playfair)] text-white mb-1">
                    $12.99<span className="text-sm font-normal text-white/70"> / month</span>
                  </div>
                  <p className="text-xs text-white/70 mb-5">$155.88 billed annually after 30-day free trial</p>

                  <ul className="space-y-3 mb-6 text-sm text-white/90">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Full 30-day free trial</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Unlimited sermons &amp; Pulpit mode</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Smart Voice Pastoral Reminders</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Hospital visits &amp; pastoral care tracker</li>
                  </ul>

                  <Link href="/login" className="inline-flex items-center justify-center w-full bg-gold hover:bg-gold/90 text-navy font-bold h-12 rounded-xl text-sm transition-all shadow-md">
                    Start 30-Day Free Trial
                  </Link>
                </div>

                {/* Monthly Plan */}
                <div className="bg-white/10 rounded-2xl p-7 backdrop-blur-sm border border-white/20">
                  <div className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-1">Monthly Plan</div>
                  <div className="text-4xl font-bold font-[family-name:var(--font-playfair)] text-white mb-1">
                    $14.99<span className="text-sm font-normal text-white/70"> / month</span>
                  </div>
                  <p className="text-xs text-white/70 mb-5">Billed monthly after 30-day free trial</p>

                  <ul className="space-y-3 mb-6 text-sm text-white/90">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Full 30-day free trial</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Unlimited sermons &amp; Pulpit mode</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Smart Voice Pastoral Reminders</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-gold flex-shrink-0" /> Flexible month-to-month, cancel anytime</li>
                  </ul>

                  <Link href="/login" className="inline-flex items-center justify-center w-full bg-white/20 hover:bg-white/30 text-white font-bold h-12 rounded-xl text-sm transition-all">
                    Start 30-Day Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bless Your Pastor Section (Pastor Appreciation & Christmas) */}
      <section className="py-16 px-6 bg-[#FAF7F0] border-y border-[#D0A348]/40">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-[#D0A348]/30 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 bg-[#D0A348]/20 text-[#022d5c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                <Gift className="w-3.5 h-3.5 text-[#D0A348]" /> Pastor Appreciation &bull; Christmas &bull; Ordinations
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-playfair)] text-[#022d5c]">
                Looking for a Meaningful Gift for Your Pastor?
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Give your pastor something they will actually use every single week. Gift a prepaid 6-month or 1-year subscription—complete with a personalized note and high-resolution printable certificate.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto">
              <Link
                href="/gift"
                className="inline-flex items-center justify-center gap-2 bg-[#022d5c] hover:bg-[#033b78] text-white font-bold px-7 py-4 rounded-xl text-sm shadow-md border border-[#D0A348] transition-all text-center"
              >
                <Gift className="w-4 h-4 text-[#D0A348]" /> Gift The Shepherd's Desk &rarr;
              </Link>
              <Link
                href="/gift/redeem"
                className="inline-flex items-center justify-center text-xs font-semibold text-gray-500 hover:text-[#022d5c] transition-colors py-1 text-center"
              >
                Have a gift code? Redeem here
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial/Quote */}
      <section className="py-24 px-6 bg-white border-y border-gray text-center">
        <div className="container mx-auto max-w-3xl">
          <p className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] text-navy leading-tight mb-8">
            "Feed my sheep."
          </p>
          <div className="w-16 h-1 bg-gold mx-auto mb-6"></div>
          <p className="text-charcoal/60 uppercase tracking-widest font-semibold text-sm">
            — John 21:17
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-navy text-center text-white relative overflow-hidden">
        <div className="container mx-auto max-w-3xl relative z-10">
          <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] mb-6">Ready to focus on what matters most?</h2>
          <p className="text-white/80 text-lg md:text-xl mb-10">
            Join pastors who are spending less time on admin and more time in ministry.
          </p>
          <Link href="/login" className="inline-flex items-center justify-center bg-gold hover:bg-gold/90 text-navy font-semibold text-base h-14 px-10 rounded-full shadow-lg shadow-gold/20">
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div className="flex items-center gap-3">
              <Image 
                src="/the_shepherds_desk_logo_transparent.png" 
                alt="The Shepherd's Desk" 
                width={190} 
                height={55} 
                className="h-11 w-auto object-contain rounded"
              />
            </div>
            
            <nav className="flex flex-wrap gap-6 text-sm text-white/60">
              <a href="#features" className="hover:text-gold transition-colors">Features</a>
              <a href="#" className="hover:text-gold transition-colors">Pricing</a>
              <Link href="/gift" className="hover:text-gold transition-colors font-medium text-gold/90">Gift a Pastor</Link>
              <Link href="/download" className="hover:text-gold transition-colors">Download App</Link>
              <Link href="/login" className="hover:text-gold transition-colors">Login</Link>
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
              <a href="#" className="hover:text-gold transition-colors">Contact</a>
            </nav>
          </div>

          {/* Powered by Tiny Tech */}
          <div className="flex flex-col items-center justify-center py-6 border-t border-white/10">
            <a 
              href="https://tinytechcompany.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex flex-col items-center justify-center gap-2 group opacity-80 hover:opacity-100 transition-all"
            >
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-semibold group-hover:text-gold transition-colors">Powered by</span>
              <Image 
                src="/tiny-tech-logo.png" 
                alt="Tiny Tech" 
                width={160} 
                height={40} 
                className="h-8 w-auto object-contain transition-transform group-hover:scale-105" 
              />
            </a>
          </div>
          
          <div className="text-center md:text-left text-white/40 text-sm border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} The Shepherd's Desk. Built with love for those who shepherd God's people.</p>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                {/* Social placeholder */}
                <span className="text-xs">X</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                <span className="text-xs">IG</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

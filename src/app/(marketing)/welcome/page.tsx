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
  ChevronRight
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
              src="/logo-dark.png" 
              alt="The Shepherd's Desk" 
              width={500} 
              height={150} 
              className="h-40 md:h-56 w-auto object-contain rounded-lg"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 max-w-4xl font-[family-name:var(--font-playfair)]">
            Your calling. Your voice. <span className="text-gold">God's Message.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray/80 max-w-2xl mb-10 font-light leading-relaxed">
            The all-in-one sermon preparation and ministry management platform built for Pastors, Preachers, Teachers, and Ministers.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button asChild size="lg" className="bg-gold hover:bg-gold/90 text-navy font-semibold text-base h-14 px-8 rounded-full shadow-lg shadow-gold/20">
              <Link href="/login">Start Free Trial <ChevronRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 hover:bg-white/10 text-white font-semibold text-base h-14 px-8 rounded-full bg-transparent">
              <a href="#features">See Features</a>
            </Button>
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
              <h2 className="text-3xl md:text-5xl font-[family-name:var(--font-playfair)] mb-6">Simple, Transparent Pricing</h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto">No tiers. No upsells. No surprises.</p>
              
              <div className="inline-block bg-white/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20 mb-10 w-full max-w-md mx-auto">
                <div className="text-5xl font-bold font-[family-name:var(--font-playfair)] text-gold mb-2">
                  $15<span className="text-lg font-normal text-white/70">/month</span>
                </div>
                <div className="text-sm text-white/70 mb-8">Everything Included</div>
                
                <ul className="text-left space-y-4 mb-8">
                  {[
                    "Unlimited sermons & series",
                    "AI assistant (brainstorm & polish)",
                    "Bible tools & 6 translations",
                    "Ministry calendar & events",
                    "Pastoral care tracker",
                    "Handwriting OCR (Snap & Digitize)",
                    "Distraction-free Pulpit mode",
                    "Study resources & commentaries"
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-gold flex-shrink-0" />
                      <span className="text-white/90 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button asChild size="lg" className="w-full bg-gold hover:bg-gold/90 text-navy font-bold h-14 rounded-xl">
                  <Link href="/login">Start Your Free Trial</Link>
                </Button>
              </div>
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
          <Button asChild size="lg" className="bg-gold hover:bg-gold/90 text-navy font-semibold text-base h-14 px-10 rounded-full shadow-lg shadow-gold/20">
            <Link href="/login">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-charcoal text-white py-12 px-6 border-t border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Shepherd's Desk Logo" 
                width={120} 
                height={32} 
                className="h-8 w-auto object-contain brightness-0 invert opacity-80"
              />
              <span className="font-[family-name:var(--font-playfair)] font-bold text-xl text-white/90">The Shepherd's Desk</span>
            </div>
            
            <nav className="flex gap-6 text-sm text-white/60">
              <a href="#features" className="hover:text-gold transition-colors">Features</a>
              <a href="#" className="hover:text-gold transition-colors">Pricing</a>
              <Link href="/login" className="hover:text-gold transition-colors">Login</Link>
              <a href="#" className="hover:text-gold transition-colors">Contact</a>
            </nav>
          </div>
          
          <div className="text-center md:text-left text-white/40 text-sm border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
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

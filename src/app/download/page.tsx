import Link from 'next/link'
import {
  BookOpen,
  Calendar,
  Heart,
  Lightbulb,
  Library,
  Megaphone,
  FileText,
  Share2,
  ClipboardList,
} from 'lucide-react'

function GooglePlayLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.609 1.814L13.792 12 3.61 22.186a1.76 1.76 0 0 1-.61-1.34V3.154c0-.528.234-1.012.609-1.34Z"
        fill="#4285F4"
      />
      <path
        d="M17.208 8.584L13.792 12l3.416 3.416 3.854-2.193c.884-.503.884-1.943 0-2.446l-3.854-2.193Z"
        fill="#FBBC04"
      />
      <path
        d="M3.609 22.186L13.792 12l3.416 3.416-11.83 6.732a1.78 1.78 0 0 1-1.769.038Z"
        fill="#EA4335"
      />
      <path
        d="M3.609 1.814a1.78 1.78 0 0 1 1.769.038l11.83 6.732L13.792 12 3.609 1.814Z"
        fill="#34A853"
      />
    </svg>
  )
}

function AppleLogo({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  )
}

const FEATURES = [
  { label: 'Sermon Prep', Icon: BookOpen },
  { label: 'Calendar', Icon: Calendar },
  { label: 'Ministry Care', Icon: Heart },
  { label: 'Ideas', Icon: Lightbulb },
  { label: 'Study Tools', Icon: Library },
  { label: 'Announcements', Icon: Megaphone },
  { label: 'Resources', Icon: FileText },
  { label: 'Referrals', Icon: Share2 },
]

export default function DownloadPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #022d5c 0%, #011c3a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      
      {/* Logo */}
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <img 
          src="/the_shepherds_desk_logo_transparent.png" 
          alt="The Shepherd's Desk - From Monday's ministry to Sunday's message." 
          style={{ height: 110, width: 'auto', objectFit: 'contain', margin: '0 auto' }}
        />
      </div>

      {/* Download Cards */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 800 }}>
        
        {/* Android Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.08)', 
          backdropFilter: 'blur(20px)',
          borderRadius: 24, 
          padding: '40px 32px', 
          width: 340, 
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.16)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}>
              <GooglePlayLogo size={40} />
            </div>
            <h2 style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 8 }}>Google Play Store</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Get The Shepherd&apos;s Desk for Android phones and tablets directly from Google Play.
            </p>
          </div>
          <div>
            <a 
              href="https://play.google.com/store/apps/details?id=com.theshepherdsdesk.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: 'linear-gradient(135deg, #00875A, #006644)', 
                color: '#FFFFFF', 
                padding: '14px 28px', 
                borderRadius: 12, 
                fontSize: 16, 
                fontWeight: 600, 
                textDecoration: 'none',
                transition: 'transform 0.2s',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 14px rgba(0, 135, 90, 0.4)'
              }}
            >
              <GooglePlayLogo size={20} /> Get it on Google Play
            </a>
            <div style={{ marginTop: 14 }}>
              <a 
                href="/shepherds-desk-v2.1.9.apk"
                download="shepherds-desk-v2.1.9.apk"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textDecoration: 'underline' }}
              >
                Direct APK download for offline devices
              </a>
            </div>
          </div>
        </div>

        {/* iOS Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.08)', 
          backdropFilter: 'blur(20px)',
          borderRadius: 24, 
          padding: '40px 32px', 
          width: 340, 
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.16)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
            }}>
              <AppleLogo size={42} color="#FFFFFF" />
            </div>
            <h2 style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 8 }}>Apple App Store</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Download The Shepherd&apos;s Desk for iPhone and iPad directly from the official App Store.
            </p>
          </div>
          <div>
            <a 
              href="https://apps.apple.com/app/id6808595831"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: '#0070c9',
                backgroundImage: 'linear-gradient(135deg, #0071e3 0%, #005bb5 100%)',
                color: '#FFFFFF', 
                padding: '14px 28px', 
                borderRadius: 12, 
                fontSize: 16, 
                fontWeight: 600, 
                textDecoration: 'none',
                transition: 'transform 0.2s',
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 4px 14px rgba(0, 113, 227, 0.4)'
              }}
            >
              <AppleLogo size={20} color="#FFFFFF" /> Download on App Store
            </a>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 14 }}>
              Official Apple App Store Release
            </p>
          </div>
        </div>
      </div>

      {/* Install Instructions */}
      <div style={{ 
        marginTop: 48, 
        background: 'rgba(255,255,255,0.06)', 
        borderRadius: 16, 
        padding: '24px 32px', 
        maxWidth: 600,
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h3 style={{ color: '#D0A348', fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={18} /> Android Install Instructions
        </h3>
        <ol style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 2, paddingLeft: 20, margin: 0 }}>
          <li>Tap &quot;Download for Android&quot; on your phone</li>
          <li>Tap the downloaded APK file to install</li>
          <li>If prompted, tap &quot;Settings&quot; → enable &quot;Install from this source&quot;</li>
          <li>Open the app and sign in with your account</li>
        </ol>
      </div>

      {/* Features */}
      <div style={{ marginTop: 48, textAlign: 'center', maxWidth: 600 }}>
        <h3 style={{ color: '#FFFFFF', fontSize: 18, marginBottom: 20 }}>Everything you need, in your pocket</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {FEATURES.map(({ label, Icon }) => (
            <span key={label} style={{ 
              background: 'rgba(208,163,72,0.15)', 
              color: '#D0A348', 
              padding: '8px 16px', 
              borderRadius: 20, 
              fontSize: 13,
              border: '1px solid rgba(208,163,72,0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <Icon size={14} /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Powered by Tiny Tech */}
      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <a 
          href="https://tinytechcompany.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none', opacity: 0.85 }}
        >
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>POWERED BY</span>
          <img 
            src="/tiny-tech-logo.png" 
            alt="Tiny Tech" 
            style={{ height: 32, width: 'auto', maxWidth: 160, objectFit: 'contain' }} 
          />
        </a>
      </div>

      {/* Back to website */}
      <div style={{ marginTop: 24 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>
          ← Back to website
        </Link>
      </div>
    </div>
  )
}

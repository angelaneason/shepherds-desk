import Link from 'next/link'

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
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 8 }}>Android</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Download the APK directly to your Android device. No Play Store needed.
          </p>
          <a 
            href="/shepherds-desk-v2.1.8.apk"
            download="shepherds-desk-v2.1.8.apk"
            style={{ 
              display: 'inline-block',
              background: 'linear-gradient(135deg, #D0A348, #b8892e)', 
              color: '#FFFFFF', 
              padding: '14px 32px', 
              borderRadius: 12, 
              fontSize: 16, 
              fontWeight: 600, 
              textDecoration: 'none',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
          >
            ⬇️ Download for Android
          </a>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>
            v2.1.8 (Build 18) • APK • Reviewer Login Sanitization, Dismissible Reminders & Referrals
          </p>
        </div>

        {/* iOS Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.08)', 
          backdropFilter: 'blur(20px)',
          borderRadius: 24, 
          padding: '40px 32px', 
          width: 340, 
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍎</div>
          <h2 style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 8 }}>iPhone & iPad</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Download The Shepherd&apos;s Desk directly from the official Apple App Store.
          </p>
          <a 
            href="https://apps.apple.com/app/id6808595831"
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-block',
              background: '#0070c9',
              backgroundImage: 'linear-gradient(135deg, #0071e3 0%, #005bb5 100%)',
              color: '#FFFFFF', 
              padding: '14px 32px', 
              borderRadius: 12, 
              fontSize: 16, 
              fontWeight: 600, 
              textDecoration: 'none',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
          >
             Download on App Store
          </a>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>
            v2.1.5 • Official Apple App Store Release
          </p>
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
        <h3 style={{ color: '#D0A348', fontSize: 16, marginBottom: 12 }}>📋 Android Install Instructions</h3>
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
          {['📖 Sermon Prep', '📅 Calendar', '❤️ Ministry Care', '💡 Ideas', '📚 Study Tools', '📢 Announcements', '📋 Resources', '🔗 Referrals'].map(feature => (
            <span key={feature} style={{ 
              background: 'rgba(208,163,72,0.15)', 
              color: '#D0A348', 
              padding: '8px 16px', 
              borderRadius: 20, 
              fontSize: 13,
              border: '1px solid rgba(208,163,72,0.2)'
            }}>
              {feature}
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

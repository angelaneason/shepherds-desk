import Link from 'next/link'

export default function DownloadPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #022d5c 0%, #011c3a 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      
      {/* Logo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #D0A348, #b8892e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
          📖
        </div>
      </div>

      <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 42, color: '#FFFFFF', marginBottom: 8, textAlign: 'center' }}>
        The Shepherd&apos;s Desk
      </h1>
      <p style={{ color: '#D0A348', fontSize: 18, marginBottom: 48, textAlign: 'center', fontStyle: 'italic' }}>
        From Monday&apos;s ministry to Sunday&apos;s message.
      </p>

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
            href="https://expo.dev/accounts/tiny-tech/projects/shepherds-desk/builds/f1dd2a0c-bf51-41ae-951b-acf809ff74bf"
            target="_blank"
            rel="noopener noreferrer"
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
            v1.0.0 • APK • ~25 MB
          </p>
        </div>

        {/* iOS Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.04)', 
          borderRadius: 24, 
          padding: '40px 32px', 
          width: 340, 
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
          opacity: 0.7
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍎</div>
          <h2 style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 8 }}>iOS</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Coming soon to the Apple App Store. Join the waitlist to be notified.
          </p>
          <div style={{ 
            display: 'inline-block',
            background: 'rgba(255,255,255,0.1)', 
            color: 'rgba(255,255,255,0.5)', 
            padding: '14px 32px', 
            borderRadius: 12, 
            fontSize: 16, 
            fontWeight: 600,
            cursor: 'default'
          }}>
            🔜 Coming Soon
          </div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 16 }}>
            Estimated Q4 2026
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

      {/* Back to website */}
      <div style={{ marginTop: 48 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textDecoration: 'none' }}>
          ← Back to website
        </Link>
      </div>
    </div>
  )
}

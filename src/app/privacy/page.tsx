export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 36, color: '#022d5c', marginBottom: 8 }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            Last updated: September 3, 2026
          </p>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '40px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', lineHeight: 1.8, color: '#374151', fontSize: 15 }}>
          
          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 0 }}>1. Introduction</h2>
          <p>
            The Shepherd&apos;s Desk (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is a productivity application designed for pastors and ministry leaders. 
            This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our mobile 
            application and web application at theshepherdsdesk.app (collectively, the &quot;Service&quot;).
          </p>
          <p>
            By using the Service, you agree to the collection and use of information in accordance with this policy.
          </p>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>2. Information We Collect</h2>
          <h3 style={{ color: '#374151', fontSize: 17, marginBottom: 8 }}>Account Information</h3>
          <ul style={{ paddingLeft: 24 }}>
            <li>Email address (required for account creation)</li>
            <li>Full name (optional, for personalization)</li>
            <li>Password (encrypted, never stored in plain text)</li>
          </ul>

          <h3 style={{ color: '#374151', fontSize: 17, marginBottom: 8 }}>Content You Create</h3>
          <ul style={{ paddingLeft: 24 }}>
            <li>Sermons and sermon notes</li>
            <li>Calendar events and study schedules</li>
            <li>Pastoral care tasks and notes</li>
            <li>Ideas and quick captures</li>
            <li>Announcements</li>
            <li>Counseling and community resource entries</li>
          </ul>

          <h3 style={{ color: '#374151', fontSize: 17, marginBottom: 8 }}>Usage Information</h3>
          <ul style={{ paddingLeft: 24 }}>
            <li>Study time tracking (hours spent in study sessions)</li>
            <li>Feature usage patterns (to improve the app)</li>
          </ul>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>3. How We Use Your Information</h2>
          <ul style={{ paddingLeft: 24 }}>
            <li>To provide and maintain the Service</li>
            <li>To personalize your experience (greetings, study goals)</li>
            <li>To sync your data between mobile and web applications</li>
            <li>To power AI-assisted features (study tools, devotional generation)</li>
            <li>To send you notifications about your ministry tasks (if enabled)</li>
            <li>To improve and develop new features</li>
          </ul>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>4. AI-Powered Features</h2>
          <p>
            Our Service uses Google Gemini AI to power study tools, devotional generation, and other assistive features. 
            When you use these features, relevant content (such as sermon titles and notes) is sent to Google&apos;s API 
            for processing. We do not use your content to train AI models. Google&apos;s use of this data is governed by 
            their own privacy policy.
          </p>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>5. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Supabase, a cloud database platform with enterprise-grade security. 
            All data is encrypted in transit (TLS/SSL) and at rest. Authentication tokens are stored securely on 
            your device using encrypted storage.
          </p>
          <p>
            While we implement commercially reasonable security measures, no method of electronic storage is 100% secure. 
            We cannot guarantee absolute security of your data.
          </p>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>6. Data Sharing</h2>
          <p style={{ fontWeight: 600 }}>
            We do NOT sell, trade, or rent your personal information to third parties.
          </p>
          <p>We may share your information only in these limited circumstances:</p>
          <ul style={{ paddingLeft: 24 }}>
            <li><strong>Service providers:</strong> Supabase (database hosting), Google (AI features), Vercel (web hosting)</li>
            <li><strong>Legal requirements:</strong> If required by law, regulation, or legal process</li>
            <li><strong>Safety:</strong> To protect the rights, safety, or property of our users</li>
          </ul>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul style={{ paddingLeft: 24 }}>
            <li><strong>Access</strong> your personal data at any time through the app</li>
            <li><strong>Update</strong> your profile information in Settings</li>
            <li><strong>Export</strong> your sermon content by copying it</li>
            <li><strong>Delete</strong> your account and all associated data by contacting us</li>
          </ul>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for use by anyone under the age of 18. We do not knowingly collect 
            personal information from children. If you become aware that a child has provided us with personal 
            information, please contact us.
          </p>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
            new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2 style={{ color: '#022d5c', fontSize: 22, marginBottom: 16, marginTop: 32 }}>10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data rights, 
            please contact us at:
          </p>
          <p style={{ background: '#F8F5EE', padding: '16px 20px', borderRadius: 8, marginTop: 8 }}>
            <strong>The Shepherd&apos;s Desk</strong><br />
            Email: support@theshepherdsdesk.app<br />
            Website: https://www.theshepherdsdesk.app
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/" style={{ color: '#6B7280', fontSize: 14, textDecoration: 'none' }}>
            ← Back to The Shepherd&apos;s Desk
          </a>
        </div>
      </div>
    </div>
  )
}

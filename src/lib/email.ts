// Resend Email Utility for The Shepherd's Desk

interface SendReferralEmailParams {
  to: string
  pastorName?: string
  referrerName: string
  referralCode: string
  personalNote?: string
}

export async function sendReferralInvitationEmail({
  to,
  pastorName,
  referrerName,
  referralCode,
  personalNote
}: SendReferralEmailParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY is not set. Skipping email dispatch.')
    return { success: false, error: 'RESEND_API_KEY missing' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theshepherdsdesk.app'
  const inviteUrl = `${appUrl}/login?ref=${encodeURIComponent(referralCode)}`
  const fromEmail = process.env.RESEND_FROM_EMAIL || "The Shepherd's Desk <onboarding@resend.dev>"

  const recipientGreeting = pastorName?.trim() ? `Pastor ${pastorName.trim()}` : 'Pastor'
  const subject = `${referrerName} invited you to try The Shepherd's Desk`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F5EE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F5EE; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #022d5c; padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; color: #ffffff; font-weight: 700; letter-spacing: 0.5px;">
                The Shepherd's Desk
              </h1>
              <p style="margin: 8px 0 0 0; color: #D0A348; font-size: 14px; font-style: italic; letter-spacing: 0.3px;">
                From Monday's ministry to Sunday's message
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 18px; font-weight: 600; color: #022d5c; margin-top: 0; margin-bottom: 16px;">
                Dear ${recipientGreeting},
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 16px;">
                <strong>${referrerName}</strong> thought you would appreciate a modern tool designed specifically for pastors and ministry leaders.
              </p>

              ${personalNote?.trim() ? `
              <!-- Personal Note Callout -->
              <div style="background-color: #F8F5EE; border-left: 4px solid #D0A348; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; font-style: italic; color: #4B5563;">
                  "${personalNote.trim()}"
                </p>
                <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; color: #022d5c;">
                  — ${referrerName}
                </p>
              </div>
              ` : ''}

              <p style="font-size: 15px; line-height: 1.6; color: #4B5563; margin-bottom: 24px;">
                Most church software is built for church secretaries and financial accountants. <strong>The Shepherd's Desk</strong> is built for the pastor's personal workflow, helping you balance hospital visits, crisis care, and weekly sermon preparation without burning out.
              </p>

              <!-- Feature Highlights Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAFAFA; border-radius: 10px; border: 1px solid #EEEEEE; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #1F2937;">
                          <strong style="color: #022d5c;">⚡ Smart Pastoral Reminders (Voice & Text):</strong> Just speak or type naturally—like <em>"Visit Sister Johnson at Mercy Hospital Thursday at 2 PM"</em>—and Shepherd's Desk automatically schedules it, links the church member, and logs your follow-up.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #1F2937;">
                          <strong style="color: #022d5c;">📖 Sermon Studio & Reference Library:</strong> 200+ curated sermon illustrations, biblical cross-references & commentaries.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #1F2937;">
                          <strong style="color: #022d5c;">🕊️ Pastoral Ministry Care:</strong> Hospital visits, 1-tap calling/texting, member directory & prayer request tracking.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #1F2937;">
                          <strong style="color: #022d5c;">⏱️ Sacred Study Time:</strong> Protect your preparation schedule with focus timers and conflict detection.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #1F2937;">
                          <strong style="color: #022d5c;">🎙️ Distraction-Free Pulpit Mode:</strong> Clean, high-contrast digital sermon reader with preaching clock.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #022d5c; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; border: 2px solid #D0A348; box-shadow: 0 4px 6px rgba(2,45,92,0.2);">
                  Accept Invitation & Try It Free &rarr;
                </a>
              </div>

              <p style="font-size: 12px; text-align: center; color: #9CA3AF; margin-top: 16px;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #022d5c; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8F5EE; padding: 24px 32px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6B7280; font-weight: 600;">
                Powered by
              </p>
              <a href="https://tinytechcompany.com" target="_blank" style="text-decoration: none; font-weight: 700; color: #D0A348; font-size: 13px;">
                TT TINY TECH
              </a>
              <p style="margin: 12px 0 0 0; font-size: 11px; color: #9CA3AF;">
                You received this invitation because ${referrerName} thought you'd love The Shepherd's Desk.<br>
                &copy; ${new Date().getFullYear()} The Shepherd's Desk. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html
      })
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Resend API error:', data)
      return { success: false, error: data.message || 'Failed to send email via Resend' }
    }

    return { success: true, id: data.id }
  } catch (err: any) {
    console.error('Error dispatching email via Resend:', err)
    return { success: false, error: err.message || 'Network error' }
  }
}
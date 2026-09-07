// Resend Email Utility for The Shepherd's Desk

interface SendReferralEmailParams {
  to: string
  pastorName?: string
  referrerName: string
  referralCode: string
  personalNote?: string
}

interface SendPastorsWifeParams {
  to: string
  pastorName?: string
  referrerName?: string
  referralCode: string
  customNote?: string
  senderName?: string
  senderRole?: 'pastor' | 'pastors_wife'
}

interface SendVipInviteParams {
  to: string
  pastorName?: string
  customNote?: string
  referralCode: string
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
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Angie & Pastor Tiny <invites@theshepherdsdesk.app>"

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
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;" cellspacing="0" cellpadding="0">
          
          <tr>
            <td style="background-color: #011830; padding: 28px 24px; text-align: center; border-bottom: 3px solid #D0A348;">
              <a href="${appUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${appUrl}/shepherds-desk-banner-logo.png" alt="The Shepherd's Desk - From Monday's ministry to Sunday's message." width="360" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 18px; font-weight: 600; color: #022d5c; margin-top: 0; margin-bottom: 16px;">
                Dear ${recipientGreeting},
              </p>

              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-bottom: 16px;">
                <strong>${referrerName}</strong> thought you would appreciate a modern tool designed specifically for pastors and ministry leaders.
              </p>

              ${personalNote?.trim() ? `
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

// -------------------------------------------------------------
// Follow-Up Email from Angie (Founder, Tiny Tech & Pastor's Wife)
// -------------------------------------------------------------
export async function sendPastorsWifeFollowUpEmail({
  to,
  pastorName,
  referrerName,
  referralCode,
  customNote,
  senderName,
  senderRole = 'pastors_wife'
}: SendPastorsWifeParams) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: 'RESEND_API_KEY missing' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theshepherdsdesk.app'
  const inviteUrl = `${appUrl}/login?ref=${encodeURIComponent(referralCode)}`
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Angie & Pastor Tiny <invites@theshepherdsdesk.app>"

  const recipientGreeting = pastorName?.trim() ? `Pastor ${pastorName.trim()}` : 'Pastor'
  const isPastorSender = senderRole === 'pastor' || senderName?.toLowerCase().includes('tiny')

  const subject = isPastorSender
    ? `${recipientGreeting}, a personal VIP invitation from Pastor Tiny`
    : `${recipientGreeting}, a quick personal note from a pastor's wife`

  const signatoryName = isPastorSender ? (senderName || 'Pastor Tiny Neason') : (senderName || 'Angie')
  const signatoryTitle = isPastorSender ? 'Pastor & Co-Founder, The Shepherd\'s Desk' : 'Founder, Tiny Tech & Pastor\'s Wife'

  const openingStory = isPastorSender
    ? `
      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 16px;">
        ${referrerName ? `A few days ago, <strong>${referrerName}</strong> recommended The Shepherd's Desk to you. ` : ''}I wanted to reach out to you personally brother to brother and pastor to pastor.
      </p>

      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 16px;">
        <strong>As a pastor</strong>, I know firsthand the immense weight and responsibility we carry every single week. Between crisis visits, hospital calls, counseling, and church administration, finding dedicated, uninterrupted time to study and prepare a life-giving Sunday message can feel almost impossible.
      </p>

      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 18px;">
        My wife Angie and our team at Tiny Tech built <strong>The Shepherd's Desk</strong> specifically to help pastors protect their sacred study time, stay on top of care visits, and step into the pulpit fully prepared without burning out.
      </p>
    `
    : `
      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 16px;">
        ${referrerName ? `A few days ago, <strong>${referrerName}</strong> invited you to check out The Shepherd's Desk. ` : ''}I wanted to reach out to you personally.
      </p>

      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 16px;">
        <strong>As a pastor's wife</strong>, I have watched firsthand the immense weight that pastors carry every single day. I've seen the late-night phone calls, the emergency visits to hospital waiting rooms, the emotional exhaustion of crisis counseling, and the familiar pressure of staring down late Saturday night trying to prepare a sermon for Sunday.
      </p>

      <p style="font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 18px;">
        That is why I created <strong>The Shepherd's Desk</strong> with Tiny Tech. Not as a big software company trying to sell another administrative program, but as a pastor's wife who wanted to give pastors their peace of mind, their sacred study hours, and their Saturdays back.
      </p>
    `

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
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #E5E7EB;" cellspacing="0" cellpadding="0">
          
          <tr>
            <td style="background-color: #011830; padding: 28px 24px; text-align: center; border-bottom: 3px solid #D0A348;">
              <a href="${appUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                <img src="${appUrl}/shepherds-desk-banner-logo.png" alt="The Shepherd's Desk - From Monday's ministry to Sunday's message." width="360" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 18px; font-weight: 600; color: #022d5c; margin-top: 0; margin-bottom: 16px;">
                Dear ${recipientGreeting},
              </p>

              ${openingStory}

              ${customNote?.trim() ? `
              <div style="background-color: #F8F5EE; border-left: 4px solid #D0A348; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
                <p style="margin: 0; font-size: 14px; color: #022d5c; font-style: italic;">
                  "${customNote.trim()}"
                </p>
              </div>
              ` : ''}

              <!-- Highlights Box -->
              <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 26px;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #022d5c; text-transform: uppercase; letter-spacing: 0.5px;">
                  Built specifically for your calling:
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                  ⚡ <strong>Smart Reminders:</strong> Speak naturally when someone asks for prayer or a visit after church—our system schedules and logs it automatically.
                </p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                  📖 <strong>200+ Sermon Illustrations Library:</strong> Historical, biblical, and contemporary illustrations ready when you need that perfect hook.
                </p>
                <p style="margin: 0; font-size: 14px; color: #4B5563; line-height: 1.5;">
                  🎙️ <strong>Pulpit Mode:</strong> A clean digital sermon prompter with a built-in preaching clock.
                </p>
              </div>

              <div style="text-align: center; margin: 30px 0 20px 0;">
                <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #022d5c; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; border: 2px solid #D0A348; box-shadow: 0 4px 6px rgba(2,45,92,0.2);">
                  Accept Your Invitation & Try It Free &rarr;
                </a>
              </div>

              <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 24px; margin-bottom: 4px;">
                May the Lord richly bless your ministry and your family,
              </p>
              <p style="font-size: 15px; font-weight: 700; color: #022d5c; margin: 0;">
                ${signatoryName}
              </p>
              <p style="font-size: 13px; color: #6B7280; margin: 2px 0 0 0;">
                ${signatoryTitle}
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #F8F5EE; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
                The Shepherd's Desk &bull; A Tiny Tech Creation &bull; <a href="https://tinytechcompany.com" style="color: #D0A348; text-decoration: none;">tinytechcompany.com</a>
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
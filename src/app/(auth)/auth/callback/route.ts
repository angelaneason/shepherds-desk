import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const refCode = searchParams.get('ref')
  const giftCode = searchParams.get('gift')
  const isMobile = searchParams.get('mobile') === '1'

  // If initiated from the mobile app, hand the PKCE code back to the mobile app via deep link
  // so the mobile app (which holds the PKCE code_verifier) can exchange it for a native session.
  if (isMobile && code) {
    const deepLink = `shepherdsdesk://auth-callback?code=${encodeURIComponent(code)}`
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to The Shepherd's Desk...</title>
  <meta http-equiv="refresh" content="0;url=${deepLink}" />
</head>
<body style="background:#022d5c;color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:90vh;text-align:center;padding:24px;">
  <h2 style="margin-bottom:8px;">Signed in with Google!</h2>
  <p style="color:#cbd5e1;margin-bottom:24px;">Returning you to The Shepherd's Desk app...</p>
  <a href="${deepLink}" style="background:#D0A348;color:#022d5c;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;font-size:16px;">Open The Shepherd's Desk App</a>
  <script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body>
</html>`
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Can be ignored in route handlers
            }
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      const adminSupabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll() },
            setAll() {}
          },
        }
      )

      const googleName = (
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        ''
      ).trim()

      // Check if profile exists
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profile) {
        // Brand-new user: create church, profile with 30-day trial, and match any pending referral
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        let churchId: string | undefined
        try {
          const { data: church } = await adminSupabase
            .from('churches')
            .insert({ name: 'My Church' })
            .select('id')
            .single()
          churchId = church?.id
        } catch {}

        await adminSupabase
          .from('profiles')
          .insert({
            id: session.user.id,
            ...(churchId ? { church_id: churchId } : {}),
            full_name: googleName || 'Pastor',
            email: session.user.email || '',
            trial_ends_at: thirtyDaysFromNow.toISOString(),
          } as any)

        // Match pending referral by refCode or email for new sign-ups
        const userEmail = (session.user.email || '').toLowerCase().trim()
        try {
          const nowIso = new Date().toISOString()
          if (refCode) {
            await adminSupabase
              .from('referrals')
              .update({
                status: 'signed_up',
                referred_id: session.user.id,
                signup_email: session.user.email,
                converted_at: nowIso,
                updated_at: nowIso,
              } as any)
              .eq('referral_code', refCode)
              .eq('status', 'pending')
          }
          if (userEmail) {
            await adminSupabase
              .from('referrals')
              .update({
                status: 'signed_up',
                referred_id: session.user.id,
                signup_email: session.user.email,
                converted_at: nowIso,
                updated_at: nowIso,
              } as any)
              .ilike('referred_email', userEmail)
              .eq('status', 'pending')
          }
        } catch {}
      } else {
        // Returning user: only backfill name if still generic 'Pastor'
        if (googleName && (!profile.full_name || profile.full_name === 'Pastor')) {
          await adminSupabase
            .from('profiles')
            .update({ full_name: googleName } as any)
            .eq('id', session.user.id)
        }
      }

      if (giftCode) {
        return NextResponse.redirect(`${origin}/gift/redeem?code=${encodeURIComponent(giftCode)}`)
      }
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

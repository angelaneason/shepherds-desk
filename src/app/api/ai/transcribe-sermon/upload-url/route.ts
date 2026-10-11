import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let ext = 'm4a'
    try {
      const body = await request.json()
      if (body?.ext) {
        ext = String(body.ext).replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'm4a'
      }
    } catch {
      // Body is optional
    }

    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

    const { data, error } = await adminSupabase.storage
      .from('sermon-audio')
      .createSignedUploadUrl(fileName)

    if (error || !data) {
      console.error('Error creating signed upload URL:', error)
      return NextResponse.json(
        { error: error?.message || 'Could not generate upload URL.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      path: data.path,
      token: data.token,
    })
  } catch (error: any) {
    console.error('Failed to create signed upload URL:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

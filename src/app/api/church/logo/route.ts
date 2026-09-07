import { NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Get user profile and church_id
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile?.church_id) {
      return NextResponse.json({ error: 'No church associated with profile' }, { status: 400 })
    }

    const churchId = profile.church_id

    // 2. Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate mime type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!validMimes.includes(file.type)) {
      return NextResponse.json({ error: 'Please upload an image file (PNG, JPG, SVG, WebP, or GIF)' }, { status: 400 })
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image size must be less than 5MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `logos/${churchId}-${Date.now()}.${fileExt}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 3. Upload to church-assets bucket
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('church-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    // 4. Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from('church-assets')
      .getPublicUrl(fileName)

    // 5. Update churches table
    const { error: updateError } = await adminSupabase
      .from('churches')
      .update({ logo_url: publicUrl })
      .eq('id', churchId)

    if (updateError) {
      console.error('Error updating church logo_url:', updateError)
      return NextResponse.json({ error: `Database update failed: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl,
    })
  } catch (err: any) {
    console.error('Unexpected error in /api/church/logo:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const serverSupabase = await createServerSupabase()
    const { data: { user }, error: authError } = await serverSupabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('church_id')
      .eq('id', user.id)
      .single()

    if (!profile?.church_id) {
      return NextResponse.json({ error: 'No church associated with profile' }, { status: 400 })
    }

    await adminSupabase
      .from('churches')
      .update({ logo_url: null })
      .eq('id', profile.church_id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSermonSpeaker, saveSermonSpeaker } from '@/lib/sermon-speaker'

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase configuration is missing.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'SD-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function localTodayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function getOrCreateShareCode(adminSupabase: any, sermonId: string): Promise<string> {
  const { data: existingTags } = await adminSupabase
    .from('sermon_tags')
    .select('tag_value')
    .eq('sermon_id', sermonId)
    .eq('tag_type', 'custom')

  const existing = (existingTags || []).find(
    (t: any) => typeof t.tag_value === 'string' && t.tag_value.startsWith('share_code:')
  )
  if (existing) {
    return existing.tag_value.replace('share_code:', '').trim()
  }

  const code = generateCode()
  await adminSupabase.from('sermon_tags').insert({
    sermon_id: sermonId,
    tag_type: 'custom',
    tag_value: `share_code:${code}`,
  })
  return code
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body
    const adminSupabase = getAdminSupabase()

    // 1. Create or retrieve a 6-character Share Code & exportable package for a sermon
    if (action === 'create_share_code') {
      const { sermonId, senderName } = body
      if (!sermonId) {
        return NextResponse.json({ error: 'sermonId is required.' }, { status: 400 })
      }

      const { data: sermon, error: sermonErr } = await adminSupabase
        .from('sermons')
        .select('*, sermon_tags(tag_type, tag_value)')
        .eq('id', sermonId)
        .single()

      if (sermonErr || !sermon) {
        return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 })
      }

      let authorName = senderName || ''
      if (!authorName && sermon.author_id) {
        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', sermon.author_id)
          .maybeSingle()
        authorName = prof?.full_name || 'Fellow Pastor'
      }

      const spk = getSermonSpeaker(sermon, sermon.sermon_tags || [], authorName || 'Fellow Pastor')
      const shareCode = await getOrCreateShareCode(adminSupabase, sermonId)

      const sermonPackage = {
        tsd_sermon_package: true,
        version: 1,
        shareCode,
        title: sermon.title || 'Shared Sermon',
        subtitle: sermon.subtitle || null,
        scripture_primary: sermon.scripture_primary || null,
        scriptures_all: sermon.scriptures_all || [],
        series_name: sermon.series_name || null,
        preach_date: sermon.preach_date || localTodayStr(),
        content: sermon.content,
        speaker_name: spk.speakerName || authorName || 'Fellow Pastor',
        exported_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        shareCode,
        sermonPackage,
      })
    }

    // 2. Send a recorded sermon directly to another pastor's Shepherd's Desk by email
    if (action === 'send_to_pastor') {
      const { sermonId, recipientEmail, senderName } = body
      const cleanEmail = String(recipientEmail || '').trim().toLowerCase()
      if (!sermonId || !cleanEmail) {
        return NextResponse.json(
          { error: 'Please provide both a sermon and the recipient pastor email.' },
          { status: 400 }
        )
      }

      const { data: sermon, error: sermonErr } = await adminSupabase
        .from('sermons')
        .select('*, sermon_tags(tag_type, tag_value)')
        .eq('id', sermonId)
        .single()

      if (sermonErr || !sermon) {
        return NextResponse.json({ error: 'Sermon not found.' }, { status: 404 })
      }

      let authorName = senderName || ''
      if (!authorName && sermon.author_id) {
        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('full_name')
          .eq('id', sermon.author_id)
          .maybeSingle()
        authorName = prof?.full_name || 'Fellow Pastor'
      }

      const spk = getSermonSpeaker(sermon, sermon.sermon_tags || [], authorName || 'Fellow Pastor')
      const effectiveSpeaker = spk.speakerName || authorName || 'Fellow Pastor'
      const shareCode = await getOrCreateShareCode(adminSupabase, sermonId)

      // Look up recipient pastor in profiles
      const { data: recipientProfile } = await adminSupabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (!recipientProfile?.id) {
        return NextResponse.json({
          success: true,
          deliveredDirectly: false,
          shareCode,
          message: `No Shepherd's Desk account was found for ${cleanEmail} yet. Share code ${shareCode} with them so they can upload it into their Shepherd's Desk.`,
        })
      }

      // Insert sermon into recipient pastor's library as an Other Speaker sermon
      const insertPayload: any = {
        author_id: recipientProfile.id,
        title: sermon.title || 'Shared Sermon',
        subtitle: sermon.subtitle || null,
        scripture_primary: sermon.scripture_primary || null,
        scriptures_all: sermon.scriptures_all || [],
        series_name: sermon.series_name || null,
        preach_date: sermon.preach_date || localTodayStr(),
        status: 'preached',
        content: sermon.content,
      }

      const { data: newSermon, error: insertErr } = await adminSupabase
        .from('sermons')
        .insert(insertPayload)
        .select('id, title')
        .single()

      if (insertErr || !newSermon) {
        throw new Error(insertErr?.message || 'Failed to deliver sermon to recipient.')
      }

      await saveSermonSpeaker(adminSupabase, newSermon.id, {
        isOwnSermon: false,
        speakerName: effectiveSpeaker,
      })

      // Notify recipient pastor inside Shepherd's Desk
      try {
        await adminSupabase.from('notifications').insert({
          profile_id: recipientProfile.id,
          type: 'sermon',
          title: 'Recorded Sermon Received',
          message: `${effectiveSpeaker} sent you a recorded sermon: "${sermon.title || 'Shared Sermon'}"`,
          link: `/sermons/${newSermon.id}`,
          is_read: false,
        })
      } catch {
        // non-fatal notification
      }

      return NextResponse.json({
        success: true,
        deliveredDirectly: true,
        shareCode,
        recipientName: recipientProfile.full_name || cleanEmail,
        message: `"${sermon.title}" was sent directly to ${recipientProfile.full_name || cleanEmail}'s Shepherd's Desk!`,
      })
    }

    // 3. Import / upload a shared sermon into Shepherd's Desk by Share Code or .tsd.json package
    if (action === 'import_sermon') {
      const { recipientUserId, shareCode, sermonPackage } = body
      if (!recipientUserId) {
        return NextResponse.json({ error: 'You must be signed in to import a sermon.' }, { status: 401 })
      }

      let sourceTitle = 'Shared Sermon'
      let sourceSubtitle: string | null = null
      let sourceScripturePrimary: string | null = null
      let sourceScripturesAll: string[] = []
      let sourceSeriesName: string | null = null
      let sourcePreachDate = localTodayStr()
      let sourceContent: any = null
      let sourceSpeakerName = 'Fellow Pastor'

      if (sermonPackage && typeof sermonPackage === 'object' && sermonPackage.content) {
        sourceTitle = sermonPackage.title || 'Shared Sermon'
        sourceSubtitle = sermonPackage.subtitle || null
        sourceScripturePrimary = sermonPackage.scripture_primary || null
        sourceScripturesAll = Array.isArray(sermonPackage.scriptures_all) ? sermonPackage.scriptures_all : []
        sourceSeriesName = sermonPackage.series_name || null
        sourcePreachDate = sermonPackage.preach_date || localTodayStr()
        sourceContent = sermonPackage.content
        sourceSpeakerName = sermonPackage.speaker_name || 'Fellow Pastor'
      } else if (shareCode) {
        let normalizedCode = String(shareCode).trim().toUpperCase()
        if (!normalizedCode.startsWith('SD-') && normalizedCode.length === 6) {
          normalizedCode = `SD-${normalizedCode}`
        }

        const { data: tagRows } = await adminSupabase
          .from('sermon_tags')
          .select('sermon_id, tag_value')
          .eq('tag_type', 'custom')
          .ilike('tag_value', `share_code:${normalizedCode}`)
          .limit(1)

        const matchedTag = tagRows?.[0]
        if (!matchedTag?.sermon_id) {
          return NextResponse.json(
            { error: `Could not find a shared sermon with code "${normalizedCode}". Please check the code and try again.` },
            { status: 404 }
          )
        }

        const { data: sermon, error: sermonErr } = await adminSupabase
          .from('sermons')
          .select('*, sermon_tags(tag_type, tag_value)')
          .eq('id', matchedTag.sermon_id)
          .single()

        if (sermonErr || !sermon) {
          return NextResponse.json({ error: 'The shared sermon could not be loaded.' }, { status: 404 })
        }

        let authorName = 'Fellow Pastor'
        if (sermon.author_id) {
          const { data: prof } = await adminSupabase
            .from('profiles')
            .select('full_name')
            .eq('id', sermon.author_id)
            .maybeSingle()
          if (prof?.full_name) authorName = prof.full_name
        }

        const spk = getSermonSpeaker(sermon, sermon.sermon_tags || [], authorName)
        sourceTitle = sermon.title || 'Shared Sermon'
        sourceSubtitle = sermon.subtitle || null
        sourceScripturePrimary = sermon.scripture_primary || null
        sourceScripturesAll = sermon.scriptures_all || []
        sourceSeriesName = sermon.series_name || null
        sourcePreachDate = sermon.preach_date || localTodayStr()
        sourceContent = sermon.content
        sourceSpeakerName = spk.speakerName || authorName
      } else {
        return NextResponse.json(
          { error: 'Please provide a Sermon Share Code or upload a shared sermon file.' },
          { status: 400 }
        )
      }

      const { data: importedSermon, error: importErr } = await adminSupabase
        .from('sermons')
        .insert({
          author_id: recipientUserId,
          title: sourceTitle,
          subtitle: sourceSubtitle,
          scripture_primary: sourceScripturePrimary,
          scriptures_all: sourceScripturesAll,
          series_name: sourceSeriesName,
          preach_date: sourcePreachDate,
          status: 'preached',
          content: sourceContent,
        })
        .select('*')
        .single()

      if (importErr || !importedSermon) {
        throw new Error(importErr?.message || 'Could not import shared sermon.')
      }

      await saveSermonSpeaker(adminSupabase, importedSermon.id, {
        isOwnSermon: false,
        speakerName: sourceSpeakerName,
      })

      return NextResponse.json({
        success: true,
        sermon: {
          ...importedSermon,
          is_own_sermon: false,
          speaker_name: sourceSpeakerName,
        },
      })
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })
  } catch (err: any) {
    console.error('Error in /api/sermons/share:', err)
    return NextResponse.json(
      { error: err?.message || 'An error occurred while sharing the sermon.' },
      { status: 500 }
    )
  }
}

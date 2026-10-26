import type { SupabaseClient } from '@supabase/supabase-js'

export interface SermonSpeakerInfo {
  isOwnSermon: boolean
  speakerName: string
}

/**
 * Extracts speaker attribution from a sermon record and its optional sermon_tags.
 * Defaults to the logged-in pastor ("My Sermon") when not explicitly marked as another speaker.
 */
export function getSermonSpeaker(
  sermon: any,
  tags?: Array<{ tag_type?: string; tag_value?: string }>,
  defaultPastorName = ''
): SermonSpeakerInfo {
  // 1. Check direct columns on sermons row if present
  if (typeof sermon?.is_own_sermon === 'boolean') {
    return {
      isOwnSermon: sermon.is_own_sermon,
      speakerName: sermon.speaker_name || (sermon.is_own_sermon ? defaultPastorName : 'Guest Speaker'),
    }
  }
  if (sermon?.speaker_name && typeof sermon.speaker_name === 'string') {
    const clean = sermon.speaker_name.trim()
    const isMine =
      !clean ||
      (defaultPastorName && clean.toLowerCase() === defaultPastorName.toLowerCase())
    return {
      isOwnSermon: Boolean(isMine),
      speakerName: clean || defaultPastorName,
    }
  }

  // 2. Check sermon_tags fallback (tag_type = 'custom', tag_value = 'speaker_role:...' / 'speaker_name:...')
  const tagList = tags || sermon?.sermon_tags || []
  if (Array.isArray(tagList) && tagList.length > 0) {
    let roleTag: string | null = null
    let nameTag: string | null = null
    for (const t of tagList) {
      const val = t?.tag_value || ''
      if (val.startsWith('speaker_role:')) {
        roleTag = val.replace('speaker_role:', '').trim()
      } else if (val.startsWith('speaker_name:')) {
        nameTag = val.replace('speaker_name:', '').trim()
      }
    }
    if (roleTag || nameTag) {
      const isOwn = roleTag !== 'other'
      return {
        isOwnSermon: isOwn,
        speakerName: nameTag || (isOwn ? defaultPastorName : 'Guest Speaker'),
      }
    }
  }

  // 3. Default: logged-in pastor's own sermon
  return {
    isOwnSermon: true,
    speakerName: defaultPastorName,
  }
}

/**
 * Persists speaker attribution both to sermons columns (if migration 013 is applied)
 * and to sermon_tags (so it works immediately even before running any SQL migration).
 */
export async function saveSermonSpeaker(
  supabase: SupabaseClient,
  sermonId: string,
  info: SermonSpeakerInfo
): Promise<void> {
  const cleanName = (info.speakerName || '').trim()

  // 1. Try updating columns on sermons table (gracefully ignored if columns don't exist yet)
  try {
    await (supabase.from('sermons') as any)
      .update({
        speaker_name: cleanName || null,
        is_own_sermon: info.isOwnSermon,
      })
      .eq('id', sermonId)
  } catch {}

  // 2. Always sync to sermon_tags (which exists in 001_initial_schema.sql)
  try {
    const { data: existingTags } = await (supabase.from('sermon_tags') as any)
      .select('id, tag_value')
      .eq('sermon_id', sermonId)
      .eq('tag_type', 'custom')

    const toDelete = (existingTags || [])
      .filter(
        (t: any) =>
          typeof t.tag_value === 'string' &&
          (t.tag_value.startsWith('speaker_role:') || t.tag_value.startsWith('speaker_name:'))
      )
      .map((t: any) => t.id)

    if (toDelete.length > 0) {
      await (supabase.from('sermon_tags') as any).delete().in('id', toDelete)
    }

    const newTags: Array<{ sermon_id: string; tag_type: string; tag_value: string }> = [
      {
        sermon_id: sermonId,
        tag_type: 'custom',
        tag_value: `speaker_role:${info.isOwnSermon ? 'mine' : 'other'}`,
      },
    ]

    if (cleanName) {
      newTags.push({
        sermon_id: sermonId,
        tag_type: 'custom',
        tag_value: `speaker_name:${cleanName}`,
      })
    }

    await (supabase.from('sermon_tags') as any).insert(newTags)
  } catch (err) {
    console.warn('Speaker tag sync notice:', err)
  }
}

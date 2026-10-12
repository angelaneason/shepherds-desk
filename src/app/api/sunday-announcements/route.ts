import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try primary dedicated table first
    const { data, error } = await supabase
      .from('sunday_announcements')
      .select('*')
      .eq('profile_id', user.id)
      .order('sunday_date', { ascending: false });

    if (!error && data) {
      return NextResponse.json({ announcements: data, source: 'table' });
    }

    // If table doesn't exist yet (PGRST205), check fallback records in announcements table
    if (error && error.code === 'PGRST205') {
      const { data: fallbackData } = await supabase
        .from('announcements')
        .select('*')
        .eq('profile_id', user.id)
        .like('title', '[Sunday Announcements]%')
        .order('display_date', { ascending: false });

      const parsedFallbacks = (fallbackData || []).map((item: any) => {
        let parsedContent: any = {};
        try {
          parsedContent = JSON.parse(item.content);
        } catch {
          parsedContent = { script_spoken: item.content, script_bulletin: item.content, script_sms: item.content };
        }
        return {
          id: item.id,
          profile_id: item.profile_id,
          sunday_date: item.display_date || item.created_at?.split('T')[0],
          title: item.title.replace(/^\[Sunday Announcements\]\s*/, ''),
          script_spoken: parsedContent.script_spoken || '',
          script_bulletin: parsedContent.script_bulletin || '',
          script_sms: parsedContent.script_sms || '',
          included_event_ids: parsedContent.included_event_ids || [],
          custom_items: parsedContent.custom_items || [],
          created_at: item.created_at,
          updated_at: item.updated_at
        };
      });

      return NextResponse.json({ announcements: parsedFallbacks, source: 'fallback' });
    }

    if (error) {
      throw error;
    }

    return NextResponse.json({ announcements: [] });
  } catch (err: any) {
    console.error('Error fetching Sunday announcements:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch announcements' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sunday_date,
      title,
      script_spoken,
      script_bulletin,
      script_sms,
      included_event_ids = [],
      custom_items = [],
      notes = ''
    } = body;

    if (!sunday_date || !title) {
      return NextResponse.json({ error: 'Sunday date and title are required' }, { status: 400 });
    }

    // Try inserting into dedicated table
    const { data, error } = await supabase
      .from('sunday_announcements')
      .insert({
        profile_id: user.id,
        sunday_date,
        title,
        script_spoken,
        script_bulletin,
        script_sms,
        included_event_ids,
        custom_items,
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ announcement: data, success: true });
    }

    // Fallback if table doesn't exist yet
    if (error && error.code === 'PGRST205') {
      const fallbackPayload = JSON.stringify({
        script_spoken,
        script_bulletin,
        script_sms,
        included_event_ids,
        custom_items,
        notes
      });

      const { data: fallbackRecord, error: fallbackErr } = await supabase
        .from('announcements')
        .insert({
          profile_id: user.id,
          title: `[Sunday Announcements] ${title}`,
          content: fallbackPayload,
          category: 'event',
          display_date: sunday_date,
          expires_at: sunday_date,
          is_active: true
        })
        .select()
        .single();

      if (fallbackErr) throw fallbackErr;

      return NextResponse.json({
        announcement: {
          id: fallbackRecord.id,
          profile_id: fallbackRecord.profile_id,
          sunday_date,
          title,
          script_spoken,
          script_bulletin,
          script_sms,
          included_event_ids,
          custom_items,
          notes,
          created_at: fallbackRecord.created_at
        },
        success: true,
        source: 'fallback'
      });
    }

    if (error) throw error;

    return NextResponse.json({ announcement: data, success: true });
  } catch (err: any) {
    console.error('Error saving Sunday announcement:', err);
    return NextResponse.json({ error: err.message || 'Failed to save announcement' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Attempt delete from sunday_announcements
    const { error } = await supabase
      .from('sunday_announcements')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error && error.code === 'PGRST205') {
      // Fallback delete from announcements
      await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('profile_id', user.id);
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting Sunday announcement:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete announcement' }, { status: 500 });
  }
}

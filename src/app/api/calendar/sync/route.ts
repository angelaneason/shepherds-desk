import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { parseICalFeed } from '@/lib/icalParser';

export async function POST(req: Request) {
  try {
    let user = null;

    // 1. Try Bearer token from header (mobile / direct API)
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const serviceClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: authData } = await serviceClient.auth.getUser(token);
      if (authData?.user) {
        user = authData.user;
      }
    }

    // 2. Fallback to server cookies (web app)
    if (!user) {
      const supabaseServer = await createServerSupabase();
      const { data: cookieAuth } = await supabaseServer.auth.getUser();
      if (cookieAuth?.user) {
        user = cookieAuth.user;
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    let feedUrl = (body.feedUrl || body.icalUrl || body.url || '').trim();

    if (!feedUrl) {
      return NextResponse.json({ error: 'Calendar iCal URL is required.' }, { status: 400 });
    }

    // Convert webcal:// to https://
    let normalizedUrl = feedUrl.replace(/^webcal:\/\//i, 'https://');

    // Auto-heal Google Calendar URLs if truncated at the end (e.g. basic.i, basic.ic, basic)
    if (normalizedUrl.includes('calendar.google.com/calendar/ical/')) {
      if (normalizedUrl.endsWith('/basic')) {
        normalizedUrl += '.ics';
      } else if (normalizedUrl.endsWith('/basic.')) {
        normalizedUrl += 'ics';
      } else if (normalizedUrl.endsWith('/basic.i')) {
        normalizedUrl += 'cs';
      } else if (normalizedUrl.endsWith('/basic.ic')) {
        normalizedUrl += 's';
      }
    }

    // Security check: only allow http/https
    if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://')) {
      return NextResponse.json({ error: 'Invalid calendar URL scheme. Must be http(s) or webcal.' }, { status: 400 });
    }

    // Fetch the .ics feed
    const res = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'TheShepherdsDesk-CalendarSync/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Unable to reach calendar feed (Status ${res.status}). Ensure the secret iCal link is correct.` },
        { status: 400 }
      );
    }

    const icsText = await res.text();
    const parsedEvents = parseICalFeed(icsText);

    if (!parsedEvents || parsedEvents.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Connected successfully, but no events were found in this feed.',
      });
    }

    // Initialize Supabase admin client for database upserts
    const dbClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Bounded date range: 60 days in past to 180 days in future
    const now = new Date();
    const minDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const filteredEvents = parsedEvents.filter((ev) => {
      const evDate = new Date(ev.start_time);
      return evDate >= minDate && evDate <= maxDate;
    });

    // Fetch existing events for this user within range to avoid duplicates
    const { data: existingEvents } = await dbClient
      .from('calendar_events')
      .select('id, title, start_time')
      .eq('profile_id', user.id)
      .gte('start_time', minDate.toISOString())
      .lte('start_time', maxDate.toISOString());

    const existingMap = new Set<string>();
    if (existingEvents) {
      existingEvents.forEach((ex: any) => {
        const key = `${ex.title?.trim().toLowerCase()}_${new Date(ex.start_time).toISOString().slice(0, 16)}`;
        existingMap.add(key);
      });
    }

    const eventsToInsert = [];
    for (const ev of filteredEvents) {
      const key = `${ev.title?.trim().toLowerCase()}_${new Date(ev.start_time).toISOString().slice(0, 16)}`;
      if (!existingMap.has(key)) {
        eventsToInsert.push({
          profile_id: user.id,
          title: ev.title,
          event_type: 'personal', // Valid constraint in calendar_events
          description: ev.description ? `[Google Calendar] ${ev.description}` : '[Google Calendar]',
          start_time: ev.start_time,
          end_time: ev.end_time,
          all_day: ev.all_day,
          location: ev.location || null,
          color: '#4285F4', // Google Calendar blue
        });
        existingMap.add(key); // prevent duplicate entries inside the feed itself
      }
    }

    let insertedCount = 0;
    if (eventsToInsert.length > 0) {
      const { data: inserted, error: insertErr } = await dbClient
        .from('calendar_events')
        .insert(eventsToInsert)
        .select('id');

      if (insertErr) {
        console.error('Error inserting synced calendar events:', insertErr);
        throw insertErr;
      }
      insertedCount = inserted?.length || 0;
    }

    // Save calendar feed url to profile for easy 1-click re-syncing in future
    try {
      await dbClient
        .from('profiles')
        .update({
          calendar_feed_url: normalizedUrl,
          last_calendar_sync: new Date().toISOString(),
        } as any)
        .eq('id', user.id);
    } catch {
      // Column might not exist in profiles, which is fine
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      totalInFeed: parsedEvents.length,
      filteredRangeCount: filteredEvents.length,
      message: `Successfully synchronized ${insertedCount} new events from your calendar!`,
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to sync calendar feed.' },
      { status: 500 }
    );
  }
}

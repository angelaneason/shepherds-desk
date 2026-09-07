/**
 * Universal iCal (.ics) Parser Utility
 * Parses standard iCalendar format from Google Calendar, Apple iCloud, and Microsoft Outlook
 */

export interface ParsedICalEvent {
  title: string;
  start_time: string; // ISO string
  end_time: string;   // ISO string
  all_day: boolean;
  location: string;
  description: string;
}

function parseICalDateTime(rawVal: string): { iso: string; isAllDay: boolean } | null {
  if (!rawVal) return null;

  // Clean value (strip TZID parameter if present: DTSTART;TZID=America/Chicago:20260907T140000)
  const clean = rawVal.split(':').pop()?.trim().replace(/[^0-9TZ]/g, '') || '';
  if (!clean) return null;

  // Format: YYYYMMDD (All Day)
  if (clean.length === 8 && !clean.includes('T')) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return {
      iso: `${year}-${month}-${day}T00:00:00.000Z`,
      isAllDay: true,
    };
  }

  // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  if (clean.includes('T')) {
    const parts = clean.split('T');
    const datePart = parts[0];
    const timePart = parts[1].replace('Z', '');

    const year = datePart.slice(0, 4);
    const month = datePart.slice(4, 6);
    const day = datePart.slice(6, 8);

    const hours = timePart.slice(0, 2) || '00';
    const minutes = timePart.slice(2, 4) || '00';
    const seconds = timePart.slice(4, 6) || '00';

    return {
      iso: `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`,
      isAllDay: false,
    };
  }

  return null;
}

export function parseICalFeed(icsData: string): ParsedICalEvent[] {
  const events: ParsedICalEvent[] = [];
  if (!icsData) return events;

  // Split on VEVENT blocks
  const rawEvents = icsData.split(/BEGIN:VEVENT/i).slice(1);

  for (const block of rawEvents) {
    const rawLines = block.split(/\r?\n/);
    const unfoldedLines: string[] = [];

    // Line unfolding (RFC 5545 section 3.1: lines starting with space or tab continue previous line)
    for (let i = 0; i < rawLines.length; i++) {
      let line = rawLines[i];
      while (i + 1 < rawLines.length && (rawLines[i + 1].startsWith(' ') || rawLines[i + 1].startsWith('\t'))) {
        i++;
        line += rawLines[i].substring(1);
      }
      unfoldedLines.push(line.trim());
    }

    let summary = 'Event';
    let rawStart = '';
    let rawEnd = '';
    let location = '';
    let description = '';

    for (const line of unfoldedLines) {
      if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8).replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\\\/g, '\\');
      } else if (line.startsWith('DTSTART')) {
        rawStart = line;
      } else if (line.startsWith('DTEND')) {
        rawEnd = line;
      } else if (line.startsWith('LOCATION:')) {
        location = line.substring(9).replace(/\\,/g, ',').replace(/\\n/g, ' ').replace(/\\\\/g, '\\');
      } else if (line.startsWith('DESCRIPTION:')) {
        description = line.substring(12).replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      }
    }

    const parsedStart = parseICalDateTime(rawStart);
    if (!parsedStart) continue;

    let parsedEnd = parseICalDateTime(rawEnd);
    // If no end time, default to 1 hour after start (or same day for all day)
    if (!parsedEnd) {
      const startDateObj = new Date(parsedStart.iso);
      if (parsedStart.isAllDay) {
        startDateObj.setDate(startDateObj.getDate() + 1);
      } else {
        startDateObj.setHours(startDateObj.getHours() + 1);
      }
      parsedEnd = {
        iso: startDateObj.toISOString(),
        isAllDay: parsedStart.isAllDay,
      };
    }

    events.push({
      title: summary.trim() || 'Untitled Calendar Event',
      start_time: parsedStart.iso,
      end_time: parsedEnd.iso,
      all_day: parsedStart.isAllDay,
      location: location.trim(),
      description: description.trim(),
    });
  }

  return events;
}

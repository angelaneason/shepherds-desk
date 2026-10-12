import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Member-facing messages must never contain em/en dashes (per Shepherd's Desk rules).
// Number ranges ("8–10") become a plain hyphen; any other dash becomes a comma, colon, or "and".
function removeDashes(text: string): string {
  if (!text) return '';
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[–—]+\s*/g, ', ')
    .replace(/,\s*([,.!?])/g, '$1')
    .replace(/^,\s*/, '')
    .trim();
}

interface EventItem {
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sundayDate,
      pastorName = '',
      churchName = '',
      events = [],
      customItems = [],
      tone = 'traditional'
    } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });

    const eventListFormatted = events.map((e: EventItem, idx: number) => {
      let details = `${idx + 1}. ${e.title}`;
      if (e.start_time) details += ` (Date/Time: ${e.start_time}${e.end_time ? ' to ' + e.end_time : ''})`;
      if (e.location) details += ` [Location: ${e.location}]`;
      if (e.description) details += ` - Description: ${e.description}`;
      return details;
    }).join('\n');

    const customListFormatted = customItems.map((c: string, idx: number) => `${idx + 1}. ${c}`).join('\n');

    const systemPrompt = `You are a trusted, traditional pastoral assistant for "The Shepherd's Desk". Your task is to generate complete Sunday Announcements for a church service.

CRITICAL TONE & STYLE RULES:
1. Tone: Reverent, warm, traditional, and pastoral. Speak with dignity, grace, and community love.
2. ABSOLUTE DASH BAN: NEVER use em dashes (—) or en dashes (–) in any part of the output. Real people rarely type them and they make announcements look machine-written. Use a comma, a period, a colon, or the word "and" instead. A plain hyphen (-) is only permitted inside hyphenated words or numeric ranges like "8-15".
3. Accuracy: Base all announcements strictly on the provided calendar events and pastoral notes. Do not invent dates or times.
4. Output Format: You must return valid JSON with the following schema:
{
  "title": "string (e.g. Sunday Announcements: October 18, 2026)",
  "script_spoken": "string (The complete pulpit script to be read aloud from the pulpit. Include warm greeting, smooth conversational transitions between items, clear details, and a closing prayer transition)",
  "script_bulletin": "string (Clean, organized text formatted for a printed church bulletin or projection slides with clear headers, dates, times, and locations)",
  "script_sms": "string (A concise, warm text message reminder for the congregation summarizing the week's key gatherings, suitable for SMS broadcast)"
}`;

    const userPrompt = `Generate Sunday Announcements for:
Sunday Date: ${sundayDate || 'Upcoming Sunday'}
Pastor Name: ${pastorName || 'The Pastor'}
Church Name: ${churchName || 'Our Church'}

Calendar Events Selected for Announcements:
${eventListFormatted || 'None provided'}

Additional Pastoral Notes / Custom Announcements:
${customListFormatted || 'None provided'}

Generate the JSON now:`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }]
    });

    const rawResponse = result.response.text().trim();
    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // Fallback in case of markdown wrappers
      const cleanJson = rawResponse.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    }

    // Strip any dashes from all generated output
    const cleanOutput = {
      title: removeDashes(parsed.title || `Sunday Announcements: ${sundayDate}`),
      script_spoken: removeDashes(parsed.script_spoken || ''),
      script_bulletin: removeDashes(parsed.script_bulletin || ''),
      script_sms: removeDashes(parsed.script_sms || '')
    };

    return NextResponse.json(cleanOutput);
  } catch (error: any) {
    console.error('Error generating Sunday announcements:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate Sunday announcements' },
      { status: 500 }
    );
  }
}

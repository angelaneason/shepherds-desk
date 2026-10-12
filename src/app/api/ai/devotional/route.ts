import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

// Number ranges ("8–10") become a plain hyphen; any other dash becomes a comma.
function removeDashes(text: string): string {
  if (!text) return '';
  return text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[–—]+\s*/g, ', ')
    .replace(/,\s*([,.!?])/g, '$1')
    .replace(/^,\s*/, '')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { sermonTitle, sermonContent, scripture, days } = await request.json();

    if (!sermonTitle || !days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `You are a pastoral devotional writer. Given a sermon title, content, and scripture, create a ${days}-day devotional plan. Each day must have:
- day (number)
- title (string)
- scripture (string: biblical reference)
- text (string: 1 concise, inspiring pastoral paragraph of 3-4 sentences capturing the core message)
- question (string: 1 personal reflection question)
- prayer (string: 1 short closing prayer sentence)

CRITICAL RULES:
- Never use em dashes (—) or en dashes (–). Use commas, periods, colons, or the word "and" instead. Plain hyphens (-) are only allowed inside hyphenated words or numeric ranges like "8-15".
- Return a valid JSON array of objects with keys: day, title, scripture, text, question, prayer.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
      systemInstruction: systemPrompt,
    });

    const truncatedContent = sermonContent ? sermonContent.substring(0, 3000) : '';
    const prompt = `Sermon Title: ${sermonTitle}\n\n${scripture ? `Scripture: ${scripture}\n\n` : ''}${truncatedContent ? `Sermon Content:\n${truncatedContent}` : 'Generate based on the sermon title.'}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let parsedData: any[] = [];
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const startIdx = responseText.indexOf('[');
      const endIdx = responseText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const jsonStr = responseText.substring(startIdx, endIdx + 1);
        parsedData = JSON.parse(jsonStr);
      } else {
        const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsedData = JSON.parse(cleanedText);
      }
    }

    // Sanitize any dashes from every devotional field
    if (Array.isArray(parsedData)) {
      parsedData = parsedData.map((item) => ({
        ...item,
        title: removeDashes(item.title || ''),
        scripture: removeDashes(item.scripture || ''),
        text: removeDashes(item.text || ''),
        question: removeDashes(item.question || ''),
        prayer: removeDashes(item.prayer || ''),
      }));
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error generating devotional:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate devotional' },
      { status: 500 }
    );
  }
}

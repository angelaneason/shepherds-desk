import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

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
    const systemPrompt = `You are a pastoral devotional writer. Given a sermon title, content, and scripture, create a ${days}-day devotional plan. Each day should have:
- day (number)
- title (string)
- scripture (string)
- text (string: 2-3 warm, inspiring paragraphs in pastoral tone)
- question (string: 1 reflection question)
- prayer (string: 1 short closing prayer prompt)

Format your response as a valid JSON array of objects with fields: day, title, scripture, text, question, prayer.
Return ONLY the raw JSON array. Do not include markdown code fences or backticks.`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: systemPrompt,
    });

    const prompt = `Sermon Title: ${sermonTitle}\n\n${scripture ? `Scripture: ${scripture}\n\n` : ''}${sermonContent ? `Sermon Content:\n${sermonContent}` : 'Generate based on the sermon title.'}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Resilient JSON array extraction
    const startIdx = responseText.indexOf('[');
    const endIdx = responseText.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonStr = responseText.substring(startIdx, endIdx + 1);
      const parsedData = JSON.parse(jsonStr);
      return NextResponse.json(parsedData);
    }

    // Fallback cleanup
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error generating devotional:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate devotional' },
      { status: 500 }
    );
  }
}

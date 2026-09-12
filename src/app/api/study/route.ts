import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const word = searchParams.get('word');
    const reference = searchParams.get('reference');

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    if (type === 'concordance') {
      if (!word) {
        return NextResponse.json({ error: 'Word is required for concordance' }, { status: 400 });
      }

      const prompt = `You are a Bible concordance. For the word '${word}', list the top 8 most significant Bible verses where this word appears. For each, provide: reference, verse text (KJV), and a concise one-line context note. Also provide the Strong's number if applicable and the original Hebrew/Greek word with its meaning. 
      Return as structured JSON matching this TypeScript type:
      {
        "originalWord": "string",
        "strongsNumber": "string",
        "meaning": "string",
        "occurrences": [
          { "reference": "string", "text": "string", "note": "string" }
        ]
      }
      Only return valid JSON, no markdown blocks.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return NextResponse.json(JSON.parse(cleanJson));
    }

    if (type === 'commentary') {
      if (!reference) {
        return NextResponse.json({ error: 'Reference is required for commentary' }, { status: 400 });
      }

      const prompt = `You are a Bible commentary assistant drawing from Matthew Henry's Commentary and other classic evangelical commentaries. Provide a concise, insightful commentary on ${reference}. 
      Keep each section punchy, pastoral, and clear (2-3 sentences max per section).
      Return as structured JSON matching this TypeScript type:
      {
        "historicalContext": "string (2 sentences)",
        "keyThemes": ["string", "string", "string"],
        "originalLanguage": "string (key Greek/Hebrew word and meaning)",
        "crossReferences": ["string - quote", "string - quote", "string - quote"],
        "sermonApplication": "string (practical 2-sentence pastoral takeaway)"
      }
      Only return valid JSON, no markdown blocks.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return NextResponse.json(JSON.parse(cleanJson));
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Study API error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

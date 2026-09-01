import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const word = searchParams.get('word');
    const reference = searchParams.get('reference');

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    if (type === 'concordance') {
      if (!word) {
        return NextResponse.json({ error: 'Word is required for concordance' }, { status: 400 });
      }

      const prompt = `You are a Bible concordance. For the word '${word}', list the top 10 most significant Bible verses where this word appears. For each, provide: the reference, the verse text (KJV), and a one-line note about how the word is used in context. Also provide the Strong's number if applicable and the original Hebrew/Greek word with its meaning. Return as structured JSON matching this TypeScript type:
      {
        originalWord: string;
        strongsNumber: string;
        meaning: string;
        occurrences: { reference: string; text: string; note: string; }[]
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

      const prompt = `You are a Bible commentary assistant drawing from Matthew Henry's Commentary and other classic evangelical commentaries. Provide a thorough but concise commentary on ${reference}. Include: 1) Historical context, 2) Key themes, 3) Original language insights (Hebrew/Greek), 4) Cross-references (list 3-5 related passages), 5) Practical application for a sermon. Keep it pastoral and practical.
      Return as structured JSON matching this TypeScript type:
      {
        historicalContext: string;
        keyThemes: string[];
        originalLanguage: string;
        crossReferences: string[];
        sermonApplication: string;
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

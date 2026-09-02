import { NextResponse } from 'next/server';
const { GoogleGenerativeAI } = require('@google/generative-ai');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { situation, category } = body;

    if (!situation) {
      return NextResponse.json({ error: 'Situation is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const systemInstruction = `You are a pastoral counseling advisor assisting a pastor. 
Your goal is to provide concise, biblically sound, and practical guidance based on the situation provided.
Format your response clearly into the following sections:
- Relevant Scriptures: 3-5 references with brief context
- Key Talking Points: 3-4 points for the pastor to use
- Suggested Pastoral Approach: Practical advice on how to approach the conversation
- When/Whether to Refer to a Professional Counselor: Clear guidelines on when to seek outside help

Keep the tone pastoral, empathetic, and professional.`;

    const prompt = `${systemInstruction}\n\nSituation: ${situation}${category ? `\nCategory: ${category}` : ''}\n\nPlease provide guidance formatted in plain text.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error generating AI counsel:', error);
    return NextResponse.json({ error: 'Failed to generate guidance' }, { status: 500 });
  }
}

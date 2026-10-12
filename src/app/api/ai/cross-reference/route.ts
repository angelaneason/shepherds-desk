import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const { scripture, context } = await request.json();

    if (!scripture) {
      return NextResponse.json({ error: 'Scripture is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI key is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
      systemInstruction: 'You are a biblical cross-reference expert. Given a scripture passage, suggest 6-8 related passages. For each, provide the reference, a brief explanation of how it connects, and categorize the connection type. Format your response as a JSON array of objects with fields: reference (string), explanation (string), type (one of: parallel, contrast, fulfillment, context, application). Never use em dashes or en dashes. Return ONLY the JSON array.',
    });

    const promptContext = context ? `Context: ${context.substring(0, 1000)}\n\n` : '';
    const prompt = `${promptContext}Scripture: ${scripture}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let parsedData = JSON.parse(responseText);
    if (Array.isArray(parsedData)) {
      parsedData = parsedData.map((item) => ({
        ...item,
        reference: removeDashes(item.reference || ''),
        explanation: removeDashes(item.explanation || ''),
        type: item.type || 'parallel',
      }));
    }
    
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error generating cross references:', error);
    return NextResponse.json({ error: 'Failed to generate cross references' }, { status: 500 });
  }
}

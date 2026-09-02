import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getSystemPrompt = (action: string): string => {
  const base = `You are a warm, pastoral AI assistant called "Shepherd's Desk AI" helping a pastor prepare a sermon. Your goal is to help them organize and develop what God has placed on their heart. Respect their theological voice. Be encouraging, concise, and deeply practical. Do not add unnecessary disclaimers.`;

  switch (action) {
    case 'brainstorm_titles':
      return `${base}\n\nGenerate exactly 5 creative, compelling sermon title ideas. Number them 1-5. Keep them modern but theologically respectful. Each title should be on its own line with a brief one-sentence explanation.`;
    case 'generate_outline':
      return `${base}\n\nGenerate a structured 3-point sermon outline. Include: Introduction, three main points (each with a sub-explanation and suggested scripture), Application, and Closing. Use clear formatting with headers and bullet points.`;
    case 'find_illustrations':
      return `${base}\n\nProvide 3 modern, relatable illustrations or stories for the sermon point. Each should be vivid, contemporary, and easy for a congregation to connect with. Number them and give each a short title.`;
    case 'polish_text':
      return `${base}\n\nImprove the grammar, flow, and clarity of the provided text while strictly keeping the pastor's unique voice and pastoral tone. Return only the polished text without any explanation.`;
    case 'suggest_transitions':
      return `${base}\n\nSuggest 3 smooth, thoughtful transitions between sermon sections. Each should feel natural and help the congregation follow the flow of the message. Number them.`;
    case 'expand_point':
      return `${base}\n\nExpand the brief sermon point into a fuller, richer paragraph. Add pastoral depth, a practical application, and maintain the pastor's voice. Return only the expanded text.`;
    default:
      return base;
  }
};

export async function POST(request: Request) {
  try {
    const { action, context, selection } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured yet.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const systemPrompt = getSystemPrompt(action);
    const userContent = selection 
      ? `Focus on this text: "${selection}"\n\nFull sermon context: ${context || 'Not provided'}`
      : `Topic/Scripture: ${context || 'Not provided'}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
    });

    const responseText = result.response.text();
    return NextResponse.json({ result: responseText });
  } catch (error: any) {
    console.error('Error in AI route:', error?.message || error);
    return NextResponse.json({ error: "An error occurred while processing your request. Please try again." }, { status: 500 });
  }
}

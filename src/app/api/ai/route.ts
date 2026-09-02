import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getSystemPrompt = (action: string, pastorContext: string): string => {
  const base = `You are a warm, knowledgeable pastoral assistant called "Shepherd's Desk AI" helping a pastor prepare their message. Your goal is to help them organize and develop what God has placed on their heart. Respect their theological voice. Be encouraging, concise, vivid, and deeply practical. 

CRITICAL INSTRUCTIONS:
- NEVER include apologies, meta-commentary, or bracketed explanations (e.g., do NOT say "(I wasn't able to pull up your sermon archive...)" or "(I see we don't have your specific scripture...)").
- Directly deliver high-quality, inspiring, and theologically sound content.
- When scripture is given (e.g. John 3:16), tailor all titles, outlines, illustrations, and commentary specifically to that text.
- If the pastor's library contains related sermons, you may reference them naturally.

${pastorContext}`;

  switch (action) {
    case 'brainstorm_titles':
      return `${base}\n\nGenerate exactly 5 creative, compelling sermon title ideas for the provided passage/topic. Number them 1-5. Keep them modern but theologically rich. Each title should be on its own line with a brief one-sentence explanation.`;
    case 'generate_outline':
      return `${base}\n\nGenerate a structured 3-point sermon outline for the provided scripture/topic. Include: Introduction hook, three memorable main points (each with an explanation and supporting scripture), Practical Life Application, and a powerful Closing.`;
    case 'find_illustrations':
      return `${base}\n\nProvide 3 modern, vivid, and relatable illustrations or real-world stories specifically illustrating the given scripture or sermon point. Number them 1-3 with a title, core theme, and engaging narrative.`;
    case 'polish_text':
      return `${base}\n\nImprove the grammar, flow, and clarity of the provided text while strictly keeping the pastor's unique voice and pastoral tone. Return only the polished text without any explanation.`;
    case 'suggest_transitions':
      return `${base}\n\nSuggest 3 smooth, thoughtful verbal transitions between sermon sections. Each should feel natural and help the congregation follow the flow of the message. Number them.`;
    case 'expand_point':
      return `${base}\n\nExpand the brief sermon point into a fuller, richer paragraph. Add pastoral depth, a practical application, and maintain the pastor's voice. Return only the expanded text.`;
    case 'search_sermons':
      return `${base}\n\nThe pastor is searching their personal sermon library. Find and summarize relevant sermons and notes from their history that match the query.`;
    case 'custom':
      return `${base}\n\nRespond directly, pastorally, and thoroughly to the pastor's specific prompt or question. Provide biblical depth, practical sermon examples, cross-references, or study insights as requested.`;
    default:
      return base;
  }
};

async function getPastorContext(userId: string, currentTopic: string): Promise<string> {
  try {
    // Fetch recent sermons (last 50)
    const { data: sermons } = await (supabase
      .from('sermons')
      .select('id, title, subtitle, scripture_primary, status, content, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(50) as any);

    // Fetch ideas
    const { data: ideas } = await (supabase
      .from('ideas')
      .select('id, content, created_at')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(30) as any);

    let context = '';

    if (sermons && sermons.length > 0) {
      context += `\n--- PASTOR'S SERMON LIBRARY (${sermons.length} sermons) ---\n`;
      sermons.forEach((s: any, i: number) => {
        // Extract first 300 chars of content for context (strip HTML)
        const plainText = s.content 
          ? s.content.replace(/<[^>]*>/g, '').substring(0, 300) 
          : '';
        context += `${i + 1}. "${s.title}" ${s.scripture_primary ? `(${s.scripture_primary})` : ''} [${s.status}]`;
        if (s.subtitle) context += ` - ${s.subtitle}`;
        if (plainText) context += `\n   Preview: ${plainText}...`;
        context += '\n';
      });
    }

    if (ideas && ideas.length > 0) {
      context += `\n--- PASTOR'S IDEAS & NOTES (${ideas.length} ideas) ---\n`;
      ideas.forEach((idea: any, i: number) => {
        context += `${i + 1}. ${idea.content}\n`;
      });
    }

    if (!context) {
      context = '\n(No previous sermons or notes found in library yet)\n';
    }

    return context;
  } catch (error) {
    console.error('Error fetching pastor context:', error);
    return '\n(Could not load pastor\'s library)\n';
  }
}

export async function POST(request: Request) {
  try {
    const { action, context, selection, userId } = await request.json();

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI is not configured yet.' }, { status: 500 });
    }

    // Fetch pastor's sermon library for context
    const pastorContext = userId 
      ? await getPastorContext(userId, context || '') 
      : '';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const systemPrompt = getSystemPrompt(action, pastorContext);
    let userContent = '';
    if (action === 'custom') {
      userContent = `Pastor's Request: "${selection || context || 'Sermon preparation help'}"\n\nSermon Draft: ${context || 'None'}`;
    } else if (selection) {
      userContent = `Scripture / Focus Topic: "${selection}"\n\nSermon Draft: ${context || 'None'}`;
    } else if (context && context.trim()) {
      userContent = `Sermon Draft / Context: "${context}"`;
    } else {
      userContent = `General sermon preparation context.`;
    }

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

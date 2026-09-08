import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CATEGORY_PROMPTS: Record<string, string> = {
  encouragement: 'Send a warm, uplifting encouragement text to brighten their day and remind them that they are loved, prayed for, and appreciated.',
  hospital: 'Send a gentle, loving check-in for someone in the hospital, recovering from illness or surgery, letting them know the church and pastor are lifting them in prayer.',
  bereavement: 'Send a deeply tender, comforting message for someone walking through grief or loss, assuring them of God\'s closeness and our prayers.',
  missing_church: 'Send a warm, zero-guilt text saying we missed seeing them at church recently and just wanted to reach out, bless them, and see how they are doing.',
  prayer_followup: 'Follow up warmly on a prayer request they previously shared, asking how they are holding up and letting them know we continue to pray.',
  announcement: 'Condense the provided announcement/event into a clear, engaging, friendly text message to church members.',
  general: 'Send a caring pastoral check-in text asking how they are doing and letting them know they are in our prayers.'
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      recipientName, 
      category = 'general', 
      customPrompt = '', 
      pastorName = '', 
      churchName = '' 
    } = body;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const purpose = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.general;

    const systemPrompt = `You are a warm, genuine pastoral assistant for "The Shepherd's Desk". Your goal is to draft a personal, caring text message (SMS) that a pastor will send directly to a church member or attendee from their phone.

CRITICAL RULES:
1. Authentic Pastoral Voice: Warm, compassionate, conversational, and genuine. It must sound like a caring pastor texting a friend or church member, NOT like an automated marketing bot or stiff corporate email.
2. Conciseness: Keep it short! An SMS text message should ideally be 1 to 3 sentences (roughly 120-280 characters, maximum 320 characters).
3. No Placeholders: NEVER output bracketed placeholders like [Name], [Church], or [Your Name]. If recipient name is given ("${recipientName || ''}"), use their first name naturally. If pastor name is given ("${pastorName || ''}"), sign off with it (or "Pastor" / "Pastor Tiny" / "Pastor & Angie").
4. Emojis: Use 1-2 warm emojis naturally if appropriate (e.g. 🙏, 💛, ✝️), but keep it dignified.
5. Return ONLY the final text message itself. Do not include quotes, greetings like "Here is your text:", or any explanations.`;

    const userPrompt = `Compose an SMS text message.
Recipient: ${recipientName || 'Church Member'}
Purpose: ${purpose}
${customPrompt ? `Specific Pastor Notes / Situation: "${customPrompt}"` : ''}
${pastorName ? `Pastor's Name: ${pastorName}` : ''}
${churchName ? `Church: ${churchName}` : ''}

Write the SMS message now:`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    let text = result.response.text().trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1).trim();
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error generating pastoral text:', error);
    return NextResponse.json({ error: 'Failed to generate text message' }, { status: 500 });
  }
}

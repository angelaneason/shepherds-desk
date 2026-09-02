import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const today = new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[today.getDay()]
    const todayStr = today.toISOString().split('T')[0]

    const prompt = `You are a smart reminder parser for a pastoral ministry app. Parse the following spoken reminder into structured data.

Today is ${todayName}, ${todayStr}.

Input: "${text}"

Return ONLY valid JSON with these fields:
{
  "task": "the action to do (e.g., 'Call Sister Mary regarding her prayer request')",
  "person": "the person's name if mentioned, or null",
  "date": "YYYY-MM-DD format. If they say 'tomorrow', calculate it. If they say a day like 'Thursday', use the NEXT occurrence of that day. If they say 'next week', use 7 days from today. If no date mentioned, use tomorrow.",
  "time": "HH:MM in 24h format if a time is mentioned, or null",
  "category": "one of: call, visit, email, meeting, prayer, follow-up, personal, other",
  "priority": "urgent or normal",
  "createCalendarEvent": true,
  "createCareTask": true if it involves a person/ministry, false if personal
}

Be smart about date parsing. Examples:
- "Thursday" = next Thursday
- "this weekend" = next Saturday
- "in 3 days" = 3 days from today
- "next Monday" = the Monday after this coming one

Return ONLY the JSON, no markdown, no backticks.`

    const result = await model.generateContent(prompt)
    const response = result.response.text().trim()
    
    // Try to parse the JSON, stripping any markdown if present
    let cleanJson = response
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```$/g, '').trim()
    }
    
    const parsed = JSON.parse(cleanJson)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Reminder parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse reminder' },
      { status: 500 }
    )
  }
}

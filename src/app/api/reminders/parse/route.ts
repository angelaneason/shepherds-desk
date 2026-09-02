import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

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
  "time": "HH:MM in 24h LOCAL time if a specific START time is mentioned. Return null if NO specific time is mentioned.",
  "endTime": "HH:MM in 24h LOCAL time if a specific END time or duration is mentioned. If they say '2 hours', add 2 hours to the start time. Return null if not mentioned.",
  "category": "one of: call, visit, hospital, study, other",
  "priority": "urgent or normal",
  "isStudyTime": true if the reminder is about studying, sermon prep, devotion, reading, Bible study, preparation time, or blocking off study/prep time. false otherwise,
  "createCalendarEvent": true,
  "createCareTask": true if it involves a person or ministry task. false if it's study time or purely personal
}

IMPORTANT about time:
- If the user says "at 8 AM", return time: "08:00"
- If the user says "at 2 PM", return time: "14:00"  
- If the user says "from 6 to 8 AM", return time: "06:00" and endTime: "08:00"
- If the user says "for 2 hours starting at 9", return time: "09:00" and endTime: "11:00"
- If the user says "in the morning", return time: "09:00"
- If the user says "in the evening", return time: "18:00"
- If NO time is mentioned at all, return null
- The time should be in the user's LOCAL time, not UTC

IMPORTANT about study time:
- "block study time", "schedule study time", "sermon prep", "study for my sermon", "devotion time", "reading time", "preparation time" = isStudyTime: true, category: "study"
- Study time requests should ALWAYS have createCareTask: false

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

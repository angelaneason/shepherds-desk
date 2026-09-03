import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { sermonTitle, sermonContent, scripture, days } = await request.json()

    if (!sermonTitle || !days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '')
    const systemPrompt = `You are a pastoral devotional writer. Given a sermon title, content, and scripture, create a ${days}-day devotional plan. Each day should have: a title, a scripture reading reference, 2-3 paragraphs of devotional text in a warm pastoral tone, a reflection question, and a brief prayer prompt. Format your response as a JSON array of objects with fields: day (number), title (string), scripture (string), text (string), question (string), prayer (string). Return ONLY the JSON array, no markdown fencing.`
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    })

    const prompt = `Sermon Title: ${sermonTitle}\n\n${scripture ? `Scripture: ${scripture}\n\n` : ''}${sermonContent ? `Sermon Content:\n${sermonContent}` : 'Generate based on the sermon title.'}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Remove markdown fencing if accidentally included
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsedData = JSON.parse(cleanedText)
    
    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('Error generating devotional:', error)
    return NextResponse.json({ error: 'Failed to generate devotional' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: Request) {
  try {
    const { scripture, context } = await request.json()

    if (!scripture) {
      return NextResponse.json({ error: 'Scripture is required' }, { status: 400 })
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      systemInstruction: 'You are a biblical cross-reference expert. Given a scripture passage, suggest 6-8 related passages. For each, provide the reference, a brief explanation of how it connects, and categorize the connection type. Format your response as a JSON array of objects with fields: reference (string), explanation (string), type (one of: parallel, contrast, fulfillment, context, application). Return ONLY the JSON array, no markdown fencing.'
    })

    const promptContext = context ? `Context: ${context}\n\n` : ''
    const prompt = `${promptContext}Scripture: ${scripture}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    // Remove markdown fencing if accidentally included by the model
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim()
    const parsedData = JSON.parse(cleanedText)
    
    return NextResponse.json(parsedData)
  } catch (error: any) {
    console.error('Error generating cross references:', error)
    return NextResponse.json({ error: 'Failed to generate cross references' }, { status: 500 })
  }
}

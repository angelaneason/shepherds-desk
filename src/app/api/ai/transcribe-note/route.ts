import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 })
    }

    // Determine MIME type
    let mimeType = file.type || 'audio/m4a'
    const fileName = file.name ? file.name.toLowerCase() : ''
    if (fileName.endsWith('.mp3')) mimeType = 'audio/mp3'
    else if (fileName.endsWith('.m4a')) mimeType = 'audio/m4a'
    else if (fileName.endsWith('.wav')) mimeType = 'audio/wav'
    else if (fileName.endsWith('.webm')) mimeType = 'audio/webm'
    else if (fileName.endsWith('.ogg')) mimeType = 'audio/ogg'
    else if (fileName.endsWith('.aac')) mimeType = 'audio/aac'

    const base64Audio = buffer.toString('base64')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a pastoral transcription assistant for "The Shepherd's Desk" mobile app.
Listen to this short voice note and transcribe the spoken words accurately.
Use proper biblical and pastoral capitalization where appropriate (e.g. God, Jesus, Holy Spirit, Scripture, Lord).
Return ONLY the clean transcribed text with proper punctuation. Do NOT include markdown fences, quotes, notes, or explanations.`

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      prompt,
    ])

    const transcript = response.response.text().trim()

    return NextResponse.json({
      success: true,
      text: transcript,
    })
  } catch (error: any) {
    console.error('Error transcribing voice note:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to transcribe voice note.',
      },
      { status: 500 }
    )
  }
}

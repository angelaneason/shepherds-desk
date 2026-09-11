import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 120 // Allow up to 2 minutes for processing long audio files

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
      return NextResponse.json({ error: 'No audio file was provided.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Verify file is not empty
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The provided audio file is empty.' }, { status: 400 })
    }

    // 50MB limit check
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file exceeds the 50MB upload limit. Please trim or compress the audio.' },
        { status: 400 }
      )
    }

    // Determine MIME type
    let mimeType = file.type || 'audio/mp3'
    const fileName = file.name ? file.name.toLowerCase() : ''
    if (fileName.endsWith('.mp3')) mimeType = 'audio/mp3'
    else if (fileName.endsWith('.m4a')) mimeType = 'audio/m4a'
    else if (fileName.endsWith('.wav')) mimeType = 'audio/wav'
    else if (fileName.endsWith('.webm')) mimeType = 'audio/webm'
    else if (fileName.endsWith('.ogg')) mimeType = 'audio/ogg'
    else if (fileName.endsWith('.aac')) mimeType = 'audio/aac'

    const base64Audio = buffer.toString('base64')

    const genAI = new GoogleGenerativeAI(apiKey)
    // Use gemini-2.5-flash or gemini-2.0-flash / gemini-1.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `
You are an expert pastoral assistant, theologian, and sermon transcription specialist for "The Shepherd's Desk".
Listen carefully to this sermon audio recording and generate a comprehensive, structured pastoral analysis.

You MUST respond ONLY with a valid JSON object (no markdown code blocks, no backticks, no text before or after).
The JSON object must have the following exact schema:

{
  "title": "A compelling, biblical title for this sermon",
  "scriptures": ["List of all biblical Scripture references cited or preached, e.g. Romans 8:28, Isaiah 40:31"],
  "summary": "A warm, pastoral 2-3 paragraph executive summary of the central message and heart of the sermon.",
  "outline": [
    {
      "point": "Main Point 1 Title",
      "explanation": "Brief theological and practical explanation of this point",
      "scripture": "Optional supporting Scripture reference"
    }
  ],
  "keyQuotes": [
    "Memorable quotes, illustrations, or powerful one-liners spoken in the message"
  ],
  "transcript": "The complete, clean, punctuated word-for-word transcript of the sermon audio."
}
`

    const response = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      },
      prompt,
    ])

    const responseText = response.response.text()

    // Clean JSON response (strip markdown fences if model returned them)
    let cleanedJson = responseText.trim()
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    }

    try {
      const parsedData = JSON.parse(cleanedJson)
      return NextResponse.json({
        success: true,
        data: {
          title: parsedData.title || file.name.replace(/\.[^/.]+$/, '') || 'Untitled Sermon',
          scriptures: Array.isArray(parsedData.scriptures) ? parsedData.scriptures : [],
          summary: parsedData.summary || '',
          outline: Array.isArray(parsedData.outline) ? parsedData.outline : [],
          keyQuotes: Array.isArray(parsedData.keyQuotes) ? parsedData.keyQuotes : [],
          transcript: parsedData.transcript || responseText,
        },
      })
    } catch (jsonErr) {
      console.warn('Failed to parse structured JSON from Gemini, returning fallback text:', jsonErr)
      // Fallback if model returned plain text transcript
      return NextResponse.json({
        success: true,
        data: {
          title: file.name.replace(/\.[^/.]+$/, '') || 'Transcribed Sermon',
          scriptures: [],
          summary: 'Transcribed audio recording.',
          outline: [],
          keyQuotes: [],
          transcript: responseText,
        },
      })
    }
  } catch (error: any) {
    console.error('Error transcribing sermon audio:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to transcribe sermon audio. Please verify your audio format.',
      },
      { status: 500 }
    )
  }
}

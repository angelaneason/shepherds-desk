import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager } from '@google/generative-ai/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export const maxDuration = 120 // Allow up to 2 minutes for processing long audio files

export async function POST(request: NextRequest) {
  let storagePathToDelete: string | null = null
  let adminSupabase: any = null

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured on the server.' },
        { status: 500 }
      )
    }

    let buffer: Buffer
    let mimeType = 'audio/m4a'
    let originalName = 'sermon_audio'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      const storagePath = body?.storagePath
      if (!storagePath) {
        return NextResponse.json({ error: 'No storagePath provided.' }, { status: 400 })
      }

      storagePathToDelete = storagePath
      adminSupabase = createAdminSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: fileData, error: downloadError } = await adminSupabase.storage
        .from('sermon-audio')
        .download(storagePath)

      if (downloadError || !fileData) {
        console.error('Storage download error:', downloadError)
        return NextResponse.json(
          { error: `Could not retrieve audio from storage: ${downloadError?.message || 'File missing'}` },
          { status: 400 }
        )
      }

      const arrayBuffer = await fileData.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      originalName = storagePath.split('/').pop() || 'sermon_audio'

      const lower = storagePath.toLowerCase()
      if (lower.endsWith('.mp3')) mimeType = 'audio/mp3'
      else if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) mimeType = 'audio/mp4'
      else if (lower.endsWith('.wav')) mimeType = 'audio/wav'
      else if (lower.endsWith('.webm')) mimeType = 'audio/webm'
      else if (lower.endsWith('.ogg')) mimeType = 'audio/ogg'
      else if (lower.endsWith('.aac')) mimeType = 'audio/aac'
    } else {
      // Fallback for multipart form uploads (< 4MB)
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No audio file was provided.' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      originalName = file.name || 'sermon_audio'

      mimeType = file.type || 'audio/mp3'
      const lower = originalName.toLowerCase()
      if (lower.endsWith('.mp3')) mimeType = 'audio/mp3'
      else if (lower.endsWith('.m4a') || lower.endsWith('.mp4')) mimeType = 'audio/mp4'
      else if (lower.endsWith('.wav')) mimeType = 'audio/wav'
      else if (lower.endsWith('.webm')) mimeType = 'audio/webm'
      else if (lower.endsWith('.ogg')) mimeType = 'audio/ogg'
      else if (lower.endsWith('.aac')) mimeType = 'audio/aac'
    }

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'The provided audio file is empty.' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (buffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Audio file exceeds the 50MB upload limit. Please trim or compress the audio.' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const prompt = `
You are an expert pastoral assistant, theologian, and sermon transcription specialist for "The Shepherd's Desk".
Listen carefully to this sermon audio recording and generate a comprehensive, structured pastoral analysis.

CRITICAL WRITING RULE:
Never use em dashes or en dashes anywhere in the output. Real people rarely type them. Use commas, colons, periods, or the word "and" instead. Plain hyphens (-) are only allowed inside words or Scripture ranges like "Romans 8:28-30".

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

    let responseText = ''

    // If audio is over 15MB, use Google AI File Manager to avoid inline base64 memory limits
    if (buffer.length > 15 * 1024 * 1024) {
      const fileManager = new GoogleAIFileManager(apiKey)
      const ext = mimeType.split('/')[1] || 'm4a'
      const tempPath = path.join(os.tmpdir(), `sermon-${Date.now()}.${ext}`)
      await fs.writeFile(tempPath, buffer)

      let uploadedFile: any = null
      try {
        const uploadResult = await fileManager.uploadFile(tempPath, {
          mimeType,
          displayName: 'Sermon Audio',
        })
        uploadedFile = uploadResult.file

        const response = await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.mimeType,
              fileUri: uploadedFile.uri,
            },
          },
          prompt,
        ])
        responseText = response.response.text()
      } finally {
        await fs.unlink(tempPath).catch(() => {})
        if (uploadedFile?.name) {
          fileManager.deleteFile(uploadedFile.name).catch(() => {})
        }
      }
    } else {
      const base64Audio = buffer.toString('base64')
      const response = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64Audio,
          },
        },
        prompt,
      ])
      responseText = response.response.text()
    }

    // Clean JSON response (strip markdown fences if model returned them)
    let cleanedJson = responseText.trim()
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    }

    // Strictly enforce no em dashes or en dashes from AI response
    cleanedJson = cleanedJson.replace(/[\u2014\u2013]/g, ', ')

    try {
      const parsedData = JSON.parse(cleanedJson)
      return NextResponse.json({
        success: true,
        data: {
          title: parsedData.title || originalName.replace(/\.[^/.]+$/, '') || 'Untitled Sermon',
          scriptures: Array.isArray(parsedData.scriptures) ? parsedData.scriptures : [],
          summary: parsedData.summary || '',
          outline: Array.isArray(parsedData.outline) ? parsedData.outline : [],
          keyQuotes: Array.isArray(parsedData.keyQuotes) ? parsedData.keyQuotes : [],
          transcript: parsedData.transcript || responseText,
        },
      })
    } catch (jsonErr) {
      console.warn('Failed to parse structured JSON from Gemini, returning fallback text:', jsonErr)
      return NextResponse.json({
        success: true,
        data: {
          title: originalName.replace(/\.[^/.]+$/, '') || 'Transcribed Sermon',
          scriptures: [],
          summary: 'Transcribed audio recording.',
          outline: [],
          keyQuotes: [],
          transcript: responseText.replace(/[\u2014\u2013]/g, ', '),
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
  } finally {
    // Delete temporary file from Supabase storage if it was uploaded via storagePath
    if (storagePathToDelete && adminSupabase) {
      adminSupabase.storage
        .from('sermon-audio')
        .remove([storagePathToDelete])
        .catch((err: any) => console.warn('Could not clean up temporary storage file:', err))
    }
  }
}

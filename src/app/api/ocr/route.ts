import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64String = buffer.toString('base64')

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const prompt = "You are an expert OCR system for a pastoral note-taking app called Shepherd's Desk. Extract all text from this image accurately. This is likely a handwritten sermon. Preserve paragraph breaks, maintain sermon structure (introduction, points, conclusion). Handle handwriting variations and preserve scripture references carefully. Clean up but don't rewrite - keep the pastor's original words. Return ONLY the extracted text with no additional commentary or explanation."

    const imageParts = [
      {
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      },
    ]

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

    // Estimate confidence
    // We can do a very rough heuristic here, or always return 'high' if there are no errors.
    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (text.includes('[unclear]') || text.includes('[?]')) {
      confidence = 'medium'
    }
    if (text.trim().length === 0) {
      confidence = 'low'
    }

    return NextResponse.json({ text, confidence })
  } catch (error) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { error: 'Failed to process image for text extraction' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileType = file.type
    const fileName = file.name.toLowerCase()

    // Handle plain text files directly
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const text = buffer.toString('utf-8')
      return NextResponse.json({ text, confidence: 'high' as const })
    }

    // Handle DOCX files with mammoth
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer })
      return NextResponse.json({ text: result.value, confidence: 'high' as const })
    }

    // Handle DOC files with mammoth (best effort)
    if (
      fileType === 'application/msword' ||
      fileName.endsWith('.doc')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer })
        return NextResponse.json({ text: result.value, confidence: 'medium' as const })
      } catch {
        // Fall through to Gemini AI if mammoth can't handle it
      }
    }

    // Handle RTF files - extract text by stripping RTF formatting
    if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
      const rtfContent = buffer.toString('utf-8')
      // Basic RTF text extraction - strip control words
      const text = rtfContent
        .replace(/\\[a-z]+\d*\s?/gi, '')
        .replace(/[{}]/g, '')
        .replace(/\\\\/g, '\\')
        .replace(/\\'/[0-9a-f]{2}/gi, '')
        .trim()
      return NextResponse.json({ text, confidence: 'medium' as const })
    }

    // Handle images and PDFs with Gemini AI
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    const base64String = buffer.toString('base64')

    const prompt = isPDF
      ? "You are an expert OCR system for a pastoral note-taking app called Shepherd's Desk. Extract ALL text from EVERY PAGE of this PDF accurately. This is likely a typed or handwritten sermon. Preserve paragraph breaks, maintain sermon structure (introduction, points, conclusion). Preserve scripture references carefully. Clean up but don't rewrite - keep the pastor's original words. Process ALL pages in order. Return ONLY the extracted text with no additional commentary, page numbers, or explanation."
      : "You are an expert OCR system for a pastoral note-taking app called Shepherd's Desk. Extract all text from this image accurately. This is likely a handwritten sermon. Preserve paragraph breaks, maintain sermon structure (introduction, points, conclusion). Handle handwriting variations and preserve scripture references carefully. Clean up but don't rewrite - keep the pastor's original words. Return ONLY the extracted text with no additional commentary or explanation."

    const imageParts = [
      {
        inlineData: {
          data: base64String,
          mimeType: fileType,
        },
      },
    ]

    const result = await model.generateContent([prompt, ...imageParts])
    const response = await result.response
    const text = response.text()

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
      { error: 'Failed to process file for text extraction' },
      { status: 500 }
    )
  }
}

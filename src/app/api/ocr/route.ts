import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import mammoth from 'mammoth'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    let buffer: Buffer
    let fileType = 'image/jpeg'
    let fileName = 'photo.jpg'

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const json = await request.json()
      const base64Data = json.base64 || json.image
      if (!base64Data) {
        return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
      }
      buffer = Buffer.from(base64Data, 'base64')
      fileType = json.mimeType || 'image/jpeg'
      fileName = (json.fileName || 'photo.jpg').toLowerCase()
    } else {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      buffer = Buffer.from(bytes)
      fileType = file.type || 'image/jpeg'
      fileName = (file.name || 'photo.jpg').toLowerCase()
    }

    // Handle plain text files directly
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      const text = buffer.toString('utf-8').replace(/[\u2014\u2013]/g, ', ')
      return NextResponse.json({ text, confidence: 'high' as const })
    }

    // Handle DOCX files with mammoth
    if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value.replace(/[\u2014\u2013]/g, ', ')
      return NextResponse.json({ text, confidence: 'high' as const })
    }

    // Handle DOC files with mammoth (best effort)
    if (
      fileType === 'application/msword' ||
      fileName.endsWith('.doc')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer })
        const text = result.value.replace(/[\u2014\u2013]/g, ', ')
        return NextResponse.json({ text, confidence: 'medium' as const })
      } catch {
        // Fall through to Gemini AI if mammoth cannot handle it
      }
    }

    // Handle RTF files: extract text by stripping RTF formatting
    if (fileType === 'application/rtf' || fileName.endsWith('.rtf')) {
      const rtfContent = buffer.toString('utf-8')
      const text = rtfContent
        .replace(/\{\\[^{}]*\}/g, '')
        .replace(/\\[a-z]+\d*\s?/gi, '')
        .replace(/[{}]/g, '')
        .replace(/\\\\/g, '\\')
        .replace(/[\u2014\u2013]/g, ', ')
        .trim()
      return NextResponse.json({ text, confidence: 'medium' as const })
    }

    // Handle images and PDFs with Gemini AI
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 })
    }

    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf')
    if (!isPDF) {
      if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) fileType = 'image/jpeg'
      else if (fileName.endsWith('.png')) fileType = 'image/png'
      else if (fileName.endsWith('.webp')) fileType = 'image/webp'
      else if (fileName.endsWith('.heic')) fileType = 'image/heic'
      else if (!fileType.startsWith('image/')) fileType = 'image/jpeg'
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const base64String = buffer.toString('base64')

    const prompt = isPDF
      ? "You are an expert OCR system for a pastoral note-taking app called Shepherd's Desk. Extract ALL text from EVERY PAGE of this PDF accurately. This is likely a typed or handwritten sermon. Preserve paragraph breaks, maintain sermon structure (introduction, points, conclusion). Preserve scripture references carefully. Clean up but do not rewrite: keep the pastor's original words. Never use em dashes or en dashes. Process ALL pages in order. Return ONLY the extracted text with no additional commentary, page numbers, or explanation."
      : "You are an expert OCR system for a pastoral note-taking app called Shepherd's Desk. Extract all text from this image accurately. This is likely a handwritten sermon or book page. Preserve paragraph breaks, maintain sermon structure (introduction, points, conclusion). Handle handwriting variations and preserve scripture references carefully. Clean up but do not rewrite: keep the pastor's original words. Never use em dashes or en dashes. Return ONLY the extracted text with no additional commentary or explanation."

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
    let text = response.text()

    // Strictly enforce no em dashes or en dashes from output
    text = text.replace(/[\u2014\u2013]/g, ', ')

    let confidence: 'high' | 'medium' | 'low' = 'high'
    if (text.includes('[unclear]') || text.includes('[?]')) {
      confidence = 'medium'
    }
    if (text.trim().length === 0) {
      confidence = 'low'
    }

    return NextResponse.json({ text, confidence })
  } catch (error: any) {
    console.error('OCR Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process file for text extraction' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const translation = searchParams.get('translation') || 'kjv';

    if (!reference) {
      return NextResponse.json({ error: 'Bible reference is required' }, { status: 400 });
    }

    // Fetch from free bible-api.com
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=${encodeURIComponent(translation)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Passage not found. Please check the reference.' }, { status: 404 });
      }
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      reference: data.reference,
      text: data.text.trim(),
      translation: data.translation_name || translation.toUpperCase(),
    });
  } catch (error) {
    console.error('Error fetching bible verse:', error);
    return NextResponse.json({ error: "Failed to fetch the Bible verse. Please try again." }, { status: 500 });
  }
}

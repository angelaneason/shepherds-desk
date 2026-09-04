import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// National 24/7 Crisis Lifelines
const NATIONAL_LIFELINES = [
  {
    id: 'lifeline-988',
    title: '988 Suicide & Crisis Lifeline',
    category: 'crisis_hotline',
    phone: '988',
    website: 'https://988lifeline.org',
    hours: '24/7 / Free & Confidential',
    content: 'Free and confidential support for anyone experiencing mental health-related distress, thoughts of suicide, or emotional crisis. Available by call or text nationwide.',
    isLifeline: true,
  },
  {
    id: 'lifeline-dv',
    title: 'National Domestic Violence Hotline',
    category: 'crisis_hotline',
    phone: '1-800-799-7233',
    website: 'https://www.thehotline.org',
    hours: '24/7 / Free & Confidential',
    content: '24/7 confidential support, crisis intervention, safety planning, and local shelter referrals for anyone affected by domestic violence or relationship abuse.',
    isLifeline: true,
  },
  {
    id: 'lifeline-samhsa',
    title: 'SAMHSA National Helpline',
    category: 'mental_health',
    phone: '1-800-662-4357',
    website: 'https://www.samhsa.gov/find-help/national-helpline',
    hours: '24/7 / 365 Days a Year',
    content: 'Free, confidential, 24/7 treatment referral and information service (in English and Spanish) for individuals facing mental health or substance use disorders.',
    isLifeline: true,
  },
  {
    id: 'lifeline-childhelp',
    title: 'Childhelp National Child Abuse Hotline',
    category: 'crisis_hotline',
    phone: '1-800-422-4453',
    website: 'https://www.childhelphotline.org',
    hours: '24/7 / Dedicated Crisis Counselors',
    content: 'Dedicated to the prevention and treatment of child abuse. Offers crisis intervention, information, and referrals to supporting organizations.',
    isLifeline: true,
  },
];

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// In-memory cache for fast sub-second repeat queries (7-day TTL)
const communityCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeCategory(cat: string, titleAndContent: string): string {
  const lower = (cat || '').toLowerCase().replace(/[- ]/g, '_');
  if (['food_pantry', 'shelter', 'housing', 'medical', 'crisis_hotline', 'mental_health', 'legal_aid'].includes(lower)) {
    return lower;
  }
  const t = titleAndContent.toLowerCase();
  if (t.includes('food') || t.includes('pantry') || t.includes('meal') || t.includes('grocer')) return 'food_pantry';
  if (t.includes('shelter') || t.includes('unhoused') || t.includes('homeless')) return 'shelter';
  if (t.includes('housing') || t.includes('rent') || t.includes('utility')) return 'housing';
  if (t.includes('clinic') || t.includes('medical') || t.includes('doctor') || t.includes('health')) return 'medical';
  if (t.includes('mental') || t.includes('counsel') || t.includes('therapy')) return 'mental_health';
  if (t.includes('legal') || t.includes('court') || t.includes('law')) return 'legal_aid';
  if (t.includes('hotline') || t.includes('crisis') || t.includes('suicide') || t.includes('abuse')) return 'crisis_hotline';
  return 'community';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const zip = (searchParams.get('zip') || '76018').trim();
    const category = (searchParams.get('category') || 'all').trim();
    const radius = (searchParams.get('radius') || '10').trim();

    // Check cache: ONLY return if non-empty
    const cacheKey = `${zip}_${category}_${radius}`;
    const cached = communityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data?.resources?.length > 0) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    // 1. If 211 National Data Platform API Key is configured, attempt 2-1-1 first
    const twoOneOneKey = process.env.TWO_ONE_ONE_API_KEY;
    if (twoOneOneKey) {
      try {
        const response = await fetch(`https://api.211.org/v2/search?Location=${encodeURIComponent(zip)}&Keyword=${encodeURIComponent(category === 'all' ? 'emergency assistance' : category)}`, {
          headers: {
            'Ocp-Apim-Subscription-Key': twoOneOneKey,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && (Array.isArray(data) || Array.isArray(data.results))) {
            const rawList = Array.isArray(data) ? data : data.results;
            const formatted211 = rawList.map((item: any, idx: number) => ({
              id: `211-${item.id || idx}`,
              title: item.name || item.agencyName || 'Community Resource',
              category: category === 'all' ? 'community' : category,
              address: item.address || item.physicalAddress || '',
              phone: item.phone || item.primaryPhone || '',
              website: item.website || item.url || '',
              hours: item.hours || '',
              content: item.description || item.serviceDescription || '',
              source: '211',
              isLocal: true
            }));

            return NextResponse.json({
              zip,
              source: '211_platform',
              lifelines: filterLifelines(category),
              resources: formatted211
            });
          }
        }
      } catch (e211) {
        console.warn('2-1-1 API query failed or fallback needed:', e211);
      }
    }

    // 2. Google Search Grounding with Gemini 3.6 Flash
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        zip,
        source: 'static_lifelines',
        lifelines: filterLifelines(category),
        resources: [] 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      tools: [{ googleSearch: {} }]
    });

    const categoryText = category === 'all' 
      ? 'food pantries, emergency shelters, utility assistance, housing assistance, free medical clinics, and crisis charities' 
      : category.replace(/_/g, ' ');

    const prompt = `You are a specialized community resource locator assisting pastors and church care teams.
Task: Find 6 to 8 real, verified, currently operating non-profit community assistance organizations, food pantries, emergency shelters, utility assistance charities, or free medical clinics physically located within a ${radius}-mile radius of ZIP code ${zip}.
Service focus: ${categoryText}.

Format your response as ONLY a valid raw JSON array of objects. Do not wrap in markdown code blocks, backticks, or write any conversational introduction or conclusion.
Each JSON object must have these exact keys:
- "title": organization or program name (e.g. "Arlington Charities Food Pantry")
- "category": choose the most accurate single value from: ["food_pantry", "shelter", "housing", "medical", "crisis_hotline", "mental_health", "community"]
- "address": physical street address with city, state, and zip code
- "phone": main contact phone number formatted with area code
- "website": full official website URL or empty string
- "hours": operating, intake, or distribution hours if known
- "content": 1-2 practical sentences explaining who they help (e.g. eligibility or distribution rules) and what services they offer to neighbors in need.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    });
    let rawText = result.response.text().trim();

    // Clean any accidental markdown backticks
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let discoveredResources: any[] = [];
    try {
      discoveredResources = JSON.parse(rawText);
      if (!Array.isArray(discoveredResources)) {
        discoveredResources = [];
      }
    } catch (parseErr) {
      const match = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        try {
          discoveredResources = JSON.parse(match[0]);
        } catch {
          discoveredResources = [];
        }
      }
    }

    const formatted = discoveredResources.map((item, idx) => {
      const normCat = normalizeCategory(item.category, `${item.title || ''} ${item.content || ''}`);
      return {
        id: `local-${zip}-${idx}-${Date.now()}`,
        title: item.title || 'Community Resource',
        category: normCat,
        address: item.address || '',
        phone: item.phone || '',
        website: item.website || '',
        hours: item.hours || '',
        content: item.content || '',
        source: 'google_grounded',
        isLocal: true,
      };
    });

    const responsePayload = {
      zip,
      radius: `${radius} miles`,
      source: 'google_grounded',
      lifelines: filterLifelines(category),
      resources: formatted,
    };

    // Cache ONLY if non-empty
    if (formatted.length > 0) {
      communityCache.set(cacheKey, {
        timestamp: Date.now(),
        data: responsePayload,
      });
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Community resources API error:', error?.message || error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch community resources',
        lifelines: NATIONAL_LIFELINES,
        resources: [] 
      },
      { status: 500 }
    );
  }
}

function filterLifelines(category: string) {
  if (category === 'all') return NATIONAL_LIFELINES;
  if (category === 'crisis_hotline') return NATIONAL_LIFELINES;
  if (category === 'mental_health') return NATIONAL_LIFELINES.filter(l => l.category === 'mental_health' || l.id === 'lifeline-988');
  return [];
}

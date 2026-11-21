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

// In-memory cache for fast sub-second repeat queries
const communityCache = new Map<string, { timestamp: number; ttlMs: number; data: any }>();
const CACHE_TTL_VERIFIED_MS = 1000 * 60 * 60 * 24 * 7; // 7 days for 2-1-1 & Google-grounded
const CACHE_TTL_AI_MS = 1000 * 60 * 60 * 24; // 24 hours for AI directory fallback

// Skip repeated failing Google Search grounding roundtrips during quota cooldown
let groundingCooldownUntil = 0;
const GROUNDING_COOLDOWN_MS = 1000 * 60 * 15;

function sanitizeText(text: unknown, isScheduleOrLabel = false): string {
  if (typeof text !== 'string' || !text) return '';
  if (isScheduleOrLabel) {
    return text.replace(/[–—]/g, '-').trim();
  }
  return text
    .replace(/(\d|AM|PM|am|pm|Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*[–—]\s*(\d|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/g, '$1-$2')
    .replace(/\s*[–—]+\s*/g, ', ')
    .replace(/,\s*([,.!?])/g, '$1')
    .replace(/^,\s*/, '')
    .trim();
}

function parseResourcesJson(rawText: string): any[] {
  let cleaned = rawText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  const filterValid = (items: unknown): any[] => {
    if (!Array.isArray(items)) return [];
    return items.filter(
      (item): item is Record<string, any> =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as Record<string, any>).title === 'string' &&
        (item as Record<string, any>).title.trim().length > 0
    );
  };

  try {
    const direct = filterValid(JSON.parse(cleaned));
    if (direct.length > 0) return direct;
  } catch {
    // Fall through to bracket extraction
  }

  const startIdx = cleaned.indexOf('[');
  const endIdx = cleaned.lastIndexOf(']');
  if (startIdx !== -1 && endIdx > startIdx) {
    try {
      const sliced = filterValid(JSON.parse(cleaned.substring(startIdx, endIdx + 1)));
      if (sliced.length > 0) return sliced;
    } catch {
      console.warn('Direct JSON parse failed, falling back to object extraction');
    }
  }

  const objectMatches = cleaned.match(/\{[\s\S]*?"title"[\s\S]*?\}/g) || [];
  const extracted = objectMatches
    .map((objStr) => {
      try {
        return JSON.parse(objStr);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return filterValid(extracted);
}

function buildCommunityPrompt(zip: string, radius: string, category: string): string {
  const categoryText =
    category === 'all'
      ? 'food pantries, emergency shelters, housing and utility assistance, free or sliding-scale medical clinics, mental health support, legal aid, and local 2-1-1 or community assistance centers'
      : category.replace(/_/g, ' ');

  return `You are a specialized community resource locator assisting pastors and church care teams.
Task: Find 6 to 8 real, well-established, currently operating non-profit organizations physically located in or directly serving ZIP code ${zip} within a ${radius}-mile radius.
Service focus: ${categoryText}.

Accuracy & Style Rules:
- Do NOT fabricate street addresses, phone numbers, or website URLs. If you are not certain of an address, phone number, or URL, leave that field as an empty string "".
- Never use em dashes (—) or en dashes (–). Use commas, periods, colons, or plain hyphens (-) only in phone numbers, words, or ranges like "Mon-Fri 9:00 AM - 5:00 PM".

Format your response as ONLY a valid raw JSON array of objects. Do not wrap in markdown code blocks, backticks, or write any conversational introduction or conclusion.
Each JSON object must have these exact keys:
- "title": organization or program name (e.g. "Arlington Charities Food Pantry")
- "category": choose the most accurate single value from: ["food_pantry", "shelter", "housing", "medical", "crisis_hotline", "mental_health", "legal_aid", "community"]
- "address": physical street address with city, state, and zip code (or "" if uncertain)
- "phone": main contact phone number formatted with area code (or "" if uncertain)
- "website": full official website URL or empty string ""
- "hours": operating, intake, or distribution hours if known (or "" if uncertain)
- "content": 1-2 practical sentences explaining who they help (e.g. eligibility or distribution rules) and what services they offer to neighbors in need.`;
}

function formatGeminiResources(discoveredResources: any[], zip: string, source: 'google_grounded' | 'ai_directory') {
  const stamp = Date.now();
  return discoveredResources.map((item, idx) => {
    const title = sanitizeText(item.title, true) || 'Community Resource';
    const content = sanitizeText(item.content, false);
    const normCat = normalizeCategory(item.category, `${title} ${content}`);
    return {
      id: `local-${zip}-${idx}-${stamp}`,
      title,
      category: normCat,
      address: sanitizeText(item.address, true),
      phone: sanitizeText(item.phone, true),
      website: typeof item.website === 'string' ? item.website.trim() : '',
      hours: sanitizeText(item.hours, true),
      content,
      source,
      isLocal: true,
    };
  });
}

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
  let category = 'all';
  try {
    const { searchParams } = new URL(req.url);
    const zip = (searchParams.get('zip') || '76018').trim();
    category = (searchParams.get('category') || 'all').trim();
    const radius = (searchParams.get('radius') || '10').trim();

    // Check cache: ONLY return if non-empty and within TTL
    const cacheKey = `${zip}_${category}_${radius}`;
    const cached = communityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttlMs && cached.data?.resources?.length > 0) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
      });
    }

    // 1. If 211 National Data Platform API Key is configured, attempt official 2-1-1 Search V2
    const twoOneOneKey = process.env.TWO_ONE_ONE_API_KEY;
    if (twoOneOneKey) {
      try {
        const keyword = category === 'all' ? 'food shelter assistance' : category.replace(/_/g, ' ');
        const url = `https://api.211.org/resources/v2/search/keyword?location=${encodeURIComponent(zip)}&keywords=${encodeURIComponent(keyword)}`;
        
        const response = await fetch(url, {
          headers: {
            'Api-Key': twoOneOneKey,
            'locationMode': 'Near',
            'distance': radius || '10',
            'searchMode': 'Any',
            'orderByDistance': 'true',
            'size': '10',
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const rawList = data?.results || (Array.isArray(data) ? data : []);
          if (rawList.length > 0) {
            const formatted211 = rawList.map((item: any, idx: number) => {
              const fullAddress = item.address
                ? [item.address.streetAddress, item.address.city, item.address.stateProvince, item.address.postalCode].filter(Boolean).join(', ')
                : '';

              const rawTitle = item.nameService || item.nameOrganization || 'Community Resource';
              const rawContent = item.descriptionService || item.descriptionOrganization || '';
              const title = sanitizeText(
                item.nameOrganization ? `${item.nameOrganization} - ${item.nameService || 'Assistance'}` : rawTitle,
                true
              ) || 'Community Resource';
              const content = sanitizeText(rawContent, false);
              const normCat = normalizeCategory(category, `${title} ${content}`);

              return {
                id: `211-${item.idServiceAtLocation || item.idOrganization || idx}`,
                title,
                category: normCat,
                address: sanitizeText(fullAddress, true),
                phone: sanitizeText(item.phone || '', true),
                website: typeof item.website === 'string' ? item.website.trim() : '',
                hours: sanitizeText(item.hours || '', true),
                content,
                source: '211_platform',
                isLocal: true
              };
            });

            const payload211 = {
              zip,
              radius: `${radius} miles`,
              source: '211_platform',
              lifelines: filterLifelines(category),
              resources: formatted211
            };

            communityCache.set(cacheKey, {
              timestamp: Date.now(),
              ttlMs: CACHE_TTL_VERIFIED_MS,
              data: payload211,
            });

            return NextResponse.json(payload211);
          }
        }
      } catch (e211) {
        console.warn('2-1-1 API query failed, falling back to Google Grounding:', e211);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        zip,
        source: 'static_lifelines',
        lifelines: filterLifelines(category),
        resources: [],
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = buildCommunityPrompt(zip, radius, category);

    // 2. Google Search Grounding (skipped during quota cooldown so warm instances don't waste roundtrips)
    if (Date.now() >= groundingCooldownUntil) {
      try {
        const groundedModel = genAI.getGenerativeModel({
          model: 'gemini-3.5-flash-lite',
          tools: [{ googleSearch: {} } as any],
        });
        const groundedResult = await groundedModel.generateContent(prompt);
        const groundedParsed = parseResourcesJson(groundedResult.response.text().trim());

        if (groundedParsed.length > 0) {
          const formatted = formatGeminiResources(groundedParsed, zip, 'google_grounded');
          const responsePayload = {
            zip,
            radius: `${radius} miles`,
            source: 'google_grounded',
            lifelines: filterLifelines(category),
            resources: formatted,
          };

          communityCache.set(cacheKey, {
            timestamp: Date.now(),
            ttlMs: CACHE_TTL_VERIFIED_MS,
            data: responsePayload,
          });

          return NextResponse.json(responsePayload);
        }
      } catch (groundingErr: any) {
        const errMsg = String(groundingErr?.message || groundingErr || '');
        console.warn('Google Search grounding unavailable, falling back to AI directory:', errMsg);
        if (groundingErr?.status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(errMsg)) {
          groundingCooldownUntil = Date.now() + GROUNDING_COOLDOWN_MS;
        }
      }
    }

    // 3. Fallback: standard Gemini directory without Google Search grounding tool
    for (const modelName of ['gemini-3.5-flash-lite', 'gemini-3.6-flash']) {
      try {
        const fallbackModel = genAI.getGenerativeModel({ model: modelName });
        const fallbackResult = await fallbackModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });
        const parsed = parseResourcesJson(fallbackResult.response.text().trim());
        if (parsed.length > 0) {
          const formatted = formatGeminiResources(parsed, zip, 'ai_directory');
          const responsePayload = {
            zip,
            radius: `${radius} miles`,
            source: 'ai_directory',
            lifelines: filterLifelines(category),
            resources: formatted,
          };

          communityCache.set(cacheKey, {
            timestamp: Date.now(),
            ttlMs: CACHE_TTL_AI_MS,
            data: responsePayload,
          });

          return NextResponse.json(responsePayload);
        }
      } catch (fallbackErr: any) {
        console.warn(`Community AI directory fallback failed on ${modelName}:`, fallbackErr?.message || fallbackErr);
      }
    }

    return NextResponse.json(
      {
        error: 'Unable to load local community resources right now. Please try again shortly.',
        lifelines: filterLifelines(category),
        resources: [],
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Community resources API error:', error?.message || error);
    return NextResponse.json(
      {
        error: 'Unable to load local community resources right now. Please try again shortly.',
        lifelines: filterLifelines(category),
        resources: [],
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

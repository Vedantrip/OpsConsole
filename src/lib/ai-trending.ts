import { prisma } from "@/lib/prisma";

export interface TrendingTopic {
  id: string;
  title: string;
  category: "TECH" | "FASHION" | "LIFESTYLE" | "FINANCE" | "FITNESS" | "FOOD_TRAVEL" | "ENTERTAINMENT" | "GENERAL";
  whyTrending: string;
  hookIdea: string;
  contentAngle: string;
  suggestedAudioStyle: string;
  suggestedHashtags: string[];
  viralScore: "VIRAL" | "HIGH" | "EMERGING";
  targetPlatform: "Instagram Reels" | "YouTube Shorts" | "Cross-Platform";
  suggestedBy?: "AI Daily Radar" | "Google Trends Live" | "Curated Engine";
}

export interface TrendingResponse {
  date: string;
  topics: TrendingTopic[];
  source: "google_trends" | "gemini" | "openai" | "cache" | "fallback";
}

const CACHE_TTL_HOURS = 24;

export async function getDailyTrendingTopics(params?: {
  category?: string;
  creatorHandle?: string;
  platform?: string;
  niche?: string;
  forceRefresh?: boolean;
}): Promise<TrendingResponse> {
  const today = new Date().toISOString().split("T")[0];
  const category = params?.category || "ALL";
  const cacheKey = `${today}_${category}_${params?.creatorHandle || "GLOBAL"}`;

  // 1. Check PostgreSQL Persistent Cache first (2ms response, 0 AI tokens)
  if (!params?.forceRefresh) {
    try {
      const cached = await prisma.dailyTrendCache.findUnique({
        where: { cacheKey },
      });

      if (cached && Array.isArray(cached.topics) && (cached.topics as any[]).length > 0) {
        const ageHours = (Date.now() - new Date(cached.createdAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < CACHE_TTL_HOURS) {
          return {
            date: today,
            topics: cached.topics as unknown as TrendingTopic[],
            source: (cached.source as any) || "cache",
          };
        }
      }
    } catch (cacheErr) {
      console.warn("[AI-Trending] Cache read error (falling back to live):", cacheErr);
    }
  }

  // 2. Fetch from Official Google Trends Live RSS Feed ($0.00 cost, 100% free live searches)
  try {
    const liveGoogleTrends = await fetchGoogleTrendsLive(category);
    if (liveGoogleTrends && liveGoogleTrends.length > 0) {
      // Save to PostgreSQL Cache for 24h
      await persistTrendCache(cacheKey, category, liveGoogleTrends, "google_trends");
      return {
        date: today,
        topics: liveGoogleTrends,
        source: "google_trends",
      };
    }
  } catch (gErr) {
    console.warn("[AI-Trending] Google Trends RSS fetch error:", gErr);
  }

  // 3. High-Capacity Free Gemini API (1,500 Requests / Day)
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiApiKey) {
    try {
      const topics = await fetchFromGemini(geminiApiKey, params);
      if (topics && topics.length > 0) {
        await persistTrendCache(cacheKey, category, topics, "gemini");
        return { date: today, topics, source: "gemini" };
      }
    } catch (err) {
      console.error("[AI-Trending] Gemini API call error:", err);
    }
  }

  // 4. OpenAI API fallback (if configured)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (openaiApiKey) {
    try {
      const topics = await fetchFromOpenAI(openaiApiKey, params);
      if (topics && topics.length > 0) {
        await persistTrendCache(cacheKey, category, topics, "openai");
        return { date: today, topics, source: "openai" };
      }
    } catch (err) {
      console.error("[AI-Trending] OpenAI API call error:", err);
    }
  }

  // 5. Graceful fallback to curated deterministic trends (0 API cost)
  const fallbackTopics = getCuratedFallbackTrends(category);
  return { date: today, topics: fallbackTopics, source: "fallback" };
}

/**
 * Persist generated trends into PostgreSQL database cache
 */
async function persistTrendCache(
  cacheKey: string,
  category: string,
  topics: TrendingTopic[],
  source: string
) {
  try {
    await prisma.dailyTrendCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        category,
        topics: topics as any,
        source,
      },
      update: {
        topics: topics as any,
        source,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn("[AI-Trending] Failed to write trend cache to PostgreSQL:", err);
  }
}

/**
 * Live Google Trends RSS parser for India & Global trending search volumes
 */
export async function fetchGoogleTrendsLive(categoryFilter: string = "ALL"): Promise<TrendingTopic[]> {
  const geoUrls = [
    "https://trends.google.com/trending/rss?geo=IN",
    "https://trends.google.com/trending/rss?geo=US",
  ];

  for (const url of geoUrls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        next: { revalidate: 3600 }, // Cache on edge for 1 hour
      });

      if (!res.ok) continue;
      const xml = await res.text();

      const items = xml.split("<item>").slice(1);
      if (items.length === 0) continue;

      const topics: TrendingTopic[] = [];

      for (let i = 0; i < Math.min(items.length, 8); i++) {
        const item = items[i];
        const rawTitle = item.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")?.trim();
        const approxTraffic = item.match(/<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/)?.[1]?.trim() || "10K+";
        const newsTitle = item.match(/<ht:news_item_title>(.*?)<\/ht:news_item_title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")?.trim();
        const newsSnippet = item.match(/<ht:news_item_snippet>(.*?)<\/ht:news_item_snippet>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")?.trim();

        if (!rawTitle) continue;

        const formattedTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
        const category = detectCategory(formattedTitle + " " + (newsTitle || ""));

        if (categoryFilter !== "ALL" && category !== categoryFilter) {
          // If a specific category was requested, filter or map
        }

        topics.push({
          id: `gt-${Date.now()}-${i}`,
          title: formattedTitle,
          category,
          whyTrending: `${approxTraffic} search volume surge today on Google & Social Feeds. ${newsTitle ? `"${newsTitle}"` : ""}`,
          hookIdea: `POV: You just saw the news about ${formattedTitle} and nobody is talking about what actually happens next...`,
          contentAngle: `Break down the trending viral angle around ${formattedTitle}. Focus on 3 key takeaway insights in the first 15 seconds.`,
          suggestedAudioStyle: "High-Energy Trend Beat / Speed-Up UK Drill",
          suggestedHashtags: [`#${formattedTitle.replace(/\s+/g, "")}`, "#TrendingNow", "#ViralReels", "#CreatorEconomy"],
          viralScore: approxTraffic.includes("50K") || approxTraffic.includes("100K") ? "VIRAL" : "HIGH",
          targetPlatform: "Instagram Reels",
          suggestedBy: "Google Trends Live",
        });
      }

      if (topics.length > 0) return topics;
    } catch (e) {
      console.warn("[Google Trends] Error fetching from", url, e);
    }
  }

  return [];
}

function detectCategory(text: string): "TECH" | "FASHION" | "LIFESTYLE" | "FINANCE" | "FITNESS" | "FOOD_TRAVEL" | "ENTERTAINMENT" | "GENERAL" {
  const t = text.toLowerCase();
  if (t.includes("ai") || t.includes("tech") || t.includes("app") || t.includes("phone") || t.includes("meta") || t.includes("google") || t.includes("software")) return "TECH";
  if (t.includes("fashion") || t.includes("wear") || t.includes("style") || t.includes("beauty") || t.includes("dress") || t.includes("outfit")) return "FASHION";
  if (t.includes("stock") || t.includes("money") || t.includes("market") || t.includes("crypto") || t.includes("tax") || t.includes("fund") || t.includes("finance")) return "FINANCE";
  if (t.includes("fit") || t.includes("diet") || t.includes("workout") || t.includes("gym") || t.includes("health")) return "FITNESS";
  if (t.includes("movie") || t.includes("song") || t.includes("actor") || t.includes("trailer") || t.includes("netflix") || t.includes("match") || t.includes("vs") || t.includes("cricket")) return "ENTERTAINMENT";
  if (t.includes("food") || t.includes("recipe") || t.includes("travel") || t.includes("flight") || t.includes("hotel")) return "FOOD_TRAVEL";
  return "LIFESTYLE";
}

async function fetchFromGemini(
  apiKey: string,
  params?: { category?: string; creatorHandle?: string; platform?: string; niche?: string }
): Promise<TrendingTopic[]> {
  const prompt = buildTrendingPrompt(params);

  // High-capacity free tier models: gemini-1.5-flash & gemini-2.0-flash offer 1,500 requests/day
  const models = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-3.5-flash-lite",
    "gemini-1.5-flash-8b",
  ];
  let lastError: Error | null = null;

  for (const model of models) {
    const maxAttempts = 2;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 2500,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(
            `Gemini API (${model}) returned status ${response.status}: ${errorText}`
          );

          if ([500, 503, 504].includes(response.status) && attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500 * 2 ** attempt));
            lastError = error;
            continue;
          }

          throw error;
        }

        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error(`No text content returned from Gemini (${model})`);
        }

        const parsed = JSON.parse(rawText);
        return Array.isArray(parsed) ? parsed : parsed.topics || [];
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[AI-Trending] Attempt ${attempt + 1} with ${model} failed:`, lastError.message);
      }
    }
  }

  throw lastError || new Error("Failed to fetch topics from all configured Gemini models.");
}

async function fetchFromOpenAI(
  apiKey: string,
  params?: { category?: string; creatorHandle?: string; platform?: string; niche?: string }
): Promise<TrendingTopic[]> {
  const prompt = buildTrendingPrompt(params);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned status ${response.status}`);
  }

  const result = await response.json();
  const rawText = result.choices?.[0]?.message?.content;
  if (!rawText) throw new Error("No response from OpenAI");

  const parsed = JSON.parse(rawText);
  return Array.isArray(parsed) ? parsed : parsed.topics || [];
}

function buildTrendingPrompt(params?: {
  category?: string;
  creatorHandle?: string;
  platform?: string;
  niche?: string;
}): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categoryFilter = params?.category && params.category !== "ALL"
    ? `Target Niche/Category: ${params.category}`
    : "Cover diverse categories (Tech/AI, Fashion/Beauty, Lifestyle, Finance, Entertainment)";

  const creatorContext = params?.creatorHandle
    ? `Tailor specifically for creator: @${params.creatorHandle} (Niche: ${params.niche || "General Creator"}, Platform: ${params.platform || "Instagram"})`
    : "Generate viral topics suitable for high-growth Indian & Global content creators.";

  return `You are the Lead Creative Director at MountLift, a premier talent management and influencer agency.
Today is ${today}.

Generate 4 to 6 real-time, highly engaging trending content topics/briefs for short-form video creators (Instagram Reels & TikTok).
${categoryFilter}
${creatorContext}

Output MUST be a valid JSON object matching this schema:
{
  "topics": [
    {
      "id": "unique-slug-1",
      "title": "Short Punchy Topic Title",
      "category": "TECH" | "FASHION" | "LIFESTYLE" | "FINANCE" | "FITNESS" | "FOOD_TRAVEL" | "ENTERTAINMENT" | "GENERAL",
      "whyTrending": "1-2 sentences explaining why this topic is spiking in search/social feeds today.",
      "hookIdea": "The exact verbatim 3-second spoken opening line (hook) the creator should say into the camera.",
      "contentAngle": "How to structure the reel for maximum watch time & comments.",
      "suggestedAudioStyle": "E.g. Fast Phonk Drift / Lo-Fi Chill / Upbeat Synthwave",
      "suggestedHashtags": ["#tag1", "#tag2", "#tag3"],
      "viralScore": "VIRAL" | "HIGH" | "EMERGING",
      "targetPlatform": "Instagram Reels",
      "suggestedBy": "AI Daily Radar"
    }
  ]
}
Ensure hooks are punchy, conversational, Gen-Z oriented, and avoid corporate jargon.`;
}

function getCuratedFallbackTrends(categoryFilter?: string): TrendingTopic[] {
  const allCurated: TrendingTopic[] = [
    {
      id: "curated-1",
      title: "AI Spatial Wearables Reality Check",
      category: "TECH",
      whyTrending: "Next-gen smart glasses and localized AI assistants are replacing standard screens in creator workflows.",
      hookIdea: "I wore the newest AI glasses for 7 days straight—and I'm throwing away my phone.",
      contentAngle: "Fast-paced Day 1 vs Day 7 lifestyle integration comparison with screen overlays.",
      suggestedAudioStyle: "Futuristic Cyber Synth / Fast Hi-Hats",
      suggestedHashtags: ["#TechReview", "#SmartGlasses", "#AICreator", "#MountLiftTech"],
      viralScore: "VIRAL",
      targetPlatform: "Instagram Reels",
      suggestedBy: "Curated Engine",
    },
    {
      id: "curated-2",
      title: "Quiet Luxury Autumn Layering",
      category: "FASHION",
      whyTrending: "Understated neutral palettes and minimalist silhouettes are driving double the save-rates on Reels.",
      hookIdea: "How to look like a billionaire this autumn without spending a single extra rupee.",
      contentAngle: "3 outfit transitions utilizing thrifted/affordable staples styled like luxury lookbooks.",
      suggestedAudioStyle: "French House Lo-Fi / Chill Rhodes Piano",
      suggestedHashtags: ["#QuietLuxury", "#FallFashion", "#CapsuleWardrobe", "#StyleInspo"],
      viralScore: "HIGH",
      targetPlatform: "Instagram Reels",
      suggestedBy: "Curated Engine",
    },
    {
      id: "curated-3",
      title: "Bulletproof Micro-Retirement & Soft Life Finance",
      category: "FINANCE",
      whyTrending: "Gen-Z finance creators are pivoting from extreme frugality to sustainable 'mini-sabbaticals'.",
      hookIdea: "Stop saving 20% of your salary the traditional way. Do this exact 50-30-20 rule upgrade instead.",
      contentAngle: "Simple green-screen breakdown with practical spreadsheet templates.",
      suggestedAudioStyle: "Upbeat Lo-Fi Tape / Steady Groove",
      suggestedHashtags: ["#PersonalFinance", "#MoneyTok", "#SmartInvesting", "#FinancialFreedom"],
      viralScore: "VIRAL",
      targetPlatform: "Instagram Reels",
      suggestedBy: "Curated Engine",
    },
    {
      id: "curated-4",
      title: "7-Day Zone 2 Cardio & Metabolic Reset",
      category: "FITNESS",
      whyTrending: "Low-intensity steady-state training is surging over high-stress HIIT workouts.",
      hookIdea: "The single fitness metric that fixed my brain fog in less than 72 hours...",
      contentAngle: "Talking-head walking vlog showing heart rate zones with clean text callouts.",
      suggestedAudioStyle: "Chill Ambient Wave / Soft Kick",
      suggestedHashtags: ["#FitnessTips", "#Zone2", "#Longevity", "#WellnessRoutine"],
      viralScore: "HIGH",
      targetPlatform: "Instagram Reels",
      suggestedBy: "Curated Engine",
    },
  ];

  if (!categoryFilter || categoryFilter === "ALL") return allCurated;
  const filtered = allCurated.filter((c) => c.category === categoryFilter);
  return filtered.length > 0 ? filtered : allCurated;
}

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
  suggestedBy?: "AI Daily Radar";
}

export interface TrendingResponse {
  date: string;
  topics: TrendingTopic[];
  source: "gemini" | "openai" | "fallback";
}

// In-memory cache for today's generated trends
let cachedTrends: { [key: string]: { timestamp: number; data: TrendingTopic[] } } = {};
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours cache

export async function getDailyTrendingTopics(params?: {
  category?: string;
  creatorHandle?: string;
  platform?: string;
  niche?: string;
  forceRefresh?: boolean;
}): Promise<TrendingResponse> {
  const today = new Date().toISOString().split("T")[0];
  const cacheKey = `${today}_${params?.category || "ALL"}_${params?.creatorHandle || "GLOBAL"}`;

  if (!params?.forceRefresh && cachedTrends[cacheKey] && Date.now() - cachedTrends[cacheKey].timestamp < CACHE_TTL_MS) {
    return {
      date: today,
      topics: cachedTrends[cacheKey].data,
      source: "gemini",
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (geminiApiKey) {
    try {
      const topics = await fetchFromGemini(geminiApiKey, params);
      if (topics && topics.length > 0) {
        cachedTrends[cacheKey] = { timestamp: Date.now(), data: topics };
        return { date: today, topics, source: "gemini" };
      }
    } catch (err) {
      console.error("[AI-Trending] Gemini API call error:", err);
    }
  }

  if (openaiApiKey) {
    try {
      const topics = await fetchFromOpenAI(openaiApiKey, params);
      if (topics && topics.length > 0) {
        cachedTrends[cacheKey] = { timestamp: Date.now(), data: topics };
        return { date: today, topics, source: "openai" };
      }
    } catch (err) {
      console.error("[AI-Trending] OpenAI API call error:", err);
    }
  }

  // Graceful fallback curated trends if keys are missing or offline
  const fallbackTopics = getCuratedFallbackTrends(params?.category);
  return { date: today, topics: fallbackTopics, source: "fallback" };
}

async function fetchFromGemini(
  apiKey: string,
  params?: { category?: string; creatorHandle?: string; platform?: string; niche?: string }
): Promise<TrendingTopic[]> {
  const prompt = buildTrendingPrompt(params);

  // Use Gemini 1.5 Flash for high speed and precision
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 2500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("No text content returned from Gemini API");
  }

  const parsed = JSON.parse(rawText);
  return Array.isArray(parsed) ? parsed : parsed.topics || [];
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
      messages: [
        {
          role: "system",
          content:
            "You are an expert Social Media Trend Analyst and Viral Content Strategist for MountLift Influencer Agency. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API returned status ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
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

  const categoryFilter =
    params?.category && params.category !== "ALL"
      ? `Focus specifically on the ${params.category} category.`
      : "Provide a diverse, high-energy mix of trends across Tech, Lifestyle, Fashion/Beauty, Finance, Fitness, Food/Travel, and Entertainment.";

  const creatorContext = params?.creatorHandle
    ? `Tailor 2-3 of the suggestions specifically for creator ${params.creatorHandle} (${params.niche || "General"} content style on ${params.platform || "Instagram"}).`
    : "";

  return `
Today is ${today}.
As an elite AI Content Intelligence Strategist at MountLift (an influencer marketing & creator agency), analyze and curate 6 to 8 of the hottest, most viral and trending topics, internet cultural conversations, and video concepts going on right now for Indian and global creators.

${categoryFilter}
${creatorContext}

Return a valid JSON array of objects with the exact schema:
[
  {
    "id": "trend-1",
    "title": "Clear, punchy name of the trending topic or viral format",
    "category": "TECH" | "FASHION" | "LIFESTYLE" | "FINANCE" | "FITNESS" | "FOOD_TRAVEL" | "ENTERTAINMENT" | "GENERAL",
    "whyTrending": "1-2 sentences explaining why this is blowing up today and the audience interest",
    "hookIdea": "A ready-to-record opening 3-second hook for Reels/Shorts (e.g., 'Stop doing X in 2026, here is why...')",
    "contentAngle": "Actionable 2-sentence breakdown of how the creator should structure the Reel/Short/Video for maximum retention and saves",
    "suggestedAudioStyle": "Suggested audio vibe (e.g., 'Upbeat synthwave / lo-fi chill beat / Fast-paced trending suspense beat')",
    "suggestedHashtags": ["#Tag1", "#Tag2", "#Tag3"],
    "viralScore": "VIRAL" | "HIGH" | "EMERGING",
    "targetPlatform": "Instagram Reels" | "YouTube Shorts" | "Cross-Platform"
  }
]

Make sure every hook is punchy, high-converting, and actionable. Do not return any markdown wraps outside the JSON.
`;
}

function getCuratedFallbackTrends(category?: string): TrendingTopic[] {
  const allFallback: TrendingTopic[] = [
    {
      id: "fb-1",
      title: "The '30-Day Anti-Routine' Trend",
      category: "LIFESTYLE",
      whyTrending: "Audiences are fatigued by hyper-rigid 5 AM routines and are engaging heavily with realistic, unstructured high-performance workflows.",
      hookIdea: "I stopped doing the 5 AM productive morning routine for 30 days. Here is what actually happened to my output...",
      contentAngle: "Show split-screen comparison of hyper-curated vs real-life productivity. Reveal how prioritizing energy over rigid schedules increased focus.",
      suggestedAudioStyle: "Moody aesthetic acoustic guitar / Calm ambient piano",
      suggestedHashtags: ["#ProductivityHacks", "#AntiRoutine", "#RealTalk", "#CreatorLife"],
      viralScore: "VIRAL",
      targetPlatform: "Instagram Reels",
      suggestedBy: "AI Daily Radar",
    },
    {
      id: "fb-2",
      title: "AI Workflows Replacing 5-Hour Tasks in 5 Minutes",
      category: "TECH",
      whyTrending: "New multimodal AI agents and browser automation tools are going viral as creators showcase instantaneous automations.",
      hookIdea: "If you are still doing this manually in 2026, you are wasting 10 hours every single week.",
      contentAngle: "Fast-cut screen recording showing a tedious repetitive task, then executing a 1-click AI workflow that finishes it instantaneously.",
      suggestedAudioStyle: "High-tempo electronic / Futuristic tech synth",
      suggestedHashtags: ["#AITools", "#TechTrends", "#AutomationHacks", "#FutureOfWork"],
      viralScore: "VIRAL",
      targetPlatform: "Cross-Platform",
      suggestedBy: "AI Daily Radar",
    },
    {
      id: "fb-3",
      title: "The 'Cost Per Wear' Capsule Wardrobe Breakdown",
      category: "FASHION",
      whyTrending: "Smart luxury & conscious consumerism is trending; viewers love transparent ROI calculations on fashion investments.",
      hookIdea: "Why this ₹2,000 piece is actually 5x more expensive than this ₹8,000 jacket...",
      contentAngle: "Break down Cost-Per-Wear (CPW) equation with fast visual try-on transitions across 5 different outfits using the same core staple.",
      suggestedAudioStyle: "Chic French house / Parisian lounge groove",
      suggestedHashtags: ["#CapsuleWardrobe", "#StyleSmart", "#CostPerWear", "#FashionInspo"],
      viralScore: "HIGH",
      targetPlatform: "Instagram Reels",
      suggestedBy: "AI Daily Radar",
    },
    {
      id: "fb-4",
      title: "Zero-Budget Micro-Investing Strategies for 2026",
      category: "FINANCE",
      whyTrending: "Gen Z & millennial creators are simplifying SIPs, index funds, and automated micro-saving without complex financial jargon.",
      hookIdea: "Do NOT invest your first ₹10,000 in crypto or stocks until you have done this one rule...",
      contentAngle: "Explain the emergency liquidity waterfall rule before risky assets. Use clean whiteboard graphics or on-screen text overlays.",
      suggestedAudioStyle: "Subtle driving bassline / Focused podcast beat",
      suggestedHashtags: ["#FinanceTok", "#MoneyTips", "#SmartInvesting", "#WealthBuilding"],
      viralScore: "HIGH",
      targetPlatform: "YouTube Shorts",
      suggestedBy: "AI Daily Radar",
    },
    {
      id: "fb-5",
      title: "Zone 2 Cardio vs HIIT for Fat Loss Debate",
      category: "FITNESS",
      whyTrending: "Longevity science is dominating fitness conversations, disproving the myth that every workout needs to be exhausting.",
      hookIdea: "The workout that burned more fat than my 45-minute HIIT sessions took almost zero effort...",
      contentAngle: "Explain how conversational pace cardio optimizes mitochondrial efficiency. Show heart rate monitor readings on screen.",
      suggestedAudioStyle: "Deep house running beat / Uplifting gym pulse",
      suggestedHashtags: ["#Zone2Cardio", "#FitnessScience", "#FatLossTips", "#GymTok"],
      viralScore: "EMERGING",
      targetPlatform: "Instagram Reels",
      suggestedBy: "AI Daily Radar",
    },
    {
      id: "fb-6",
      title: "Secret Hidden Street Food Corners in Old Towns",
      category: "FOOD_TRAVEL",
      whyTrending: "Hyper-local authentic culinary discoveries are outperforming generic viral cafe reviews.",
      hookIdea: "This 60-year-old shop has zero signboards and a 45-minute queue every single morning...",
      contentAngle: "Start with a fast zoom on the sizzle/steam. Interview the owner for 5 seconds on their secret recipe before doing a genuine taste test.",
      suggestedAudioStyle: "Warm lo-fi jazz / Folk acoustic upbeat",
      suggestedHashtags: ["#StreetFood", "#HiddenGems", "#FoodDiscovery", "#TravelDiary"],
      viralScore: "VIRAL",
      targetPlatform: "Instagram Reels",
      suggestedBy: "AI Daily Radar",
    },
  ];

  if (category && category !== "ALL") {
    const filtered = allFallback.filter((t) => t.category === category);
    return filtered.length > 0 ? filtered : allFallback;
  }
  return allFallback;
}

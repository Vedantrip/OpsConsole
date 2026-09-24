export type ScrapedReel = {
  shortCode?: string;
  url?: string;
  inputUrl?: string;
  caption?: string;
  timestamp?: string;
  videoPlayCount?: number;
  videoViewCount?: number;
  likesCount?: number;
  commentsCount?: number;
  isVideo?: boolean;
};

export type ScrapedProfile = {
  username: string;
  fullName: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  isVerified: boolean;
  profilePicUrl?: string;
  reels: ScrapedReel[];
  source: "rapidapi" | "scraperapi" | "instagram_direct" | "apify";
};

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "";
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-2023.p.rapidapi.com";
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY || process.env.SCRAPER_API_KEY || "";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN || "";
const APIFY_ACTOR_ID = process.env.APIFY_REEL_ACTOR_ID || process.env.APIFY_ACTOR_ID || "apify~instagram-reel-scraper";

/**
 * Unified Multi-Provider Instagram Scraper
 * Tries RapidAPI -> ScraperAPI -> Direct Web API -> Apify fallback
 */
export async function scrapeInstagramData(
  username: string,
  reelsLimit: number = 12
): Promise<ScrapedProfile> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Instagram username cannot be empty.");

  const errors: string[] = [];

  // 1. Try RapidAPI (if configured)
  if (RAPIDAPI_KEY) {
    try {
      const data = await scrapeViaRapidApi(cleanUsername, reelsLimit);
      if (data && (data.followerCount > 0 || data.reels.length > 0)) {
        return data;
      }
    } catch (err: any) {
      console.warn("[Scraper] RapidAPI failed:", err?.message || err);
      errors.push(`RapidAPI: ${err?.message || err}`);
    }
  }

  // 2. Try ScraperAPI (if configured)
  if (SCRAPERAPI_KEY) {
    try {
      const data = await scrapeViaScraperApi(cleanUsername, reelsLimit);
      if (data && (data.followerCount > 0 || data.reels.length > 0)) {
        return data;
      }
    } catch (err: any) {
      console.warn("[Scraper] ScraperAPI failed:", err?.message || err);
      errors.push(`ScraperAPI: ${err?.message || err}`);
    }
  }

  // 3. Try Direct Instagram Web API (zero-cost direct fetch)
  try {
    const data = await scrapeViaDirectInstagram(cleanUsername, reelsLimit);
    if (data && (data.followerCount > 0 || data.reels.length > 0)) {
      return data;
    }
  } catch (err: any) {
    console.warn("[Scraper] Direct Web API failed:", err?.message || err);
    errors.push(`DirectAPI: ${err?.message || err}`);
  }

  // 4. Try Apify (Fallback)
  if (APIFY_TOKEN) {
    try {
      const data = await scrapeViaApify(cleanUsername, reelsLimit);
      if (data) return data;
    } catch (err: any) {
      console.error("[Scraper] Apify fallback failed:", err?.message || err);
      errors.push(`Apify: ${err?.message || err}`);
    }
  }

  throw new Error(
    `All Instagram scraping providers failed for @${cleanUsername}. Errors: ${errors.join("; ")}`
  );
}

/**
 * Provider 1: RapidAPI Scraper with multi-endpoint resolution
 */
async function scrapeViaRapidApi(username: string, limit: number): Promise<ScrapedProfile> {
  // Try endpoint formats commonly used across RapidAPI Instagram scrapers
  const candidateUrls = [
    `https://${RAPIDAPI_HOST}/user_info?username=${encodeURIComponent(username)}`,
    `https://${RAPIDAPI_HOST}/userinfo?username=${encodeURIComponent(username)}`,
    `https://${RAPIDAPI_HOST}/user_info?user=${encodeURIComponent(username)}`,
    `https://${RAPIDAPI_HOST}/userinfo/${encodeURIComponent(username)}`,
    `https://${RAPIDAPI_HOST}/api/user/info?username=${encodeURIComponent(username)}`,
    `https://${RAPIDAPI_HOST}/user_posts?username=${encodeURIComponent(username)}`,
  ];

  let lastError: Error | null = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": RAPIDAPI_HOST,
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        lastError = new Error(`RapidAPI responded with status ${response.status} for ${url}`);
        continue;
      }

      const json = await response.json();
      if (!json) continue;

      const user = json?.data?.user || json?.data || json?.user || json?.result || json;
      const rawPosts =
        user?.edge_owner_to_timeline_media?.edges ||
        user?.posts ||
        user?.items ||
        user?.recent_posts ||
        json?.posts ||
        json?.items ||
        json?.data?.items ||
        [];

      const reels: ScrapedReel[] = (Array.isArray(rawPosts) ? rawPosts : [])
        .slice(0, limit)
        .map((item: any) => {
          const node = item?.node || item;
          const captionText =
            node?.edge_media_to_caption?.edges?.[0]?.node?.text ||
            node?.caption?.text ||
            (typeof node?.caption === "string" ? node.caption : "") ||
            "";
          const likes =
            node?.edge_liked_by?.count ??
            node?.edge_media_preview_like?.count ??
            node?.likesCount ??
            node?.like_count ??
            node?.likes ??
            0;
          const comments =
            node?.edge_media_to_comment?.count ??
            node?.commentsCount ??
            node?.comment_count ??
            node?.comments ??
            0;
          const views =
            node?.video_play_count ??
            node?.video_view_count ??
            node?.viewCount ??
            node?.play_count ??
            node?.views ??
            null;
          const shortCode = node?.shortcode || node?.code || node?.id || "";

          return {
            shortCode,
            url: shortCode ? `https://www.instagram.com/p/${shortCode}/` : undefined,
            caption: captionText,
            timestamp: node?.taken_at_timestamp
              ? new Date(node.taken_at_timestamp * 1000).toISOString()
              : node?.timestamp
              ? new Date(typeof node.timestamp === "number" ? node.timestamp * 1000 : node.timestamp).toISOString()
              : undefined,
            videoPlayCount: views,
            videoViewCount: views,
            likesCount: likes,
            commentsCount: comments,
            isVideo: Boolean(node?.is_video || views != null),
          };
        });

      const followerCount =
        user?.edge_followed_by?.count ??
        user?.follower_count ??
        user?.followers ??
        user?.stats?.followers ??
        0;

      const followingCount =
        user?.edge_follow?.count ??
        user?.following_count ??
        user?.following ??
        0;

      return {
        username,
        fullName: user?.full_name || user?.fullName || user?.name || username,
        biography: user?.biography || user?.bio || "",
        followerCount,
        followingCount,
        isVerified: Boolean(user?.is_verified || user?.isVerified || user?.verified),
        profilePicUrl: user?.profile_pic_url_hd || user?.profile_pic_url || user?.avatar,
        reels,
        source: "rapidapi",
      };
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error("RapidAPI failed to return valid profile data.");
}

/**
 * Provider 2: ScraperAPI (Web profile & proxy)
 */
async function scrapeViaScraperApi(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;
  
  // Standard proxy request without restricted headers
  const proxyUrl = `https://api.scraperapi.com?api_key=${encodeURIComponent(
    SCRAPERAPI_KEY
  )}&url=${encodeURIComponent(targetUrl)}&country_code=us`;

  const response = await fetch(proxyUrl, {
    method: "GET",
    headers: {
      "x-ig-app-id": "936619743392459",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    // If API v1 fails, fallback to scraping HTML page via ScraperAPI
    return scrapeInstagramHtmlViaScraperApi(username, limit);
  }

  const json = await response.json();
  return parseInstagramWebProfileJson(username, json, limit, "scraperapi");
}

/**
 * ScraperAPI HTML Fallback
 */
async function scrapeInstagramHtmlViaScraperApi(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const proxyUrl = `https://api.scraperapi.com?api_key=${encodeURIComponent(
    SCRAPERAPI_KEY
  )}&url=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl, {
    method: "GET",
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`ScraperAPI HTML returned status ${response.status}`);
  }

  const html = await response.text();
  
  // Extract follower count from meta tag: <meta property="og:description" content="10K Followers, 500 Following, 120 Posts ...">
  const metaMatch = html.match(/content="([0-9,.KkMmB]+)\s*Followers,\s*([0-9,.KkMmB]+)\s*Following,\s*([0-9,.KkMmB]+)\s*Posts/i);
  let followerCount = 0;
  let followingCount = 0;

  if (metaMatch) {
    followerCount = parseCompactNumber(metaMatch[1]);
    followingCount = parseCompactNumber(metaMatch[2]);
  }

  return {
    username,
    fullName: username,
    biography: "",
    followerCount,
    followingCount,
    isVerified: html.includes('"is_verified":true'),
    reels: [],
    source: "scraperapi",
  };
}

function parseCompactNumber(str: string): number {
  const clean = str.replace(/,/g, "").trim().toUpperCase();
  if (clean.endsWith("K")) return Math.round(parseFloat(clean) * 1000);
  if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1000000);
  if (clean.endsWith("B")) return Math.round(parseFloat(clean) * 1000000000);
  return parseInt(clean, 10) || 0;
}

/**
 * Provider 3: Direct Instagram Web API
 */
async function scrapeViaDirectInstagram(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      "x-ig-app-id": "936619743392459",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Direct Instagram responded with status ${response.status}`);
  }

  const json = await response.json();
  return parseInstagramWebProfileJson(username, json, limit, "instagram_direct");
}

/**
 * Helper to parse standard Instagram web_profile_info response
 */
function parseInstagramWebProfileJson(
  username: string,
  json: any,
  limit: number,
  source: "scraperapi" | "instagram_direct"
): ScrapedProfile {
  const user = json?.data?.user;
  if (!user) throw new Error("No user object in Instagram web_profile_info response");

  const edges = user?.edge_owner_to_timeline_media?.edges || [];
  const reels: ScrapedReel[] = edges.slice(0, limit).map((edge: any) => {
    const node = edge?.node || {};
    const caption = node?.edge_media_to_caption?.edges?.[0]?.node?.text || "";
    const likes = node?.edge_liked_by?.count ?? node?.edge_media_preview_like?.count ?? 0;
    const comments = node?.edge_media_to_comment?.count ?? 0;
    const views = node?.video_play_count ?? node?.video_view_count ?? null;
    const shortCode = node?.shortcode || "";

    return {
      shortCode,
      url: shortCode ? `https://www.instagram.com/p/${shortCode}/` : undefined,
      caption,
      timestamp: node?.taken_at_timestamp
        ? new Date(node.taken_at_timestamp * 1000).toISOString()
        : undefined,
      videoPlayCount: views,
      videoViewCount: views,
      likesCount: likes,
      commentsCount: comments,
      isVideo: Boolean(node?.is_video || views != null),
    };
  });

  return {
    username,
    fullName: user.full_name || username,
    biography: user.biography || "",
    followerCount: user.edge_followed_by?.count || 0,
    followingCount: user.edge_follow?.count || 0,
    isVerified: Boolean(user.is_verified),
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
    reels,
    source,
  };
}

/**
 * Provider 4: Apify Scraper (Fallback)
 */
async function scrapeViaApify(username: string, limit: number): Promise<ScrapedProfile> {
  const APIFY_BASE = "https://api.apify.com/v2";
  const input = { username: [username], resultsLimit: limit };

  const response = await fetch(
    `${APIFY_BASE}/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${encodeURIComponent(
      APIFY_TOKEN
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(120_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify responded with status ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response from Apify");

  const reels: ScrapedReel[] = data.map((item: any) => ({
    shortCode: item.shortCode,
    url: item.url || item.inputUrl,
    caption: item.caption,
    timestamp: item.timestamp,
    videoPlayCount: item.videoPlayCount,
    videoViewCount: item.videoViewCount,
    likesCount: item.likesCount,
    commentsCount: item.commentsCount,
    isVideo: true,
  }));

  return {
    username,
    fullName: username,
    biography: "",
    followerCount: 0,
    followingCount: 0,
    isVerified: false,
    reels,
    source: "apify",
  };
}

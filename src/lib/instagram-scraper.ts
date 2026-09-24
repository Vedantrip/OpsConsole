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
  source: "rapidapi" | "scraperapi" | "instagram_direct";
};

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY || "";
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "instagram-scraper-2023.p.rapidapi.com";
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY || process.env.SCRAPER_API_KEY || "";

const REQUEST_TIMEOUT_MS = 20_000;
const DIRECT_RETRY_ATTEMPTS = 2;
const RAPID_RETRY_ATTEMPTS = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryAfterMs(response: Response, fallbackMs: number) {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return fallbackMs;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds * 1000, 500), 10_000);

  const date = Date.parse(retryAfter);
  if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 500), 10_000);

  return fallbackMs;
}

function responseSnippet(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

/**
 * Unified Instagram scraper for public profile/reel data.
 *
 * Important: this route no longer depends on Apify. Apify was previously
 * used as a paid fallback and could turn a temporary provider failure into
 * a hard failure when the Apify account was rate/usage limited.
 *
 * Provider order:
 *   1. RapidAPI
 *   2. Direct Instagram web endpoint
 *
 * These providers scrape public data only. Official Instagram Insights for
 * an account the user owns should use the separate Instagram Login/Graph API.
 */
export async function scrapeInstagramData(
  username: string,
  reelsLimit: number = 12
): Promise<ScrapedProfile> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Instagram username cannot be empty.");

  const errors: string[] = [];

  if (RAPIDAPI_KEY) {
    try {
      const data = await scrapeViaRapidApi(cleanUsername, reelsLimit);
      if (data && (data.followerCount > 0 || data.reels.length > 0)) return data;
      errors.push("RapidAPI: response did not contain usable profile/reel data.");
    } catch (err: any) {
      console.warn("[Scraper] RapidAPI failed:", err?.message || err);
      errors.push(`RapidAPI: ${err?.message || err}`);
    }
  } else {
    errors.push("RapidAPI: RAPIDAPI_KEY is not configured.");
  }

  // ScraperAPI is not used for Instagram anymore. The current ScraperAPI
  // account explicitly rejects Instagram URLs under its Terms of Use, so
  // retrying it only adds latency and another guaranteed failure.
  if (SCRAPERAPI_KEY) {
    console.info("[Scraper] ScraperAPI is configured but skipped for Instagram because the provider rejects this target.");
  }

  try {
    const data = await scrapeViaDirectInstagram(cleanUsername, reelsLimit);
    if (data && (data.followerCount > 0 || data.reels.length > 0)) return data;
    errors.push("DirectAPI: response did not contain usable profile/reel data.");
  } catch (err: any) {
    console.warn("[Scraper] Direct Web API failed:", err?.message || err);
    errors.push(`DirectAPI: ${err?.message || err}`);
  }

  throw new Error(
    `All Instagram scraping providers failed for @${cleanUsername}. Errors: ${errors.join("; ")}`
  );
}

/**
 * RapidAPI provider.
 *
 * The old implementation tried six different endpoints on every failure.
 * A 429 from RapidAPI is generally a quota/concurrency/rate-limit response,
 * so probing more endpoints only increases pressure and can make the failure
 * worse. We use the configured host's posts endpoint and retry only 429s.
 */
async function scrapeViaRapidApi(username: string, limit: number): Promise<ScrapedProfile> {
  // The RapidAPI playground for this exact API exposes the endpoint as
  // "Get User Posts" and accepts handle/max_id. The previous implementation
  // called /user_posts, which RapidAPI correctly returned as a 404 because
  // that route does not exist.
  const endpointCandidates = [
    "/get_user_posts",
    "/get_user_posts.php",
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpointCandidates) {
    const url = `https://${RAPIDAPI_HOST}${endpoint}?handle=${encodeURIComponent(username)}`;

    for (let attempt = 0; attempt <= RAPID_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        });

        if (response.ok) {
          const json = await response.json();
          return parseRapidApiResponse(username, json, limit);
        }

        const body = await response.text().catch(() => "");
        const message = `RapidAPI responded with status ${response.status} for ${endpoint}${body ? `: ${responseSnippet(body)}` : ""}`;
        lastError = new Error(message);

        // A 404 means this candidate route is wrong; try the next documented
        // route shape without wasting retries.
        if (response.status === 404) break;

        if (response.status !== 429 || attempt === RAPID_RETRY_ATTEMPTS) break;
        await sleep(retryAfterMs(response, 1500 * (attempt + 1)));
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        break;
      }
    }
  }

  throw lastError || new Error("RapidAPI failed to return valid profile data.");
}

function parseRapidApiResponse(username: string, json: any, limit: number): ScrapedProfile {
  const user = json?.data?.user || json?.user || json?.result?.user || json?.data || json?.result || json;
  const rawPosts =
    user?.edge_owner_to_timeline_media?.edges ||
    user?.posts ||
    user?.items ||
    user?.recent_posts ||
    user?.media ||
    json?.posts ||
    json?.items ||
    json?.data?.items ||
    json?.data?.posts ||
    json?.result?.posts ||
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
      const shortCode = node?.shortcode || node?.shortCode || node?.code || "";

      return {
        shortCode,
        url: shortCode ? `https://www.instagram.com/p/${shortCode}/` : undefined,
        caption: captionText,
        timestamp: node?.taken_at_timestamp
          ? new Date(node.taken_at_timestamp * 1000).toISOString()
          : node?.timestamp
          ? new Date(
              typeof node.timestamp === "number"
                ? node.timestamp * 1000
                : node.timestamp
            ).toISOString()
          : undefined,
        videoPlayCount: typeof views === "number" ? views : undefined,
        videoViewCount: typeof views === "number" ? views : undefined,
        likesCount: Number(likes) || 0,
        commentsCount: Number(comments) || 0,
        isVideo: Boolean(node?.is_video || views != null),
      };
    });

  const followerCount = Number(
    user?.edge_followed_by?.count ??
      user?.follower_count ??
      user?.followers ??
      user?.stats?.followers ??
      0
  ) || 0;

  const followingCount = Number(
    user?.edge_follow?.count ??
      user?.following_count ??
      user?.following ??
      0
  ) || 0;

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
}

/**
 * ScraperAPI provider.
 *
 * keep_headers=true is important here: the previous implementation put
 * Instagram-specific headers on the ScraperAPI request itself, rather than
 * forwarding them to Instagram. The target needs to receive x-ig-app-id and
 * a browser-like User-Agent.
 *
 * Premium/render are opt-in because they can consume substantially more
 * ScraperAPI credits.
 */
async function scrapeViaScraperApi(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;
  const params = new URLSearchParams({
    api_key: SCRAPERAPI_KEY,
    url: targetUrl,
    keep_headers: "true",
    country_code: process.env.SCRAPERAPI_COUNTRY_CODE || "us",
  });

  if (process.env.SCRAPERAPI_PREMIUM === "true") params.set("premium", "true");

  const response = await fetch(`https://api.scraperapi.com/?${params.toString()}`, {
    method: "GET",
    headers: {
      "x-ig-app-id": "936619743392459",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(70_000),
    cache: "no-store",
  });

  if (response.ok) {
    const json = await response.json();
    return parseInstagramWebProfileJson(username, json, limit, "scraperapi");
  }

  const body = await response.text().catch(() => "");
  console.warn(
    `[Scraper] ScraperAPI profile endpoint returned ${response.status}: ${responseSnippet(body)}`
  );

  // HTML fallback is intentionally separate. It can recover profile metadata
  // when the JSON endpoint is unavailable, but it may not contain reel data.
  return scrapeInstagramHtmlViaScraperApi(username, limit);
}

async function scrapeInstagramHtmlViaScraperApi(
  username: string,
  limit: number
): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
  const params = new URLSearchParams({
    api_key: SCRAPERAPI_KEY,
    url: targetUrl,
    country_code: process.env.SCRAPERAPI_COUNTRY_CODE || "us",
  });

  if (process.env.SCRAPERAPI_PREMIUM === "true") params.set("premium", "true");
  if (process.env.SCRAPERAPI_RENDER === "true") params.set("render", "true");

  const response = await fetch(`https://api.scraperapi.com/?${params.toString()}`, {
    method: "GET",
    signal: AbortSignal.timeout(70_000),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `ScraperAPI HTML returned status ${response.status}${body ? `: ${responseSnippet(body)}` : ""}`
    );
  }

  const html = await response.text();
  const metaMatch = html.match(
    /content="([0-9,.KkMmB]+)\\s*Followers,\\s*([0-9,.KkMmB]+)\\s*Following,\\s*([0-9,.KkMmB]+)\\s*Posts/i
  );

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
  if (clean.endsWith("M")) return Math.round(parseFloat(clean) * 1_000_000);
  if (clean.endsWith("B")) return Math.round(parseFloat(clean) * 1_000_000_000);
  return parseInt(clean, 10) || 0;
}

/**
 * Direct Instagram web endpoint.
 *
 * This is deliberately a last resort because Vercel/shared cloud IPs can
 * receive 429s from Instagram. We retry only a small number of times and
 * honor Retry-After when Instagram provides it.
 */
async function scrapeViaDirectInstagram(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < DIRECT_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "x-ig-app-id": "936619743392459",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });

      if (response.ok) {
        const json = await response.json();
        return parseInstagramWebProfileJson(username, json, limit, "instagram_direct");
      }

      const body = await response.text().catch(() => "");
      lastError = new Error(
        `Direct Instagram responded with status ${response.status}${body ? `: ${responseSnippet(body)}` : ""}`
      );

      if (response.status !== 429 || attempt === DIRECT_RETRY_ATTEMPTS - 1) break;
      await sleep(retryAfterMs(response, 1200 * (attempt + 1)));
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      break;
    }
  }

  throw lastError || new Error("Direct Instagram failed.");
}

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
    followerCount: Number(user.edge_followed_by?.count) || 0,
    followingCount: Number(user.edge_follow?.count) || 0,
    isVerified: Boolean(user.is_verified),
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
    reels,
    source,
  };
}

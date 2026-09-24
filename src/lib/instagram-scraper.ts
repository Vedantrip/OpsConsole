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
  source: "scrapedo" | "instagram_direct";
};

const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN || process.env.SCRAPE_DO_TOKEN || "";

const REQUEST_TIMEOUT_MS = 20_000;
const DIRECT_RETRY_ATTEMPTS = 1;
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
 * This route no longer depends on Apify, RapidAPI, or ScraperAPI.
 * Scrape.do is the primary public-data provider and direct Instagram is
 * retained only as a last-resort fallback.
 *
 * Provider order:
 *   1. Scrape.do
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

  if (SCRAPEDO_TOKEN) {
    try {
      const data = await scrapeViaScrapeDo(cleanUsername, reelsLimit);
      if (data && (data.followerCount > 0 || data.reels.length > 0)) return data;
      errors.push("Scrape.do: response did not contain usable profile/reel data.");
    } catch (err: any) {
      console.warn("[Scraper] Scrape.do failed:", err?.message || err);
      errors.push(`Scrape.do: ${err?.message || err}`);
    }
  } else {
    errors.push("Scrape.do: SCRAPEDO_TOKEN is not configured.");
  }

  // Direct Instagram is retained only as a last-resort public-data fallback.
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
   * Scrape.do provider.
   *
   * Uses Scrape.do's proxy API against Instagram's public web_profile_info
   * endpoint. The request is made through Scrape.do rather than the Vercel
   * function's own IP, which avoids relying on the shared Vercel-origin IP.
   */
async function scrapeViaScrapeDo(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl =
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  // A 502/ROTATION_FAILED from the datacenter pool is a Scrape.do
  // proxy-layer failure, not an Instagram response. Automatically retry once
  // with the residential/mobile pool; failed 502s do not consume credits.
  const attempts = [
    { super: false },
    { super: true },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    const params = new URLSearchParams({
      token: SCRAPEDO_TOKEN,
      url: targetUrl,
      customHeaders: "true",
      forwardHeaders: "true",
      timeout: "60000",
    });

    if (attempt.super) params.set("super", "true");
    params.set("geoCode", process.env.SCRAPEDO_GEO_CODE || "us");

    const response = await fetch(`https://api.scrape.do/?${params.toString()}`, {
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
      return parseInstagramWebProfileJson(username, json, limit, "scrapedo");
    }

    const body = await response.text().catch(() => "");
    lastError = new Error(
      `Scrape.do responded with status ${response.status}${body ? `: ${responseSnippet(body)}` : ""}`
    );

    if (!attempt.super && (response.status === 403 || response.status === 429 || response.status === 503)) {
      continue;
    }

    break;
  }

  throw lastError || new Error("Scrape.do failed.");
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
  source: "scrapedo" | "instagram_direct"
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

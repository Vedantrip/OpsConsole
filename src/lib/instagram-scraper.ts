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
  postsCount?: number;
  isVerified: boolean;
  profilePicUrl?: string;
  category?: string | null;
  externalUrl?: string | null;
  reels: ScrapedReel[];
  source: "instagram_api" | "scrapedo" | "instagram_direct";
  dataQuality?: "complete" | "profile_only" | "insufficient";
};

const INSTAGRAM_API_KEY = process.env.INSTAGRAM_API_KEY || "";
const INSTAGRAM_API_BASE_URL = "https://api.instagramapi.dev/v1";
const SCRAPEDO_TOKEN = process.env.SCRAPEDO_TOKEN || process.env.SCRAPE_DO_TOKEN || "";

const INSTAGRAM_PROFILE_APP_ID =
  process.env.INSTAGRAM_PROFILE_APP_ID || "3419628305025917";
const INSTAGRAM_PROFILE_USER_AGENT =
  process.env.INSTAGRAM_PROFILE_USER_AGENT ||
  "Mozilla/5.0 (Linux; Android 14; SM-S921B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 Instagram 340.0.0.36.90 Android (34/14; 480dpi; 1080x2340; samsung; SM-S921B; e1s; s5e9945; en_US; 629151101)";

const REQUEST_TIMEOUT_MS = 20_000;
const DIRECT_RETRY_ATTEMPTS = 2;

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

function normalizeApiError(status: number, body: any) {
  const code = body?.error?.code || body?.code || body?.error_code;
  const message = body?.error?.message || body?.message || body?.error;
  return code ? `${code}${message ? `: ${message}` : ""}` : `HTTP ${status}`;
}

function apiHeaders() {
  return {
    Authorization: `Bearer ${INSTAGRAM_API_KEY}`,
    Accept: "application/json",
  };
}

async function fetchInstagramApiJson(path: string, handle: string) {
  const url = `${INSTAGRAM_API_BASE_URL}${path}?handle=${encodeURIComponent(handle)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    next: { revalidate: 21_600 },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Instagram API ${normalizeApiError(response.status, body)}`);
    (error as any).status = response.status;
    (error as any).code = body?.error?.code || body?.code;
    throw error;
  }

  return body;
}

function parseInstagramApiProfile(username: string, json: any): Omit<ScrapedProfile, "reels" | "source" | "dataQuality"> {
  const profile = json?.data || {};
  return {
    username: String(profile.username || username),
    fullName: String(profile.full_name || profile.username || username),
    biography: String(profile.biography || ""),
    followerCount: Number(profile.followers) || 0,
    followingCount: Number(profile.following) || 0,
    postsCount: Number(profile.posts) || 0,
    isVerified: Boolean(profile.is_verified),
    profilePicUrl: profile.profile_pic_url || undefined,
    category: profile.category ?? null,
    externalUrl: profile.external_url ?? null,
  };
}

function parseInstagramApiReels(username: string, json: any, limit: number): ScrapedReel[] {
  const items = Array.isArray(json?.data?.items) ? json.data.items : [];
  return items.slice(0, limit).map((item: any) => ({
    shortCode: item?.shortcode || undefined,
    url: item?.url || (item?.shortcode ? `https://www.instagram.com/p/${item.shortcode}/` : undefined),
    caption: item?.caption || "",
    timestamp: item?.taken_at || undefined,
    videoPlayCount: typeof item?.view_count === "number" ? item.view_count : undefined,
    videoViewCount: typeof item?.view_count === "number" ? item.view_count : undefined,
    likesCount: typeof item?.like_count === "number" ? item.like_count : undefined,
    commentsCount: typeof item?.comment_count === "number" ? item.comment_count : undefined,
    isVideo: item?.type === "video" || item?.product_type === "clips" || item?.video_url != null,
    inputUrl: username ? `https://www.instagram.com/${username}/` : undefined,
  }));
}

async function scrapeViaInstagramApi(username: string, limit: number): Promise<ScrapedProfile> {
  const [profileResult, reelsResult] = await Promise.allSettled([
    fetchInstagramApiJson("/profile", username),
    fetchInstagramApiJson("/profile/reels", username),
  ]);

  const profileError = profileResult.status === "rejected" ? profileResult.reason : null;
  const reelsError = reelsResult.status === "rejected" ? reelsResult.reason : null;

  if (profileResult.status === "rejected" && reelsResult.status === "rejected") {
    throw new Error(
      `Profile: ${profileError instanceof Error ? profileError.message : String(profileError)}; Reels: ${reelsError instanceof Error ? reelsError.message : String(reelsError)}`
    );
  }

  const profile = profileResult.status === "fulfilled"
    ? parseInstagramApiProfile(username, profileResult.value)
    : {
        username,
        fullName: username,
        biography: "",
        followerCount: 0,
        followingCount: 0,
        postsCount: 0,
        isVerified: false,
      };

  const reels = reelsResult.status === "fulfilled"
    ? parseInstagramApiReels(username, reelsResult.value, limit)
    : [];

  if (reelsResult.status === "rejected" && profileResult.status === "fulfilled") {
    console.warn("[Instagram API] Reels endpoint failed; returning profile-only data:", reelsError);
  }

  return {
    ...profile,
    reels,
    source: "instagram_api",
    dataQuality: reels.length > 0 ? "complete" : "profile_only",
  };
}

export async function scrapeInstagramData(
  username: string,
  reelsLimit: number = 12
): Promise<ScrapedProfile> {
  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Instagram username cannot be empty.");

  const errors: string[] = [];

  // Primary provider. Profile + reels are fetched concurrently for latency, but each
  // endpoint is independently cached for 6 hours by Next's data cache.
  if (INSTAGRAM_API_KEY) {
    try {
      return await scrapeViaInstagramApi(cleanUsername, reelsLimit);
    } catch (err: any) {
      console.warn("[Instagram API] Primary provider failed:", err?.message || err);
      errors.push(`Instagram API: ${err?.message || err}`);
    }
  } else {
    errors.push("Instagram API: INSTAGRAM_API_KEY is not configured.");
  }

  // Free fallback. This is only reached when the primary API cannot return a profile.
  try {
    const data = await scrapeViaDirectInstagram(cleanUsername, reelsLimit);
    if (data.followerCount > 0 || data.reels.length > 0) return data;
    errors.push("DirectAPI: response did not contain usable profile/reel data.");
  } catch (err: any) {
    console.warn("[Scraper] Direct Web API failed:", err?.message || err);
    errors.push(`DirectAPI: ${err?.message || err}`);
  }

  // Paid emergency fallback. Keep this to one request: retries here can burn credits
  // without improving the audit enough to justify the cost.
  if (SCRAPEDO_TOKEN) {
    try {
      const data = await scrapeViaScrapeDo(cleanUsername, reelsLimit);
      if (data.followerCount > 0 || data.reels.length > 0) return data;
      errors.push("Scrape.do: response did not contain usable profile/reel data.");
    } catch (err: any) {
      console.warn("[Scraper] Scrape.do emergency fallback failed:", err?.message || err);
      errors.push(`Scrape.do: ${err?.message || err}`);
    }
  }

  throw new Error(
    `All Instagram providers failed for @${cleanUsername}. Errors: ${errors.join("; ")}`
  );
}

async function scrapeViaScrapeDo(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl =
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  const params = new URLSearchParams({
    token: SCRAPEDO_TOKEN,
    url: targetUrl,
    extraHeaders: "true",
    transparentResponse: "true",
    timeout: "60000",
    geoCode: process.env.SCRAPEDO_GEO_CODE || "us",
  });

  const response = await fetch(`https://api.scrape.do/?${params.toString()}`, {
    method: "GET",
    headers: {
      "Sd-x-ig-app-id": INSTAGRAM_PROFILE_APP_ID,
      "Sd-User-Agent": INSTAGRAM_PROFILE_USER_AGENT,
      "Sd-Accept": "application/json,text/plain,*/*",
      "Sd-Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(70_000),
    cache: "no-store",
  });

  if (response.ok) {
    const json = await response.json();
    return parseInstagramWebProfileJson(username, json, limit, "scrapedo");
  }

  const body = await response.text().catch(() => "");
  throw new Error(
    `Scrape.do responded with status ${response.status}${body ? `: ${responseSnippet(body)}` : ""}`
  );
}

async function scrapeViaDirectInstagram(username: string, limit: number): Promise<ScrapedProfile> {
  const targetUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
    username
  )}`;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < DIRECT_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "x-ig-app-id": INSTAGRAM_PROFILE_APP_ID,
          "User-Agent": INSTAGRAM_PROFILE_USER_AGENT,
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
    postsCount: Number(user.edge_owner_to_timeline_media?.count) || 0,
    isVerified: Boolean(user.is_verified),
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
    reels,
    source,
    dataQuality: reels.length > 0 ? "complete" : "profile_only",
  };
}

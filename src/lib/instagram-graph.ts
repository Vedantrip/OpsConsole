import { buildFullIntelligence } from "./instagram-intelligence";

const META_CLIENT_ID =
  process.env.META_CLIENT_ID ||
  process.env.INSTAGRAM_CLIENT_ID ||
  process.env.NEXT_PUBLIC_META_CLIENT_ID ||
  "";
const META_CLIENT_SECRET =
  process.env.META_CLIENT_SECRET ||
  process.env.INSTAGRAM_CLIENT_SECRET ||
  "";

const INSTAGRAM_AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

function assertMetaConfig() {
  if (!META_CLIENT_ID || !META_CLIENT_SECRET) {
    throw new Error(
      "Meta Instagram OAuth is not configured. Set META_CLIENT_ID and META_CLIENT_SECRET in the server environment."
    );
  }
}

function graphUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const url = new URL(`${INSTAGRAM_GRAPH_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function instagramGraphGet<T = any>(
  path: string,
  accessToken: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const response = await fetch(graphUrl(path, { ...params, access_token: accessToken }), {
    method: "GET",
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      response.statusText ||
      "Instagram Graph API request failed.";
    throw new Error(`Instagram Graph API request failed (${response.status}): ${message}`);
  }

  return data as T;
}

export function getBaseAppUrl(origin?: string): string {
  if (origin && origin.startsWith("http")) return origin.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

/**
 * Current Instagram API with Instagram Login.
 *
 * This intentionally does not use the legacy Facebook Login scopes
 * (instagram_basic, instagram_manage_insights, pages_show_list,
 * pages_read_engagement).
 */
export function getInstagramOAuthUrl(connectToken: string, origin?: string): string {
  assertMetaConfig();

  const baseUrl = getBaseAppUrl(origin);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const scopes = ["instagram_business_basic", "instagram_business_manage_insights"].join(",");

  const params = new URLSearchParams({
    client_id: META_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state: connectToken,
    enable_fb_login: "0",
  });

  return `${INSTAGRAM_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  origin?: string
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  assertMetaConfig();

  const baseUrl = getBaseAppUrl(origin);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // Step 1: authorization code -> short-lived Instagram access token.
  const form = new URLSearchParams({
    client_id: META_CLIENT_ID,
    client_secret: META_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const shortRes = await fetch(INSTAGRAM_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const shortData = await shortRes.json().catch(() => null);

  if (!shortRes.ok || !shortData?.access_token) {
    throw new Error(
      shortData?.error_message ||
        shortData?.error?.message ||
        "Failed to exchange the Instagram authorization code for an access token."
    );
  }

  // Step 2: short-lived Instagram token -> long-lived token (~60 days).
  const longRes = await fetch(
    graphUrl("/access_token", {
      grant_type: "ig_exchange_token",
      client_secret: META_CLIENT_SECRET,
      access_token: shortData.access_token,
    }),
    { method: "GET", cache: "no-store" }
  );
  const longData = await longRes.json().catch(() => null);

  if (!longRes.ok || !longData?.access_token) {
    throw new Error(
      longData?.error?.message ||
        "Instagram authorization succeeded, but the long-lived token exchange failed."
    );
  }

  return {
    accessToken: longData.access_token,
    expiresInSeconds: Number(longData.expires_in) || 60 * 24 * 60 * 60,
  };
}

function parseBreakdown(response: any): { label: string; value: number }[] {
  const results =
    response?.data?.[0]?.total_value?.breakdowns
      ?.flatMap((entry: any) => entry?.results || [])
      ?.map((entry: any) => ({
        label: String(entry?.dimension_values?.[entry.dimension_values.length - 1] || ""),
        value: Number(entry?.value) || 0,
      }))
      ?.filter((entry: { label: string; value: number }) => entry.label) || [];

  return results
    .sort((a: { value: number }, b: { value: number }) => b.value - a.value)
    .slice(0, 10);
}

async function fetchFollowerDemographics(instagramAccountId: string, accessToken: string) {
  const result: Record<string, { label: string; value: number }[]> = {
    age: [],
    gender: [],
    city: [],
    country: [],
  };

  for (const breakdown of ["age", "gender", "city", "country"]) {
    try {
      const response = await instagramGraphGet(
        `/${instagramAccountId}/insights`,
        accessToken,
        {
          metric: "follower_demographics",
          period: "lifetime",
          timeframe: "last_90_days",
          breakdown,
          metric_type: "total_value",
        }
      );
      result[breakdown] = parseBreakdown(response);
    } catch (error) {
      console.warn(`Instagram follower demographics (${breakdown}) unavailable:`, error);
    }
  }

  return result;
}

async function fetchAccountInsights(instagramAccountId: string, accessToken: string) {
  try {
    const response = await instagramGraphGet(
      `/${instagramAccountId}/insights`,
      accessToken,
      {
        metric: "views,reach,accounts_engaged,total_interactions,likes,comments,shares,saves",
        period: "day",
        metric_type: "total_value",
      }
    );

    const metrics: Record<string, number> = {};
    for (const item of response?.data || []) {
      const value = item?.total_value?.value ?? item?.values?.[0]?.value;
      if (value !== undefined) metrics[item.name] = Number(value) || 0;
    }
    return metrics;
  } catch (error) {
    console.warn("Instagram account insights unavailable:", error);
    return {};
  }
}

export async function fetchInstagramCreatorInsights(accessToken: string) {
  // Instagram Login returns the connected professional account directly.
  const profileData = await instagramGraphGet<any>("/me", accessToken, {
    fields:
      "user_id,username,name,account_type,profile_picture_url,followers_count,follows_count,media_count",
  });

  const igAccountId = profileData?.user_id || profileData?.id;
  if (!igAccountId) {
    throw new Error("Instagram authorized successfully, but no Instagram account ID was returned.");
  }

  const [accountInsights, demographics] = await Promise.all([
    fetchAccountInsights(igAccountId, accessToken),
    fetchFollowerDemographics(igAccountId, accessToken),
  ]);

  const mediaData = await instagramGraphGet<any>(`/${igAccountId}/media`, accessToken, {
    fields:
      "id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count",
    limit: 25,
  });
  const mediaList = Array.isArray(mediaData?.data) ? mediaData.data : [];

  let totalLikes = 0;
  let totalComments = 0;
  let totalReach = 0;
  let analyzedMediaCount = 0;
  const postDates: Date[] = [];

  for (const media of mediaList) {
    analyzedMediaCount++;
    totalLikes += Number(media.like_count) || 0;
    totalComments += Number(media.comments_count) || 0;
    if (media.timestamp) postDates.push(new Date(media.timestamp));

    try {
      const itemInsights = await instagramGraphGet<any>(
        `/${media.id}/insights`,
        accessToken,
        {
          metric: "views,reach,likes,comments,saved,shares,total_interactions",
        }
      );

      for (const metric of itemInsights?.data || []) {
        if (metric.name === "reach") {
          totalReach += Number(metric.values?.[0]?.value ?? metric.total_value?.value) || 0;
        }
      }
    } catch {
      // Some metrics/media types can be unavailable; keep profile/media data.
    }
  }

  const followers = Number(profileData.followers_count) || 0;
  const avgLikes = analyzedMediaCount > 0 ? Math.round(totalLikes / analyzedMediaCount) : 0;
  const avgComments = analyzedMediaCount > 0 ? Math.round(totalComments / analyzedMediaCount) : 0;
  const avgReach =
    analyzedMediaCount > 0 && totalReach > 0
      ? Math.round(totalReach / analyzedMediaCount)
      : null;

  const insightLikes = Number(accountInsights.likes) || 0;
  const insightComments = Number(accountInsights.comments) || 0;
  const insightReach = Number(accountInsights.reach) || 0;
  const insightViews = Number(accountInsights.views) || 0;
  const engagementNumerator =
    Number(accountInsights.total_interactions) || insightLikes + insightComments;

  const engagementRate =
    followers > 0 ? Number(((engagementNumerator / followers) * 100).toFixed(2)) : 0;

  let avgDaysBetweenPosts: number | null = null;
  let consistencyLabel = "Consistent";
  if (postDates.length >= 2) {
    postDates.sort((a, b) => b.getTime() - a.getTime());
    const spanDays = Math.max(
      1,
      (postDates[0].getTime() - postDates[postDates.length - 1].getTime()) /
        (1000 * 60 * 60 * 24)
    );
    avgDaysBetweenPosts = Number((spanDays / (postDates.length - 1)).toFixed(1));
    if (avgDaysBetweenPosts <= 3) consistencyLabel = "Very Consistent";
    else if (avgDaysBetweenPosts <= 7) consistencyLabel = "Consistent";
    else if (avgDaysBetweenPosts <= 14) consistencyLabel = "Somewhat Consistent";
    else consistencyLabel = "Highly Inconsistent";
  }

  const primaryViews = insightViews || insightReach || avgReach || 0;
  const performancePayload = {
    followerCount: followers,
    avgViews: primaryViews || avgLikes * 8,
    avgLikes: insightLikes || avgLikes,
    avgComments: insightComments || avgComments,
    avgEngagementRatePct: engagementRate,
    avgDaysBetweenPosts,
    viewToFollowerRatioPct:
      followers > 0 && primaryViews ? Math.round((primaryViews / followers) * 100) : null,
    consistency: { label: consistencyLabel },
    reelsAnalyzed: analyzedMediaCount,
  };

  const formattedGender = demographics.gender.map((entry) => ({
    label:
      entry.label === "F"
        ? "Female"
        : entry.label === "M"
          ? "Male"
          : "Other / Unspecified",
    value: entry.value,
  }));

  const audiencePayload = {
    source: "official_instagram_graph_api",
    confidence: "high",
    gender: formattedGender,
    age: demographics.age,
    locations:
      demographics.city.length > 0 ? demographics.city : demographics.country,
    interests: [],
    profile: {
      followers,
      following: Number(profileData.follows_count) || 0,
      posts: Number(profileData.media_count) || 0,
      verified: false,
      profileUrl: profileData.username
        ? `https://www.instagram.com/${profileData.username}/`
        : null,
    },
  };

  const fullIntelligence = buildFullIntelligence(
    profileData.username || "creator",
    performancePayload,
    audiencePayload
  );

  return {
    instagramAccountId: String(igAccountId),
    pageName: "",
    profile: {
      username: profileData.username,
      name: profileData.name,
      biography: null,
      profilePictureUrl: profileData.profile_picture_url,
      followersCount: followers,
      followsCount: Number(profileData.follows_count) || 0,
      mediaCount: Number(profileData.media_count) || 0,
      accountType: profileData.account_type || null,
    },
    demographics: {
      age: demographics.age,
      gender: formattedGender,
      topCities: demographics.city,
      topCountries: demographics.country,
      totalAudienceSample: demographics.gender.reduce(
        (sum, entry) => sum + entry.value,
        0
      ),
    },
    accountInsights: {
      ...accountInsights,
      reach: insightReach,
      views: insightViews,
      likes: insightLikes,
      comments: insightComments,
    },
    recentMedia: mediaList.slice(0, 10).map((media: any) => ({
      id: media.id,
      caption: media.caption,
      mediaType: media.media_type,
      mediaProductType: media.media_product_type,
      timestamp: media.timestamp,
      permalink: media.permalink,
      likeCount: media.like_count,
      commentsCount: media.comments_count,
    })),
    performance: performancePayload,
    scores: fullIntelligence.scores,
  };
}

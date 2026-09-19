import { buildFullIntelligence } from "./instagram-intelligence";

const META_CLIENT_ID = process.env.META_CLIENT_ID || process.env.INSTAGRAM_CLIENT_ID || process.env.NEXT_PUBLIC_META_CLIENT_ID || "";
const META_CLIENT_SECRET = process.env.META_CLIENT_SECRET || process.env.INSTAGRAM_CLIENT_SECRET || "";

export function getBaseAppUrl(origin?: string): string {
  if (origin && origin.startsWith("http")) return origin.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function getInstagramOAuthUrl(connectToken: string, origin?: string): string {
  const baseUrl = getBaseAppUrl(origin);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;
  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
    "public_profile",
  ].join(",");

  const params = new URLSearchParams({
    client_id: META_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: "code",
    state: connectToken,
  });

  return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, origin?: string): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const baseUrl = getBaseAppUrl(origin);
  const redirectUri = `${baseUrl}/api/auth/instagram/callback`;

  // Step 1: Exchange code for short-lived token
  const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(
    META_CLIENT_ID
  )}&client_secret=${encodeURIComponent(META_CLIENT_SECRET)}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&code=${encodeURIComponent(code)}`;

  const shortRes = await fetch(tokenUrl, { method: "GET" });
  const shortData = await shortRes.json();

  if (!shortRes.ok || !shortData.access_token) {
    throw new Error(shortData.error?.message || "Failed to exchange authorization code for access token with Meta.");
  }

  const shortLivedToken = shortData.access_token;

  // Step 2: Exchange for long-lived token (valid for ~60 days)
  const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(
    META_CLIENT_ID
  )}&client_secret=${encodeURIComponent(META_CLIENT_SECRET)}&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;

  const longRes = await fetch(longTokenUrl, { method: "GET" });
  const longData = await longRes.json();

  if (longRes.ok && longData.access_token) {
    return {
      accessToken: longData.access_token,
      expiresInSeconds: Number(longData.expires_in) || 60 * 24 * 60 * 60, // default ~60 days
    };
  }

  return {
    accessToken: shortLivedToken,
    expiresInSeconds: Number(shortData.expires_in) || 60 * 60,
  };
}

export async function fetchInstagramCreatorInsights(accessToken: string) {
  // Step 1: Find connected Instagram Business / Creator Account
  const accountsRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url},name&access_token=${encodeURIComponent(
      accessToken
    )}`
  );
  const accountsData = await accountsRes.json();

  let igAccountId: string | null = null;
  let pageName = "";

  if (Array.isArray(accountsData.data)) {
    for (const page of accountsData.data) {
      if (page.instagram_business_account?.id) {
        igAccountId = page.instagram_business_account.id;
        pageName = page.name;
        break;
      }
    }
  }

  // Fallback direct check
  if (!igAccountId) {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`
    );
    const meData = await meRes.json();
    if (meData.instagram_business_account?.id) {
      igAccountId = meData.instagram_business_account.id;
    }
  }

  if (!igAccountId) {
    throw new Error(
      "No Instagram Creator or Business Account found linked to your Facebook Pages. Please ensure your Instagram profile is a Creator/Business account and connected to a Facebook Page."
    );
  }

  // Step 2: Fetch Creator Profile
  const profileRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website&access_token=${encodeURIComponent(
      accessToken
    )}`
  );
  const profileData = await profileRes.json();

  // Step 3: Fetch Audience Demographics
  let rawDemographics: any = null;
  try {
    const demoRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=audience_gender_age,audience_city,audience_country&period=lifetime&access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    if (demoRes.ok) {
      const demoData = await demoRes.json();
      rawDemographics = demoData.data || [];
    }
  } catch (err) {
    console.warn("Could not fetch lifetime demographic insights:", err);
  }

  // Parse demographics
  const ageDistribution: Record<string, number> = {};
  let femaleCount = 0;
  let maleCount = 0;
  let otherCount = 0;
  let totalGenderAgeCount = 0;
  const topCities: { label: string; value: number }[] = [];
  const topCountries: { label: string; value: number }[] = [];

  if (Array.isArray(rawDemographics)) {
    for (const metric of rawDemographics) {
      const values = metric.values?.[0]?.value || {};
      if (metric.name === "audience_gender_age") {
        for (const [key, count] of Object.entries(values)) {
          const numCount = Number(count) || 0;
          totalGenderAgeCount += numCount;
          const [gender, bracket] = key.split(".");
          if (gender === "F") femaleCount += numCount;
          else if (gender === "M") maleCount += numCount;
          else otherCount += numCount;

          if (bracket) {
            ageDistribution[bracket] = (ageDistribution[bracket] || 0) + numCount;
          }
        }
      } else if (metric.name === "audience_city") {
        for (const [city, count] of Object.entries(values)) {
          topCities.push({ label: city, value: Number(count) || 0 });
        }
      } else if (metric.name === "audience_country") {
        for (const [country, count] of Object.entries(values)) {
          topCountries.push({ label: country, value: Number(count) || 0 });
        }
      }
    }
  }

  // Calculate percentages
  const formattedAge: { label: string; value: number }[] = [];
  for (const [bracket, count] of Object.entries(ageDistribution)) {
    const pct = totalGenderAgeCount > 0 ? Math.round((count / totalGenderAgeCount) * 100) : 0;
    formattedAge.push({ label: bracket, value: pct });
  }

  const formattedGender: { label: string; value: number }[] = [];
  if (totalGenderAgeCount > 0) {
    formattedGender.push({ label: "Female", value: Math.round((femaleCount / totalGenderAgeCount) * 100) });
    formattedGender.push({ label: "Male", value: Math.round((maleCount / totalGenderAgeCount) * 100) });
    if (otherCount > 0) {
      formattedGender.push({ label: "Other / Unspecified", value: Math.round((otherCount / totalGenderAgeCount) * 100) });
    }
  }

  const sortedCities = topCities.sort((a, b) => b.value - a.value).slice(0, 5);
  const sortedCountries = topCountries.sort((a, b) => b.value - a.value).slice(0, 5);

  // Step 4: Fetch Recent Media (up to 25 items)
  const mediaRes = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count&limit=25&access_token=${encodeURIComponent(
      accessToken
    )}`
  );
  const mediaData = await mediaRes.json();
  const mediaList = Array.isArray(mediaData.data) ? mediaData.data : [];

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

    // Optional per-media insights
    try {
      const itemInsightRes = await fetch(
        `https://graph.facebook.com/v19.0/${media.id}/insights?metric=reach,saved,shares&access_token=${encodeURIComponent(
          accessToken
        )}`
      );
      if (itemInsightRes.ok) {
        const itemInsights = await itemInsightRes.json();
        if (Array.isArray(itemInsights.data)) {
          for (const m of itemInsights.data) {
            if (m.name === "reach") totalReach += Number(m.values?.[0]?.value) || 0;
          }
        }
      }
    } catch {
      // Continue if item insights are restricted on certain formats
    }
  }

  // Calculate averages
  const followers = Number(profileData.followers_count) || 0;
  const avgLikes = analyzedMediaCount > 0 ? Math.round(totalLikes / analyzedMediaCount) : 0;
  const avgComments = analyzedMediaCount > 0 ? Math.round(totalComments / analyzedMediaCount) : 0;
  const avgReach = analyzedMediaCount > 0 && totalReach > 0 ? Math.round(totalReach / analyzedMediaCount) : null;
  const engagementRate =
    followers > 0 && analyzedMediaCount > 0
      ? Number((((totalLikes + totalComments) / analyzedMediaCount / followers) * 100).toFixed(2))
      : 0;

  // Posting consistency calculation
  let avgDaysBetweenPosts: number | null = null;
  let consistencyLabel = "Consistent";
  if (postDates.length >= 2) {
    postDates.sort((a, b) => b.getTime() - a.getTime());
    const first = postDates[0].getTime();
    const last = postDates[postDates.length - 1].getTime();
    const spanDays = Math.max(1, (first - last) / (1000 * 60 * 60 * 24));
    avgDaysBetweenPosts = Number((spanDays / (postDates.length - 1)).toFixed(1));
    if (avgDaysBetweenPosts <= 3) consistencyLabel = "Very Consistent";
    else if (avgDaysBetweenPosts <= 7) consistencyLabel = "Consistent";
    else if (avgDaysBetweenPosts <= 14) consistencyLabel = "Somewhat Consistent";
    else consistencyLabel = "Highly Inconsistent";
  }

  // Build performance payload
  const performancePayload = {
    followerCount: followers,
    avgViews: avgReach ?? avgLikes * 8,
    avgLikes,
    avgComments,
    avgEngagementRatePct: engagementRate,
    avgDaysBetweenPosts,
    viewToFollowerRatioPct: followers > 0 && avgReach ? Math.round((avgReach / followers) * 100) : null,
    consistency: { label: consistencyLabel },
    reelsAnalyzed: analyzedMediaCount,
  };

  const audiencePayload = {
    source: "official_instagram_graph_api",
    confidence: "high",
    gender: formattedGender,
    age: formattedAge,
    locations: sortedCities.length > 0 ? sortedCities : sortedCountries,
    interests: [],
    profile: {
      followers,
      following: Number(profileData.follows_count) || 0,
      posts: Number(profileData.media_count) || 0,
      verified: false,
      profileUrl: profileData.website || null,
    },
  };

  // Step 5: Compute MountLift Intelligence Score
  const fullIntelligence = buildFullIntelligence(
    profileData.username || "creator",
    performancePayload,
    audiencePayload
  );

  return {
    instagramAccountId: igAccountId,
    pageName,
    profile: {
      username: profileData.username,
      name: profileData.name,
      biography: profileData.biography,
      profilePictureUrl: profileData.profile_picture_url,
      followersCount: followers,
      followsCount: Number(profileData.follows_count) || 0,
      mediaCount: Number(profileData.media_count) || 0,
    },
    demographics: {
      age: formattedAge,
      gender: formattedGender,
      topCities: sortedCities,
      topCountries: sortedCountries,
      totalAudienceSample: totalGenderAgeCount,
    },
    performance: performancePayload,
    recentMedia: mediaList.slice(0, 10).map((m: any) => ({
      id: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      timestamp: m.timestamp,
      permalink: m.permalink,
      likeCount: m.like_count,
      commentsCount: m.comments_count,
    })),
    scores: fullIntelligence.scores,
  };
}

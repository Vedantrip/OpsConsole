import ExcelJS from "exceljs";

const APIFY_BASE = "https://api.apify.com/v2";
const DEFAULT_REELS_LIMIT = Number(process.env.DEFAULT_REELS_LIMIT || 12);
const DEFAULT_ACTOR_ID = process.env.APIFY_ACTOR_ID || "apify~instagram-reel-scraper";

type RawReel = {
  shortCode?: string;
  url?: string;
  inputUrl?: string;
  caption?: string;
  timestamp?: string;
  videoPlayCount?: number;
  videoViewCount?: number;
  likesCount?: number;
  commentsCount?: number;
};

export type ReelMetrics = {
  username: string;
  reelsAnalyzed: number;
  reelsWithViewData: number;
  avgViews: number;
  medianViews: number;
  avgLikes: number;
  avgComments: number;
  avgEngagementRatePct: number | null;
  consistency: {
    stdDevViews: number;
    coefficientOfVariation: number | null;
    label: string;
  };
  avgDaysBetweenPosts: number | null;
  followerCount: number | null;
  viewToFollowerRatioPct: number | null;
  hiddenLikesCount: number;
  perReel: Array<{
    shortCode: string | null;
    url: string | null;
    caption: string;
    timestamp: string | null;
    views: number | null;
    likes: number | null;
    comments: number;
    likesHidden: boolean;
    engagement: number | null;
    engagementRate: number | null;
  }>;
};

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function round(value: number, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getViews(reel: RawReel) {
  if (typeof reel.videoPlayCount === "number" && reel.videoPlayCount >= 0) return reel.videoPlayCount;
  if (typeof reel.videoViewCount === "number" && reel.videoViewCount >= 0) return reel.videoViewCount;
  return null;
}

function consistencyLabel(coefficientOfVariation: number | null) {
  if (coefficientOfVariation === null) return "Unknown";
  if (coefficientOfVariation < 0.4) return "Very consistent";
  if (coefficientOfVariation < 0.7) return "Consistent";
  if (coefficientOfVariation < 1.1) return "Somewhat inconsistent";
  return "Highly inconsistent";
}

export async function fetchReelsForUsername(username: string, limit = DEFAULT_REELS_LIMIT) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set in the environment.");

  const cleanUsername = username.trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Instagram handle cannot be empty.");

  const actorId = DEFAULT_ACTOR_ID;
  const input = actorId.includes("instagram-reel-scraper")
    ? { username: [cleanUsername], resultsLimit: limit }
    : {
        directUrls: [`https://www.instagram.com/${cleanUsername}/`],
        resultsType: "reels",
        resultsLimit: limit,
      };

  const response = await fetch(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(280_000),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || response.statusText || "Unknown Apify error";
    throw new Error(`Apify request failed (${response.status}): ${message}`);
  }
  if (!Array.isArray(data)) throw new Error("Unexpected response shape from Apify actor");
  return data as RawReel[];
}

export function computeMetricsForUsername(username: string, rawReels: RawReel[], followerCount: number | null = null): ReelMetrics {
  const perReel = (Array.isArray(rawReels) ? rawReels : []).map((reel) => {
    const views = getViews(reel);
    const likes = typeof reel.likesCount === "number" && reel.likesCount >= 0 ? reel.likesCount : null;
    const comments = typeof reel.commentsCount === "number" ? reel.commentsCount : 0;
    const engagement = likes === null ? null : likes + comments;
    return {
      shortCode: reel.shortCode || null,
      url: reel.url || reel.inputUrl || null,
      caption: (reel.caption || "").slice(0, 80),
      timestamp: reel.timestamp || null,
      views,
      likes,
      comments,
      likesHidden: reel.likesCount === -1,
      engagement,
      engagementRate: engagement !== null && views ? engagement / views : null,
    };
  });

  const validViews = perReel.map((reel) => reel.views).filter((value): value is number => value !== null);
  const validLikes = perReel.map((reel) => reel.likes).filter((value): value is number => value !== null);
  const validEngagementRates = perReel.map((reel) => reel.engagementRate).filter((value): value is number => value !== null);
  const averageViews = mean(validViews);
  const coefficientOfVariation = averageViews > 0 ? standardDeviation(validViews) / averageViews : null;
  const timestamps = perReel
    .map((reel) => (reel.timestamp ? new Date(reel.timestamp).getTime() : null))
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((a, b) => a - b);
  const gaps = timestamps.slice(1).map((timestamp, index) => (timestamp - timestamps[index]) / 86_400_000);
  const averageDaysBetweenPosts = gaps.length ? mean(gaps) : null;
  const viewToFollowerRatio = followerCount && followerCount > 0 && averageViews > 0 ? averageViews / followerCount : null;

  return {
    username,
    reelsAnalyzed: perReel.length,
    reelsWithViewData: validViews.length,
    avgViews: round(averageViews),
    medianViews: round(median(validViews)),
    avgLikes: round(mean(validLikes)),
    avgComments: round(mean(perReel.map((reel) => reel.comments))),
    avgEngagementRatePct: validEngagementRates.length ? round(mean(validEngagementRates) * 100, 2) : null,
    consistency: {
      stdDevViews: round(standardDeviation(validViews)),
      coefficientOfVariation: coefficientOfVariation === null ? null : round(coefficientOfVariation, 2),
      label: consistencyLabel(coefficientOfVariation),
    },
    avgDaysBetweenPosts: averageDaysBetweenPosts === null ? null : round(averageDaysBetweenPosts, 1),
    followerCount,
    viewToFollowerRatioPct: viewToFollowerRatio === null ? null : round(viewToFollowerRatio * 100, 2),
    hiddenLikesCount: perReel.filter((reel) => reel.likesHidden).length,
    perReel,
  };
}

export async function analyzeHandles(handles: string[], reelsLimit?: number) {
  const limit = Number(reelsLimit) || DEFAULT_REELS_LIMIT;
  const results: ReelMetrics[] = [];
  const errors: Array<{ handle: string; error: string }> = [];

  for (const handle of handles) {
    try {
      const reels = await fetchReelsForUsername(handle, limit);
      results.push(computeMetricsForUsername(handle.replace(/^@/, ""), reels));
    } catch (error) {
      errors.push({ handle, error: error instanceof Error ? error.message : "Instagram audit failed." });
    }
  }

  return { results, errors };
}

export function toInsightsResult(metrics: ReelMetrics) {
  return {
    username: metrics.username,
    profile: { followers: metrics.followerCount, following: null, posts: null, verified: null, profileUrl: null },
    performance: {
      avgViews: metrics.avgViews,
      medianViews: metrics.medianViews,
      avgLikes: metrics.avgLikes,
      avgComments: metrics.avgComments,
      engagementRate: metrics.avgEngagementRatePct === null ? null : metrics.avgEngagementRatePct / 100,
      postingFrequencyDays: metrics.avgDaysBetweenPosts,
      viewToFollowerRatio: metrics.viewToFollowerRatioPct === null ? null : metrics.viewToFollowerRatioPct / 100,
      reelsAnalyzed: metrics.reelsAnalyzed,
      consistency: metrics.consistency,
    },
    audience: { source: "estimated", confidence: "low", gender: [], age: [], locations: [], interests: [] },
    scores: {},
    reels: metrics.perReel,
  };
}

export async function buildWorkbook(results: ReelMetrics[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MountLift";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Username", key: "username", width: 20 },
    { header: "Reels Analyzed", key: "reelsAnalyzed", width: 15 },
    { header: "Avg Views", key: "avgViews", width: 14 },
    { header: "Median Views", key: "medianViews", width: 14 },
    { header: "Avg Likes", key: "avgLikes", width: 12 },
    { header: "Avg Comments", key: "avgComments", width: 14 },
    { header: "Engagement Rate %", key: "engagementRatePct", width: 20 },
    { header: "Consistency", key: "consistencyLabel", width: 22 },
    { header: "Avg Days Between Posts", key: "avgDaysBetweenPosts", width: 22 },
    { header: "Hidden-Like Reels", key: "hiddenLikesCount", width: 18 },
  ];
  summary.getRow(1).font = { bold: true };
  for (const result of results) {
    summary.addRow({
      username: result.username,
      reelsAnalyzed: result.reelsAnalyzed,
      avgViews: result.avgViews,
      medianViews: result.medianViews,
      avgLikes: result.avgLikes,
      avgComments: result.avgComments,
      engagementRatePct: result.avgEngagementRatePct,
      consistencyLabel: result.consistency.label,
      avgDaysBetweenPosts: result.avgDaysBetweenPosts,
      hiddenLikesCount: result.hiddenLikesCount,
    });
  }

  const detail = workbook.addWorksheet("Reel Detail");
  detail.columns = [
    { header: "Username", key: "username", width: 20 },
    { header: "Shortcode", key: "shortCode", width: 16 },
    { header: "URL", key: "url", width: 40 },
    { header: "Timestamp", key: "timestamp", width: 24 },
    { header: "Views", key: "views", width: 12 },
    { header: "Likes", key: "likes", width: 12 },
    { header: "Likes Hidden?", key: "likesHidden", width: 14 },
    { header: "Comments", key: "comments", width: 12 },
    { header: "Engagement Rate %", key: "engagementRatePct", width: 18 },
    { header: "Caption", key: "caption", width: 40 },
  ];
  detail.getRow(1).font = { bold: true };
  for (const result of results) {
    for (const reel of result.perReel) {
      detail.addRow({
        username: result.username,
        shortCode: reel.shortCode,
        url: reel.url,
        timestamp: reel.timestamp,
        views: reel.views,
        likes: reel.likesHidden ? "hidden" : reel.likes,
        likesHidden: reel.likesHidden ? "Yes" : "No",
        comments: reel.comments,
        engagementRatePct: reel.engagementRate === null ? null : round(reel.engagementRate * 100, 2),
        caption: reel.caption,
      });
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
import { Platform, ContentFormat } from "@prisma/client";
import {
  PostWithRelations,
  computeEngagementRate,
  ComputedInsightsReport,
  ComputedGroupPerformance,
} from "./types/content";

export function generateComputedInsights(posts: PostWithRelations[]): ComputedInsightsReport {
  const totalPosts = posts.length;

  if (totalPosts === 0) {
    return {
      totalPosts: 0,
      averageEngagementRate: null,
      cadence: {
        postsPerWeekRecent: 0,
        postsPerWeekPrior: 0,
        dropPercentage: null,
        longestGapDays: 0,
        description: "No content logged yet for this creator.",
      },
      bestFormat: null,
      worstFormat: null,
      formatSentence: "Log content across multiple formats to unlock performance comparisons.",
      bestTag: null,
      worstTag: null,
      tagSentence: "Add tags to your posts to discover your highest-converting content themes.",
      platformComparison: {
        instagramAvgER: null,
        tiktokAvgER: null,
        sentence: "Log content from Instagram and TikTok to compare multi-platform delivery.",
      },
      trend: {
        recentAvgER: null,
        priorAvgER: null,
        direction: "insufficient",
        percentageChange: null,
        sentence: "At least 4 logged posts are needed to compute engagement velocity and momentum.",
      },
      hasEnoughData: false,
    };
  }

  // Sort chronologically (oldest to newest for cadence and trends)
  const sortedByDate = [...posts].sort(
    (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime()
  );

  // Engagement Rates array with post references
  const postsWithER = sortedByDate.map((p) => ({
    post: p,
    er: computeEngagementRate(p.metrics),
    views: p.metrics?.views ?? 0,
    reach: p.metrics?.reach ?? 0,
  }));

  const validERPosts = postsWithER.filter((p) => p.er !== null);
  const overallAvgER =
    validERPosts.length > 0
      ? validERPosts.reduce((acc, p) => acc + (p.er ?? 0), 0) / validERPosts.length
      : null;

  // 1. Posting Cadence Calculation (Last 4 weeks vs Prior 4 weeks)
  const now = Date.now();
  const msInWeek = 7 * 86400000;
  const recentCutoff = now - 4 * msInWeek;
  const priorCutoff = now - 8 * msInWeek;

  const recentPosts = sortedByDate.filter(
    (p) => new Date(p.postedAt).getTime() >= recentCutoff
  );
  const priorPosts = sortedByDate.filter((p) => {
    const time = new Date(p.postedAt).getTime();
    return time >= priorCutoff && time < recentCutoff;
  });

  const postsPerWeekRecent = recentPosts.length / 4;
  const postsPerWeekPrior = priorPosts.length / 4;

  let cadenceDropPct: number | null = null;
  if (postsPerWeekPrior > 0) {
    cadenceDropPct = Math.round(
      ((postsPerWeekRecent - postsPerWeekPrior) / postsPerWeekPrior) * 100
    );
  }

  // Longest gap between consecutive posts
  let longestGapDays = 0;
  for (let i = 1; i < sortedByDate.length; i++) {
    const gapMs =
      new Date(sortedByDate[i].postedAt).getTime() -
      new Date(sortedByDate[i - 1].postedAt).getTime();
    const gapDays = Math.round(gapMs / 86400000);
    if (gapDays > longestGapDays) longestGapDays = gapDays;
  }

  // Check days since last logged post
  const lastPost = sortedByDate[sortedByDate.length - 1];
  const daysSinceLastPost = Math.round(
    (now - new Date(lastPost.postedAt).getTime()) / 86400000
  );

  let cadenceSentence = "";
  let flagWarning = false;

  if (daysSinceLastPost > 14) {
    cadenceSentence = `No content logged in ${daysSinceLastPost} days. Consider verifying if recent stories or posts need logging.`;
    flagWarning = true;
  } else if (cadenceDropPct !== null && cadenceDropPct < -30) {
    cadenceSentence = `Posting cadence slowed to ${postsPerWeekRecent.toFixed(1)} posts/week (${Math.abs(cadenceDropPct)}% decrease vs prior month).`;
    flagWarning = true;
  } else if (postsPerWeekRecent > 0) {
    cadenceSentence = `Averaging ${postsPerWeekRecent.toFixed(1)} posts/week over the last month. Longest gap between posts was ${longestGapDays} day${longestGapDays === 1 ? "" : "s"}.`;
  } else {
    cadenceSentence = `Logged ${totalPosts} post${totalPosts === 1 ? "" : "s"} so far. Keep logging weekly to maintain cadence tracking.`;
  }

  // 2. Best / Worst Format Breakdown
  const formatGroups = new Map<
    ContentFormat,
    { count: number; totalER: number; validCount: number; totalViews: number; totalReach: number }
  >();

  for (const item of postsWithER) {
    const f = item.post.format;
    const current = formatGroups.get(f) ?? {
      count: 0,
      totalER: 0,
      validCount: 0,
      totalViews: 0,
      totalReach: 0,
    };
    current.count += 1;
    if (item.er !== null) {
      current.totalER += item.er;
      current.validCount += 1;
    }
    current.totalViews += item.views;
    current.totalReach += item.reach;
    formatGroups.set(f, current);
  }

  const formatPerformances: ComputedGroupPerformance[] = Array.from(formatGroups.entries())
    .map(([fmt, data]) => ({
      key: fmt,
      count: data.count,
      avgEngagementRate: data.validCount > 0 ? data.totalER / data.validCount : 0,
      avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
      avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  const bestFormat = formatPerformances[0] ?? null;
  const worstFormat =
    formatPerformances.length > 1
      ? formatPerformances[formatPerformances.length - 1]
      : null;

  let formatSentence = "";
  if (bestFormat && worstFormat && bestFormat.key !== worstFormat.key) {
    const diffPct =
      worstFormat.avgEngagementRate > 0
        ? Math.round(
            ((bestFormat.avgEngagementRate - worstFormat.avgEngagementRate) /
              worstFormat.avgEngagementRate) *
              100
          )
        : 100;
    const bestLabel = bestFormat.key.charAt(0) + bestFormat.key.slice(1).toLowerCase() + "s";
    const worstLabel = worstFormat.key.charAt(0) + worstFormat.key.slice(1).toLowerCase() + "s";
    formatSentence = `${bestLabel} are outperforming ${worstLabel} by ${diffPct}% average engagement (${bestFormat.avgEngagementRate.toFixed(1)}% vs ${worstFormat.avgEngagementRate.toFixed(1)}%).`;
  } else if (bestFormat) {
    const bestLabel = bestFormat.key.charAt(0) + bestFormat.key.slice(1).toLowerCase();
    formatSentence = `${bestLabel} format delivers strong ${bestFormat.avgEngagementRate.toFixed(1)}% engagement rate across ${bestFormat.count} logged post${bestFormat.count === 1 ? "" : "s"}.`;
  } else {
    formatSentence = "Log posts across varied formats to compare performance.";
  }

  // 3. Best / Worst Tag Breakdown
  const tagGroups = new Map<
    string,
    { count: number; totalER: number; validCount: number; totalViews: number; totalReach: number }
  >();

  for (const item of postsWithER) {
    for (const tag of item.post.tags) {
      const current = tagGroups.get(tag.name) ?? {
        count: 0,
        totalER: 0,
        validCount: 0,
        totalViews: 0,
        totalReach: 0,
      };
      current.count += 1;
      if (item.er !== null) {
        current.totalER += item.er;
        current.validCount += 1;
      }
      current.totalViews += item.views;
      current.totalReach += item.reach;
      tagGroups.set(tag.name, current);
    }
  }

  const tagPerformances: ComputedGroupPerformance[] = Array.from(tagGroups.entries())
    .map(([tagName, data]) => ({
      key: tagName,
      count: data.count,
      avgEngagementRate: data.validCount > 0 ? data.totalER / data.validCount : 0,
      avgViews: data.count > 0 ? Math.round(data.totalViews / data.count) : 0,
      avgReach: data.count > 0 ? Math.round(data.totalReach / data.count) : 0,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  const bestTag = tagPerformances[0] ?? null;
  const worstTag =
    tagPerformances.length > 1 ? tagPerformances[tagPerformances.length - 1] : null;

  let tagSentence = "";
  if (bestTag && worstTag && bestTag.key !== worstTag.key) {
    const diffPct =
      worstTag.avgEngagementRate > 0
        ? Math.round(
            ((bestTag.avgEngagementRate - worstTag.avgEngagementRate) /
              worstTag.avgEngagementRate) *
              100
          )
        : 100;
    tagSentence = `Posts tagged #${bestTag.key} generate the highest engagement (${bestTag.avgEngagementRate.toFixed(1)}% ER), outperforming #${worstTag.key} by ${diffPct}%.`;
  } else if (bestTag) {
    tagSentence = `Posts tagged #${bestTag.key} are the primary theme driver with ${bestTag.avgEngagementRate.toFixed(1)}% average engagement.`;
  } else {
    tagSentence = "Add tags to posts (e.g. #tutorial, #unboxing) to track theme conversion.";
  }

  // 4. Platform Comparison
  const igPosts = postsWithER.filter((p) => p.post.platform === Platform.INSTAGRAM && p.er !== null);
  const ttPosts = postsWithER.filter((p) => p.post.platform === Platform.TIKTOK && p.er !== null);

  const igAvgER =
    igPosts.length > 0
      ? igPosts.reduce((acc, p) => acc + (p.er ?? 0), 0) / igPosts.length
      : null;
  const ttAvgER =
    ttPosts.length > 0
      ? ttPosts.reduce((acc, p) => acc + (p.er ?? 0), 0) / ttPosts.length
      : null;

  let platformSentence = "";
  if (igAvgER !== null && ttAvgER !== null) {
    if (ttAvgER > igAvgER) {
      const mult = (ttAvgER / (igAvgER || 1)).toFixed(1);
      platformSentence = `TikTok posts achieve higher engagement rate (${ttAvgER.toFixed(1)}% vs Instagram ${igAvgER.toFixed(1)}%, ~${mult}x).`;
    } else {
      const mult = (igAvgER / (ttAvgER || 1)).toFixed(1);
      platformSentence = `Instagram yields stronger audience interaction (${igAvgER.toFixed(1)}% vs TikTok ${ttAvgER.toFixed(1)}%, ~${mult}x).`;
    }
  } else if (igAvgER !== null) {
    platformSentence = `Instagram performance is healthy at ${igAvgER.toFixed(1)}% average engagement across ${igPosts.length} posts.`;
  } else if (ttAvgER !== null) {
    platformSentence = `TikTok engagement is standing at ${ttAvgER.toFixed(1)}% average across ${ttPosts.length} posts.`;
  } else {
    platformSentence = "Log posts to compare platform metrics.";
  }

  // 5. Trend Analysis (Last 5 posts vs prior 5 posts)
  let trendSentence = "";
  let trendDirection: "up" | "down" | "flat" | "insufficient" = "insufficient";
  let recentAvgER: number | null = null;
  let priorAvgER: number | null = null;
  let trendChangePct: number | null = null;

  if (validERPosts.length >= 4) {
    const half = Math.floor(validERPosts.length / 2);
    const recentBatch = validERPosts.slice(validERPosts.length - half);
    const priorBatch = validERPosts.slice(0, validERPosts.length - half);

    recentAvgER =
      recentBatch.reduce((acc, p) => acc + (p.er ?? 0), 0) / recentBatch.length;
    priorAvgER = priorBatch.reduce((acc, p) => acc + (p.er ?? 0), 0) / priorBatch.length;

    if (priorAvgER > 0) {
      trendChangePct = Math.round(((recentAvgER - priorAvgER) / priorAvgER) * 100);
      if (trendChangePct > 5) {
        trendDirection = "up";
        trendSentence = `Engagement velocity is trending upward (+${trendChangePct}% across recent content vs prior period).`;
      } else if (trendChangePct < -5) {
        trendDirection = "down";
        trendSentence = `Recent engagement softened by ${Math.abs(trendChangePct)}% compared to the prior batch of posts.`;
      } else {
        trendDirection = "flat";
        trendSentence = `Engagement is steady and consistent across recent posts (~${recentAvgER.toFixed(1)}% ER).`;
      }
    }
  } else {
    trendSentence = `Logging ${4 - validERPosts.length} more post${4 - validERPosts.length === 1 ? "" : "s"} will unlock trajectory and velocity insights.`;
  }

  return {
    totalPosts,
    averageEngagementRate: overallAvgER,
    cadence: {
      postsPerWeekRecent,
      postsPerWeekPrior,
      dropPercentage: cadenceDropPct,
      longestGapDays,
      description: cadenceSentence,
      flagWarning,
    },
    bestFormat,
    worstFormat,
    formatSentence,
    bestTag,
    worstTag,
    tagSentence,
    platformComparison: {
      instagramAvgER: igAvgER,
      tiktokAvgER: ttAvgER,
      sentence: platformSentence,
    },
    trend: {
      recentAvgER,
      priorAvgER,
      direction: trendDirection,
      percentageChange: trendChangePct,
      sentence: trendSentence,
    },
    hasEnoughData: totalPosts > 0,
  };
}


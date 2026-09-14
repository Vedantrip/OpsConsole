"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireContext, creatorScope } from "@/lib/access";

function parseNum(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export async function extractInsightMetrics(rawData: any) {
  if (!rawData || typeof rawData !== "object") {
    return {
      avgViews: null, medianViews: null, avgLikes: null, avgComments: null,
      engagementRate: null, consistencyLabel: null, postingFrequencyDays: null,
      viewToFollowerRatio: null, followerCount: null, followingCount: null,
      postCount: null, verified: null, profileUrl: null, overallScore: null,
      engagementScore: null, audienceScore: null, contentQualityScore: null,
      consistencyScore: null, audienceData: {}, topLocations: [], interests: [],
      ageDistribution: [], genderDistribution: [], source: null, sourceVersion: null,
    };
  }

  const r = rawData;
  const performance = r.performance ?? r;
  const profile = r.profile ?? {};
  const audience = r.audience ?? {};
  const scores = r.scores ?? {};

  const avgViews = parseNum(performance.avgViews ?? r.avg_views ?? r.averageViews ?? r.metrics?.avgViews);
  const medianViews = parseNum(performance.medianViews ?? r.median_views ?? r.metrics?.medianViews);
  const avgLikes = parseNum(performance.avgLikes ?? r.avg_likes ?? r.averageLikes ?? r.metrics?.avgLikes);
  const avgComments = parseNum(performance.avgComments ?? r.avg_comments ?? r.averageComments ?? r.metrics?.avgComments);
  const engagementRate = parseNum(performance.engagementRate ?? r.engagementRate ?? r.engagement_rate ?? r.er ?? r.metrics?.engagementRate);

  let consistencyLabel: string | null = null;
  if (typeof performance.consistency === "object" && performance.consistency?.label) consistencyLabel = String(performance.consistency.label);
  else if (performance.consistency) consistencyLabel = String(performance.consistency);
  else if (r.consistencyLabel) consistencyLabel = String(r.consistencyLabel);
  else if (r.consistency_label) consistencyLabel = String(r.consistency_label);

  const postingFrequencyDays = parseNum(performance.postingFrequencyDays ?? performance.avgDaysBetweenPosts ?? r.postingFrequencyDays ?? r.posting_frequency_days ?? r.avgDaysBetweenPosts);
  const viewToFollowerRatio = parseNum(performance.viewToFollowerRatio ?? r.viewToFollowerRatio ?? r.view_to_follower_ratio ?? r.viewToFollower);

  const audienceData = {
    source: audience.source ?? "estimated",
    label: audience.label ?? "Audience Intelligence · Estimated from public signals",
    confidence: audience.confidence ?? "medium",
    gender: Array.isArray(audience.gender) ? audience.gender : [],
    age: Array.isArray(audience.age) ? audience.age : [],
    locations: Array.isArray(audience.locations) ? audience.locations : [],
    interests: Array.isArray(audience.interests) ? audience.interests : [],
  };

  return {
    avgViews, medianViews, avgLikes, avgComments, engagementRate,
    consistencyLabel, postingFrequencyDays, viewToFollowerRatio,
    followerCount: parseNum(profile.followers ?? performance.followerCount),
    followingCount: parseNum(profile.following), postCount: parseNum(profile.posts),
    verified: typeof profile.verified === "boolean" ? profile.verified : null,
    profileUrl: typeof profile.profileUrl === "string" ? profile.profileUrl : null,
    overallScore: parseNum(scores.overall), engagementScore: parseNum(scores.engagement),
    audienceScore: parseNum(scores.audience), contentQualityScore: parseNum(scores.content),
    consistencyScore: parseNum(scores.consistency), audienceData,
    topLocations: audienceData.locations, interests: audienceData.interests,
    ageDistribution: audienceData.age, genderDistribution: audienceData.gender,
    source: audienceData.source, sourceVersion: audience.sourceVersion ?? scores.methodology ?? null,
  };
}

export async function saveInsightSnapshot(handle: string, rawData: any) {
  if (!handle || !rawData) return null;
  const normalizedHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const context = await requireContext();
  const creators = await prisma.creator.findMany({ where: { ...creatorScope(context), handle: { not: null } } });
  const creator = creators.find((c) => c.handle && c.handle.trim().replace(/^@/, "").toLowerCase() === normalizedHandle);
  if (!creator) return null;
  return createInsightSnapshot(creator.id, rawData);
}

export async function saveInsightSnapshotForCreator(creatorId: string, rawData: any) {
  if (!creatorId || !rawData) return null;
  const context = await requireContext();
  const creator = await prisma.creator.findFirst({ where: { id: creatorId, ...creatorScope(context) }, select: { id: true } });
  if (!creator) return null;
  return createInsightSnapshot(creator.id, rawData);
}

async function createInsightSnapshot(creatorId: string, rawData: any) {
  const metrics = await extractInsightMetrics(rawData);
  const insight = await prisma.creatorInsight.create({
    data: {
      creatorId, avgViews: metrics.avgViews, medianViews: metrics.medianViews,
      avgLikes: metrics.avgLikes, avgComments: metrics.avgComments,
      engagementRate: metrics.engagementRate, consistencyLabel: metrics.consistencyLabel,
      postingFrequencyDays: metrics.postingFrequencyDays, viewToFollowerRatio: metrics.viewToFollowerRatio,
      followerCount: metrics.followerCount, followingCount: metrics.followingCount,
      postCount: metrics.postCount, verified: metrics.verified, profileUrl: metrics.profileUrl,
      overallScore: metrics.overallScore, engagementScore: metrics.engagementScore,
      audienceScore: metrics.audienceScore, contentQualityScore: metrics.contentQualityScore,
      consistencyScore: metrics.consistencyScore, audienceData: metrics.audienceData,
      topLocations: metrics.topLocations, interests: metrics.interests,
      ageDistribution: metrics.ageDistribution, genderDistribution: metrics.genderDistribution,
      source: metrics.source, sourceVersion: metrics.sourceVersion, raw: rawData,
    },
  });
  revalidatePath("/insights");
  revalidatePath(`/creators/${creatorId}`);
  revalidatePath("/creators");
  return insight;
}

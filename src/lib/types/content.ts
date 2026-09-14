import { Platform, ContentFormat } from "@prisma/client";

export interface AgeDistribution {
  "13-17"?: number;
  "18-24"?: number;
  "25-34"?: number;
  "35-44"?: number;
  "45-54"?: number;
  "55+"?: number;
  [key: string]: number | undefined;
}

export interface GenderDistribution {
  female?: number;
  male?: number;
  other?: number;
  [key: string]: number | undefined;
}

export interface TopLocationItem {
  location: string;
  percentage: number;
}

export interface PostMetricsData {
  id?: string;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  reach?: number | null;
  impressions?: number | null;
  enteredAt?: Date;
}

export interface PostDemographicsData {
  id?: string;
  ageRanges: AgeDistribution;
  genderSplit: GenderDistribution;
  topLocations: TopLocationItem[];
}

export interface ContentTagItem {
  id: string;
  name: string;
}

export interface PostWithRelations {
  id: string;
  creatorId: string;
  platform: Platform;
  format: ContentFormat;
  caption?: string | null;
  url?: string | null;
  postedAt: Date;
  createdAt: Date;
  tags: ContentTagItem[];
  metrics: PostMetricsData | null;
  demographics: PostDemographicsData | null;
}

export function computeEngagementRate(metrics: PostMetricsData | null | undefined): number | null {
  if (!metrics) return null;
  const likes = metrics.likes ?? 0;
  const comments = metrics.comments ?? 0;
  const shares = metrics.shares ?? 0;
  const saves = metrics.saves ?? 0;
  const totalInteractions = likes + comments + shares + saves;

  if (totalInteractions === 0) return 0;

  // Primary calculation: interactions / reach
  if (metrics.reach && metrics.reach > 0) {
    return (totalInteractions / metrics.reach) * 100;
  }

  // Fallback: (likes + comments) / views
  if (metrics.views && metrics.views > 0) {
    return ((likes + comments) / metrics.views) * 100;
  }

  return null;
}

export interface ComputedCadenceInsight {
  postsPerWeekRecent: number;
  postsPerWeekPrior: number;
  dropPercentage: number | null;
  longestGapDays: number;
  description: string;
  flagWarning?: boolean;
}

export interface ComputedGroupPerformance {
  key: string;
  count: number;
  avgEngagementRate: number;
  avgViews: number;
  avgReach: number;
}

export interface ComputedInsightsReport {
  totalPosts: number;
  averageEngagementRate: number | null;
  cadence: ComputedCadenceInsight;
  bestFormat: ComputedGroupPerformance | null;
  worstFormat: ComputedGroupPerformance | null;
  formatSentence: string;
  bestTag: ComputedGroupPerformance | null;
  worstTag: ComputedGroupPerformance | null;
  tagSentence: string;
  platformComparison: {
    instagramAvgER: number | null;
    tiktokAvgER: number | null;
    sentence: string;
  };
  trend: {
    recentAvgER: number | null;
    priorAvgER: number | null;
    direction: "up" | "down" | "flat" | "insufficient";
    percentageChange: number | null;
    sentence: string;
  };
  hasEnoughData: boolean;
}


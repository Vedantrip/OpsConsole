"use client";

import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Tag,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { ComputedInsightsReport } from "@/lib/types/content";

interface InsightsPanelProps {
  insights: ComputedInsightsReport;
  creatorName: string;
}

export default function InsightsPanel({ insights, creatorName }: InsightsPanelProps) {
  if (!insights.hasEnoughData) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto">
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">No performance insights yet</h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            Log at least 1–2 posts with metrics (views, reach, likes, comments) to generate automated
            cadence, format, and content theme insights for {creatorName}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-muted mb-1">Average Engagement</p>
          <div className="text-2xl font-bold font-mono text-gold stat-number">
            {insights.averageEngagementRate != null
              ? `${insights.averageEngagementRate.toFixed(1)}%`
              : "—"}
          </div>
          <p className="text-[11px] text-muted mt-1">
            Across {insights.totalPosts} logged post{insights.totalPosts === 1 ? "" : "s"}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-muted mb-1">Posting Velocity</p>
          <div className="text-2xl font-bold font-mono text-ink stat-number">
            {insights.cadence.postsPerWeekRecent.toFixed(1)}
            <span className="text-xs font-normal text-muted ml-1">/ wk</span>
          </div>
          <p className="text-[11px] text-muted mt-1">Recent 4-week pacing</p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-muted mb-1">Top Format</p>
          <div className="text-xl font-bold text-ink truncate">
            {insights.bestFormat
              ? insights.bestFormat.key.charAt(0) + insights.bestFormat.key.slice(1).toLowerCase()
              : "—"}
          </div>
          <p className="text-[11px] text-muted mt-1 font-mono">
            {insights.bestFormat ? `${insights.bestFormat.avgEngagementRate.toFixed(1)}% ER avg` : "—"}
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-medium text-muted mb-1">Top Theme</p>
          <div className="text-xl font-bold text-ink truncate">
            {insights.bestTag ? `#${insights.bestTag.key}` : "—"}
          </div>
          <p className="text-[11px] text-muted mt-1 font-mono">
            {insights.bestTag ? `${insights.bestTag.avgEngagementRate.toFixed(1)}% ER avg` : "—"}
          </p>
        </div>
      </div>

      {/* 5 Plain-Language Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 1. Cadence */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded ${
                  insights.cadence.flagWarning
                    ? "bg-viz-rose/10 text-viz-rose"
                    : "bg-gold/10 text-gold"
                }`}
              >
                {insights.cadence.flagWarning ? <AlertTriangle size={15} /> : <Clock size={15} />}
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Posting Cadence
              </h4>
            </div>
            {insights.cadence.dropPercentage !== null && (
              <span
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                  insights.cadence.dropPercentage < 0
                    ? "bg-viz-rose/10 text-viz-rose border border-viz-rose/20"
                    : "bg-viz-teal/10 text-viz-teal border border-viz-teal/20"
                }`}
              >
                {insights.cadence.dropPercentage > 0 ? "+" : ""}
                {insights.cadence.dropPercentage}% pacing
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed">{insights.cadence.description}</p>
        </div>

        {/* 2. Format Performance */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-viz-teal/10 text-viz-teal">
                <Layers size={15} />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Format Comparison
              </h4>
            </div>
            {insights.bestFormat && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper border border-line text-muted">
                {insights.bestFormat.count} post{insights.bestFormat.count === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed">{insights.formatSentence}</p>
        </div>

        {/* 3. Content Tags / Themes */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-viz-rose/10 text-viz-rose">
                <Tag size={15} />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Theme & Tag Performance
              </h4>
            </div>
            {insights.bestTag && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/20">
                #{insights.bestTag.key}
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed">{insights.tagSentence}</p>
        </div>

        {/* 4. Platform Comparison */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-viz-slate/10 text-viz-slate">
                <Smartphone size={15} />
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Platform Delivery
              </h4>
            </div>
          </div>
          <p className="text-xs text-ink leading-relaxed">
            {insights.platformComparison.sentence}
          </p>
        </div>

        {/* 5. Trend & Trajectory */}
        <div className="card p-4 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded ${
                  insights.trend.direction === "up"
                    ? "bg-viz-teal/10 text-viz-teal"
                    : insights.trend.direction === "down"
                    ? "bg-viz-rose/10 text-viz-rose"
                    : "bg-paper text-muted"
                }`}
              >
                {insights.trend.direction === "up" ? (
                  <TrendingUp size={15} />
                ) : insights.trend.direction === "down" ? (
                  <TrendingDown size={15} />
                ) : (
                  <Info size={15} />
                )}
              </div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink">
                Engagement Velocity & Trajectory
              </h4>
            </div>
            {insights.trend.percentageChange !== null && (
              <span
                className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                  insights.trend.percentageChange > 0
                    ? "bg-viz-teal/10 text-viz-teal border border-viz-teal/20"
                    : "bg-viz-rose/10 text-viz-rose border border-viz-rose/20"
                }`}
              >
                {insights.trend.percentageChange > 0 ? "+" : ""}
                {insights.trend.percentageChange}% change
              </span>
            )}
          </div>
          <p className="text-xs text-ink leading-relaxed">{insights.trend.sentence}</p>
        </div>
      </div>
    </div>
  );
}


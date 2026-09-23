"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Lock,
  Instagram,
  BarChart3,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import AITrendingHub from "@/components/content/ai-trending-hub";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type CreatorData = {
  id: string;
  name: string;
  handle: string | null;
  instagramAccountId: string | null;
  instagramConnectedAt: Date | null;
  mountliftScore: number | null;
  engagementScore: number | null;
  audienceScore: number | null;
  contentScore: number | null;
  consistencyScore: number | null;
  profileScore: number | null;
  scoreCalculatedAt: Date | null;
  privateInsights: any;
};

const VIZ_COLORS = ["#CC9A3D", "#3F6B62", "#B15C67", "#52657A", "#7A7266", "#DDB05B"];

export default function PortalClient({
  token,
  creator,
  justConnected,
  errorMessage,
}: {
  token: string;
  creator: CreatorData;
  justConnected: boolean;
  errorMessage?: string;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(errorMessage || null);
  const [currentInsights, setCurrentInsights] = useState(creator.privateInsights);
  const [scores, setScores] = useState({
    overall: creator.mountliftScore,
    engagement: creator.engagementScore,
    audience: creator.audienceScore,
    content: creator.contentScore,
    consistency: creator.consistencyScore,
    profile: creator.profileScore,
  });

  const isConnected = Boolean(creator.instagramAccountId && currentInsights);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/portal/${token}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncError(data.error || "Failed to refresh insights.");
        return;
      }
      setCurrentInsights(data.insights);
      if (data.insights?.scores) {
        setScores({
          overall: data.insights.scores.overall,
          engagement: data.insights.scores.engagement,
          audience: data.insights.scores.audience,
          content: data.insights.scores.content,
          consistency: data.insights.scores.consistency,
          profile: data.insights.scores.profile,
        });
      }
    } catch {
      setSyncError("Network error while synchronizing with Instagram.");
    } finally {
      setSyncing(false);
    }
  }

  const ageData = currentInsights?.demographics?.age || [];
  const genderData = currentInsights?.demographics?.gender || [];
  const locationData = currentInsights?.demographics?.topCities?.length
    ? currentInsights.demographics.topCities
    : currentInsights?.demographics?.topCountries || [];
  const performance = currentInsights?.performance || {};
  const profile = currentInsights?.profile || {};
  const recentMedia = currentInsights?.recentMedia || [];

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* Top Standalone Header */}
      <header className="border-b border-line bg-panel sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-charcoal text-gold flex items-center justify-center font-mono font-bold text-xs">
              ML
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-tight text-ink">MountLift Creator Studio</div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider">Private Insights & Score</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono bg-paper border border-line text-muted">
              <Lock size={11} className="text-gold" />
              Private to you
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {justConnected && (
          <div className="card p-4 bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-xs animate-fade-up">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="font-semibold">Instagram Connected Successfully!</div>
              <div>Your official insights and MountLift Creator Score have been calculated.</div>
            </div>
          </div>
        )}

        {syncError && (
          <div className="card p-4 bg-viz-rose/10 border-viz-rose/30 text-viz-rose flex items-center gap-3 text-xs animate-fade-up">
            <AlertCircle size={18} className="shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {!isConnected ? (
          /* Unconnected State: Welcome and Connect CTA */
          <div className="card p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/25 text-gold flex items-center justify-center mx-auto shadow-sm">
              <Instagram size={32} />
            </div>

            <div className="space-y-2">
              <p className="eyebrow">Creator Onboarding</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-ink">
                Welcome, {creator.name}
              </h1>
              <p className="text-sm text-muted max-w-md mx-auto">
                Connect your official Instagram Creator/Business account to unlock your private audience analytics and calculate your MountLift Creator Score.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-line bg-paper/60 text-left space-y-2.5 text-xs text-muted">
              <div className="flex items-center gap-2 font-medium text-ink">
                <ShieldCheck size={16} className="text-gold" />
                <span>Private & Read-Only Guarantee:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Uses Meta&apos;s official OAuth with read-only insights permission.</li>
                <li>Your raw private follower details remain exclusive to this personal portal.</li>
                <li>MountLift only uses aggregated signals to calculate your verified score for brand partnerships.</li>
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={`/api/auth/instagram/login?token=${token}`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-ink text-paper hover:bg-charcoal font-medium text-sm transition-all shadow-md hover:scale-[1.02]"
              >
                <Instagram size={18} className="text-gold" />
                <span>Connect with Instagram</span>
              </a>
            </div>
          </div>
        ) : (
          /* Connected State: Score, Demographics, Media */
          <div className="space-y-6 animate-fade-up">
            {/* Header profile & Sync trigger */}
            <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/25 text-gold flex items-center justify-center font-display font-bold text-lg">
                  {profile.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={creator.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    "@"
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-display font-bold text-ink">{creator.name}</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                      Verified Connected
                    </span>
                  </div>
                  <div className="text-xs text-muted font-mono mt-0.5">
                    {profile.username ? `@${profile.username}` : creator.handle} · {profile.followersCount?.toLocaleString()} followers · {profile.mediaCount} posts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-line bg-paper text-xs font-medium text-ink hover:bg-panel transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={13} className={syncing ? "animate-spin text-gold" : "text-muted"} />
                  <span>{syncing ? "Syncing..." : "Sync Insights"}</span>
                </button>
              </div>
            </div>

            {/* MountLift Creator Score Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-4 card p-6 flex flex-col items-center justify-center text-center bg-gradient-to-b from-paper/40 to-panel border-line">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted font-medium mb-1">
                  <Sparkles size={14} className="text-gold" />
                  <span>MountLift Creator Score</span>
                </div>
                <div className="text-6xl font-display font-bold text-gold stat-number my-2">
                  {scores.overall != null ? Math.round(scores.overall) : "—"}
                </div>
                <div className="text-[11px] text-muted">
                  Official performance evaluation from Instagram Graph API
                </div>
              </div>

              <div className="lg:col-span-8 card p-6 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {[
                  { label: "Engagement", val: scores.engagement, desc: `${performance.avgEngagementRatePct || 0}% avg ER` },
                  { label: "Audience Quality", val: scores.audience, desc: "Verified demographics" },
                  { label: "Content Velocity", val: scores.content, desc: `${performance.avgViews?.toLocaleString() || "—"} avg reach` },
                  { label: "Posting Cadence", val: scores.consistency, desc: performance.consistency?.label || "Regular" },
                  { label: "Profile Strength", val: scores.profile, desc: "Bio & verification" },
                  { label: "Posts Analyzed", val: performance.reelsAnalyzed || 0, desc: "Recent media sample", raw: true },
                ].map((item) => (
                  <div key={item.label} className="p-3.5 rounded-lg border border-line bg-paper/50 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-muted font-medium">{item.label}</div>
                      <div className="text-2xl font-bold font-display text-ink stat-number mt-1">
                        {item.val != null ? (item.raw ? item.val : Math.round(item.val)) : "—"}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted mt-2 truncate font-mono">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demographics Row (Age, Gender, Geography) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Age Cohorts Bar Chart */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted font-medium">
                    <BarChart3 size={14} className="text-gold" />
                    <span>Verified Age Distribution</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted">Direct from Instagram</span>
                </div>

                {ageData.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted">
                    No age demographic data reported by Instagram yet.
                  </div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A7266" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#7A7266" }} unit="%" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-panel)",
                            borderColor: "var(--color-line)",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(value: any) => [`${value}%`, "Share"]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {ageData.map((_entry: { label: string; value: number }, index: number) => (
                            <Cell key={`cell-${index}`} fill={VIZ_COLORS[index % VIZ_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Gender & Location Breakdown */}
              <div className="card p-5 space-y-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted font-medium">
                      <Users size={14} className="text-gold" />
                      <span>Gender Breakdown</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {genderData.length === 0 ? (
                      <p className="text-xs text-muted">No gender data reported.</p>
                    ) : (
                      genderData.map((g: any, i: number) => (
                        <div key={g.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-ink font-medium">{g.label}</span>
                            <span className="font-mono text-muted">{g.value}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${g.value}%`,
                                backgroundColor: VIZ_COLORS[i % VIZ_COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-line">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted font-medium mb-3">
                    <MapPin size={14} className="text-gold" />
                    <span>Top Locations</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {locationData.length === 0 ? (
                      <p className="text-muted col-span-2">No location data reported.</p>
                    ) : (
                      locationData.slice(0, 4).map((loc: any) => (
                        <div key={loc.label} className="p-2.5 rounded-md border border-line bg-paper/50 flex justify-between items-center">
                          <span className="text-ink font-medium truncate">{loc.label}</span>
                          <span className="text-muted ml-2">{loc.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Verified Media Grid */}
            {recentMedia.length > 0 && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted font-medium">
                    <TrendingUp size={14} className="text-gold" />
                    <span>Recent Post Performance ({recentMedia.length} analyzed)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {recentMedia.map((m: any) => (
                    <div key={m.id} className="p-3.5 rounded-lg border border-line bg-paper/50 flex flex-col justify-between space-y-2">
                      <p className="text-xs text-ink line-clamp-2">
                        {m.caption || "No caption provided"}
                      </p>
                      <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] font-mono text-muted">
                        <span>❤️ {m.likeCount?.toLocaleString() || 0}</span>
                        <span>💬 {m.commentsCount?.toLocaleString() || 0}</span>
                        {m.permalink && (
                          <a
                            href={m.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-gold hover:underline inline-flex items-center gap-0.5"
                          >
                            View <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily AI Trending Content Sparks */}
            <div className="pt-2">
              <AITrendingHub
                creatorId={creator.id}
                creatorName={creator.name}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

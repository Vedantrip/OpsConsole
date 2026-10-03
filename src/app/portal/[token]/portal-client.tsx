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
  Zap,
  Flame,
  Award,
} from "lucide-react";
import AITrendingHub from "@/components/content/ai-trending-hub";
import CreatorVibeStudio from "@/components/content/creator-vibe-studio";
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

const VIZ_COLORS = ["#6366F1", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#06B6D4"];

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Dynamic Gen-Z Ambient Glows */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden opacity-70">
        <div className="absolute top-10 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 -left-32 w-[450px] h-[450px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute bottom-20 right-10 w-[400px] h-[400px] rounded-full bg-emerald-600/10 blur-[100px]" />
      </div>

      {/* Top Standalone Header */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-display font-extrabold text-sm shadow-lg shadow-indigo-500/25">
              ML
            </div>
            <div>
              <div className="font-display font-bold text-base tracking-tight text-white flex items-center gap-2">
                <span>MountLift Creator Studio</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold border border-indigo-500/30">
                  LIVE PORTAL
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">Private Intelligence & Creator Score</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-slate-300">
              <Lock size={12} className="text-indigo-400" />
              <span>Encrypted & Private</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {justConnected && (
          <div className="rounded-3xl p-5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-sm animate-fade-up backdrop-blur-xl shadow-xl">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold">Instagram Connected Successfully! 🚀</div>
              <div className="text-xs text-emerald-400/80">Your official insights and verified MountLift Creator Score have been calculated.</div>
            </div>
          </div>
        )}

        {syncError && (
          <div className="rounded-3xl p-5 bg-pink-500/15 border border-pink-500/30 text-pink-300 flex items-center gap-3 text-sm animate-fade-up backdrop-blur-xl shadow-xl">
            <AlertCircle size={20} className="shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {!isConnected ? (
          /* Unconnected State: Welcome and Connect CTA */
          <div className="rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 animate-fade-up bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
              <Instagram size={32} />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30 uppercase">
                Creator Onboarding
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white">
                Welcome, {creator.name}
              </h1>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Connect your official Instagram Creator/Business account to unlock verified audience analytics and calculate your MountLift Creator Score for upcoming brand deals.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] text-left space-y-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-bold text-white">
                <ShieldCheck size={16} className="text-indigo-400" />
                <span>100% Private & Read-Only Guarantee:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Uses Meta&apos;s official OAuth with read-only insights permission.</li>
                <li>Your raw private follower details remain exclusive to this personal portal.</li>
                <li>MountLift only uses verified engagement signals for brand collaboration matching.</li>
              </ul>
            </div>

            <div className="pt-2">
              <a
                href={`/api/auth/instagram/login?token=${token}`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95"
              >
                <Instagram size={18} />
                <span>Connect with Instagram</span>
              </a>
            </div>
          </div>
        ) : (
          /* Connected State: Score, Demographics, Media */
          <div className="space-y-8 animate-fade-up">
            {/* Header profile & Sync trigger */}
            <div className="rounded-3xl p-6 bg-slate-900/80 border border-white/10 backdrop-blur-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-display font-bold text-xl overflow-hidden shrink-0 shadow-lg">
                  {profile.profilePictureUrl ? (
                    <img
                      src={profile.profilePictureUrl}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    "@"
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-display font-bold text-white">{creator.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Verified Creator
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-1">
                    {profile.username ? `@${profile.username}` : creator.handle} · {profile.followersCount?.toLocaleString()} followers · {profile.mediaCount} posts
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-60"
                >
                  <RefreshCw size={13} className={syncing ? "animate-spin text-indigo-400" : "text-slate-400"} />
                  <span>{syncing ? "Syncing..." : "Sync Fresh Insights"}</span>
                </button>
              </div>
            </div>

            {/* MountLift Creator Score Showcase Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-4 rounded-3xl p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-950/50 via-purple-950/30 to-slate-900/80 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold mb-2">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>Verified MountLift Score</span>
                </div>
                <div className="text-7xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300 my-2">
                  {scores.overall != null ? Math.round(scores.overall) : "—"}
                </div>
                <div className="text-xs text-slate-400 max-w-[200px] leading-snug">
                  Evaluated via official Instagram Graph API signals
                </div>
              </div>

              <div className="lg:col-span-8 rounded-3xl p-6 grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-slate-900/70 border border-white/10 shadow-xl backdrop-blur-xl">
                {[
                  { label: "Engagement", val: scores.engagement, desc: `${performance.avgEngagementRatePct || 0}% avg ER` },
                  { label: "Audience Quality", val: scores.audience, desc: "Verified demographics" },
                  { label: "Content Velocity", val: scores.content, desc: `${performance.avgViews?.toLocaleString() || "—"} avg reach` },
                  { label: "Posting Cadence", val: scores.consistency, desc: performance.consistency?.label || "Regular" },
                  { label: "Profile Strength", val: scores.profile, desc: "Bio & authenticity" },
                  { label: "Posts Sampled", val: performance.reelsAnalyzed || 0, desc: "Recent media audit", raw: true },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{item.label}</div>
                      <div className="text-2xl font-bold font-display text-white mt-1">
                        {item.val != null ? (item.raw ? item.val : Math.round(item.val)) : "—"}
                      </div>
                    </div>
                    <div className="text-[11px] text-indigo-300 mt-2 truncate font-mono">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Gen-Z Vibe & Hook Studio */}
            <section>
              <CreatorVibeStudio />
            </section>

            {/* Demographics Row (Age, Gender, Geography) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Age Cohorts Bar Chart */}
              <div className="rounded-3xl p-6 space-y-4 bg-slate-900/70 border border-white/10 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold">
                    <BarChart3 size={14} className="text-indigo-400" />
                    <span>Verified Age Cohorts</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Direct from Instagram</span>
                </div>

                {ageData.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No age demographic data reported by Instagram yet.
                  </div>
                ) : (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} unit="%" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0F172A",
                            borderColor: "rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            fontSize: 12,
                            color: "#fff",
                          }}
                          formatter={(value: any) => [`${value}%`, "Share"]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
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
              <div className="rounded-3xl p-6 space-y-5 flex flex-col justify-between bg-slate-900/70 border border-white/10 shadow-xl backdrop-blur-xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-300 font-bold">
                      <Users size={14} className="text-purple-400" />
                      <span>Gender Breakdown</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {genderData.length === 0 ? (
                      <p className="text-xs text-slate-400">No gender data reported.</p>
                    ) : (
                      genderData.map((g: any, i: number) => (
                        <div key={g.label} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-white font-medium">{g.label}</span>
                            <span className="text-indigo-300">{g.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
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

                <div className="pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold mb-3">
                    <MapPin size={14} className="text-emerald-400" />
                    <span>Top Geographical Hotspots</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {locationData.length === 0 ? (
                      <p className="text-slate-400 col-span-2">No location data reported.</p>
                    ) : (
                      locationData.slice(0, 4).map((loc: any) => (
                        <div key={loc.label} className="p-3 rounded-xl border border-white/5 bg-white/[0.03] flex justify-between items-center">
                          <span className="text-white font-medium truncate">{loc.label}</span>
                          <span className="text-indigo-300 ml-2">{loc.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Verified Media Grid */}
            {recentMedia.length > 0 && (
              <div className="rounded-3xl p-6 space-y-4 bg-slate-900/70 border border-white/10 shadow-xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold">
                    <TrendingUp size={14} className="text-indigo-400" />
                    <span>Audited Posts ({recentMedia.length} analyzed)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentMedia.map((m: any) => (
                    <div key={m.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-indigo-500/30 transition-all flex flex-col justify-between space-y-3">
                      <p className="text-xs text-slate-200 line-clamp-2">
                        {m.caption || "No caption provided"}
                      </p>
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                        <span className="text-indigo-300">❤️ {m.likeCount?.toLocaleString() || 0}</span>
                        <span className="text-purple-300">💬 {m.commentsCount?.toLocaleString() || 0}</span>
                        {m.permalink && (
                          <a
                            href={m.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-white hover:text-indigo-300 inline-flex items-center gap-1 font-semibold"
                          >
                            View <ExternalLink size={11} />
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

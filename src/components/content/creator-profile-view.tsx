"use client";

import { useState } from "react";
import { PostWithRelations, ComputedInsightsReport } from "@/lib/types/content";
import ContentTable from "./content-table";
import InsightsPanel from "./insights-panel";
import DemographicsAggregate from "../demographics/demographics-aggregate";
import CrossAnalysisMatrix from "../demographics/cross-analysis-matrix";
import PostDemographicsModal from "../demographics/post-demographics-modal";
import PostFormModal from "./post-form-modal";
import {
  Layers,
  Sparkles,
  Users,
  Grid,
  Plus,
  BarChart3,
  Calendar,
  ChevronDown,
  Instagram,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  Link2,
} from "lucide-react";
import { getOrCreateConnectToken } from "@/app/creators/[id]/actions";

interface CreatorProfileViewProps {
  creator: {
    id: string;
    name: string;
    handle: string | null;
    platform: string | null;
    email: string | null;
    rateCard: string | null;
    notes: string | null;
    connectToken: string | null;
    instagramConnectedAt: Date | string | null;
    mountliftScore: number | null;
    engagementScore: number | null;
    audienceScore: number | null;
    contentScore: number | null;
    consistencyScore: number | null;
    profileScore: number | null;
    scoreCalculatedAt: Date | string | null;
    insights: any[];
    _count: { deliverables: number };
  };
  posts: PostWithRelations[];
  computedInsights: ComputedInsightsReport;
  existingTags: string[];
}

export default function CreatorProfileView({
  creator,
  posts,
  computedInsights,
  existingTags,
}: CreatorProfileViewProps) {
  const [activeTab, setActiveTab] = useState<"content" | "insights" | "demographics" | "audit">("content");
  const [selectedPostForDemo, setSelectedPostForDemo] = useState<PostWithRelations | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentToken, setCurrentToken] = useState<string | null>(creator.connectToken);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  const handleCopyConnectLink = async () => {
    try {
      let token = currentToken;
      if (!token) {
        setIsGeneratingToken(true);
        const res = await getOrCreateConnectToken(creator.id);
        token = res.token;
        setCurrentToken(token);
      }
      const portalUrl = `${window.location.origin}/portal/${token}`;
      await navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Failed to copy connect link:", err);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: "A+", label: "Top 1% Tier", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" };
    if (score >= 80) return { grade: "A", label: "High Impact", color: "text-gold bg-gold/10 border-gold/30" };
    if (score >= 70) return { grade: "B+", label: "Strong Performer", color: "text-sky-500 bg-sky-500/10 border-sky-500/30" };
    if (score >= 60) return { grade: "B", label: "Steady Growth", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" };
    return { grade: "C", label: "Developing", color: "text-muted bg-paper border-line" };
  };

  const isConnected = Boolean(creator.instagramConnectedAt);
  const scoreInfo = creator.mountliftScore != null ? getScoreGrade(creator.mountliftScore) : null;

  return (
    <div className="space-y-6">
      {/* Instagram Graph API & MountLift Score Banner */}
      {isConnected && creator.mountliftScore != null ? (
        <div className="card p-5 border-gold/30 bg-gradient-to-br from-paper to-background relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Overall Score */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gold/15 border border-gold/40 flex flex-col items-center justify-center shrink-0">
                <span className="text-2xl font-bold font-mono text-gold leading-none">
                  {creator.mountliftScore}
                </span>
                <span className="text-[10px] font-mono text-muted uppercase tracking-wider mt-0.5">/ 100</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Verified MountLift Score
                  </span>
                  {scoreInfo && (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${scoreInfo.color}`}>
                      {scoreInfo.grade} • {scoreInfo.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Authenticated via official Instagram Graph API</span>
                  {creator.scoreCalculatedAt && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px]">
                        {new Date(creator.scoreCalculatedAt).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </>
                  )}
                </p>
                <p className="text-[11px] text-muted italic">
                  Private demographic breakdown is securely retained in creator&apos;s personal portal.
                </p>
              </div>
            </div>

            {/* Middle: 5 Score Pillars */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 lg:max-w-xl">
              <div className="bg-paper p-2.5 rounded border border-line">
                <div className="text-[10px] font-mono text-muted uppercase">Engagement</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {creator.engagementScore ?? "—"}<span className="text-[10px] text-muted">/100</span>
                </div>
              </div>
              <div className="bg-paper p-2.5 rounded border border-line">
                <div className="text-[10px] font-mono text-muted uppercase">Audience</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {creator.audienceScore ?? "—"}<span className="text-[10px] text-muted">/100</span>
                </div>
              </div>
              <div className="bg-paper p-2.5 rounded border border-line">
                <div className="text-[10px] font-mono text-muted uppercase">Velocity</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {creator.contentScore ?? "—"}<span className="text-[10px] text-muted">/100</span>
                </div>
              </div>
              <div className="bg-paper p-2.5 rounded border border-line">
                <div className="text-[10px] font-mono text-muted uppercase">Consistency</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {creator.consistencyScore ?? "—"}<span className="text-[10px] text-muted">/100</span>
                </div>
              </div>
              <div className="bg-paper p-2.5 rounded border border-line">
                <div className="text-[10px] font-mono text-muted uppercase">Profile</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {creator.profileScore ?? "—"}<span className="text-[10px] text-muted">/100</span>
                </div>
              </div>
            </div>

            {/* Right: Portal actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyConnectLink}
                disabled={isGeneratingToken}
                className="btn btn-secondary btn-small"
                title="Copy creator's private portal URL"
              >
                {copiedLink ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Portal Link</span>
                  </>
                )}
              </button>
              {currentToken && (
                <a
                  href={`/portal/${currentToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-small"
                  title="Open Creator Portal preview"
                >
                  <ExternalLink size={13} />
                  <span>View Portal</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-4 border-dashed border-line bg-paper/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center shrink-0 border border-pink-500/20">
              <Instagram size={20} />
            </div>
            <div>
              <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <span>Official Instagram Graph Connection</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-paper border border-line text-muted">
                  Zero Scraping
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Share a secure private portal link with {creator.name} to connect their Instagram account and compute their verified MountLift Score.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyConnectLink}
              disabled={isGeneratingToken}
              className="btn btn-primary btn-small"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>Link Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Link2 size={13} />
                  <span>{isGeneratingToken ? "Generating Link..." : "Share Connect Link"}</span>
                </>
              )}
            </button>
            {currentToken && (
              <a
                href={`/portal/${currentToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-small"
              >
                <ExternalLink size={13} />
                <span>Portal Preview</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-line gap-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "content"
                ? "border-gold text-ink font-semibold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Layers size={14} />
            <span>Content Log</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-paper border border-line text-muted">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("insights")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "insights"
                ? "border-gold text-ink font-semibold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Sparkles size={14} />
            <span>Performance Insights</span>
          </button>

          <button
            onClick={() => setActiveTab("demographics")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "demographics"
                ? "border-gold text-ink font-semibold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <Users size={14} />
            <span>Audience & Demographics</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "audit"
                ? "border-gold text-ink font-semibold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <BarChart3 size={14} />
            <span>Instagram Audit History</span>
            {creator.insights.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-paper border border-line text-muted">
                {creator.insights.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="btn btn-small mb-1 shrink-0"
        >
          <Plus size={13} />
          <span>Log post</span>
        </button>
      </div>

      {/* Tab 1: Content Log */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <ContentTable
            creatorId={creator.id}
            creatorName={creator.name}
            posts={posts}
            existingTags={existingTags}
            onSelectPostForDemographics={(post) => setSelectedPostForDemo(post)}
          />
        </div>
      )}

      {/* Tab 2: Performance Insights */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          <InsightsPanel insights={computedInsights} creatorName={creator.name} />
        </div>
      )}

      {/* Tab 3: Audience & Demographics */}
      {activeTab === "demographics" && (
        <div className="space-y-6">
          <DemographicsAggregate posts={posts} creatorName={creator.name} />
          <CrossAnalysisMatrix posts={posts} />
        </div>
      )}

      {/* Tab 4: Instagram Audit Scraper History (Kept 100% Intact) */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {creator.insights.length === 0 ? (
            <div className="card p-8 text-center space-y-2">
              <p className="text-sm font-medium text-ink">No automated audit snapshots yet.</p>
              <p className="text-xs text-muted">
                Audits run from the Insights tab matching {creator.handle || creator.name} are saved here automatically.
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {creator.insights.map((insight: any) => (
                <div key={insight.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">
                        {new Date(insight.createdAt).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {insight.consistencyLabel && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-paper border border-line text-muted font-medium">
                          {insight.consistencyLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-muted">
                      <span>
                        ER:{" "}
                        <strong className="text-gold">
                          {insight.engagementRate != null ? `${insight.engagementRate.toFixed(1)}%` : "—"}
                        </strong>
                      </span>
                      <span>
                        Avg Views:{" "}
                        <strong className="text-ink">
                          {insight.avgViews != null ? insight.avgViews.toLocaleString("en-IN") : "—"}
                        </strong>
                      </span>
                      <span>
                        Avg Likes:{" "}
                        <strong className="text-ink">
                          {insight.avgLikes != null ? insight.avgLikes.toLocaleString("en-IN") : "—"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <details className="group">
                    <summary className="text-[11px] text-muted cursor-pointer hover:text-gold flex items-center gap-1 font-mono">
                      <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                      <span>View Raw Audit JSON</span>
                    </summary>
                    <pre className="text-[11px] font-mono text-muted bg-paper p-3 rounded border border-line mt-1 overflow-x-auto max-h-36">
                      {JSON.stringify(insight.raw, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Post Demographics Modal */}
      {selectedPostForDemo && (
        <PostDemographicsModal
          post={selectedPostForDemo}
          isOpen={Boolean(selectedPostForDemo)}
          onClose={() => setSelectedPostForDemo(null)}
          creatorName={creator.name}
        />
      )}

      {/* Quick Log Modal */}
      {isLogModalOpen && (
        <PostFormModal
          creatorId={creator.id}
          creatorName={creator.name}
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          existingTags={existingTags}
        />
      )}
    </div>
  );
}


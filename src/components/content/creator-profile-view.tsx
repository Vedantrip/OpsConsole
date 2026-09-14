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
} from "lucide-react";

interface CreatorProfileViewProps {
  creator: {
    id: string;
    name: string;
    handle: string | null;
    platform: string | null;
    email: string | null;
    rateCard: string | null;
    notes: string | null;
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

  return (
    <div className="space-y-6">
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


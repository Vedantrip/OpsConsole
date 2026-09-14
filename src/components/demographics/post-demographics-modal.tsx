"use client";

import { PostWithRelations, computeEngagementRate } from "@/lib/types/content";
import { X, ExternalLink, BarChart3, PieChart as PieIcon, MapPin } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Platform } from "@prisma/client";

interface PostDemographicsModalProps {
  post: PostWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
}

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

export default function PostDemographicsModal({
  post,
  isOpen,
  onClose,
  creatorName,
}: PostDemographicsModalProps) {
  if (!isOpen || !post) return null;

  const er = computeEngagementRate(post.metrics);

  const ageData = AGE_ORDER.map((bracket) => ({
    bracket,
    percentage: post.demographics?.ageRanges?.[bracket] ?? 0,
  })).filter((d) => d.percentage > 0 || AGE_ORDER.indexOf(d.bracket) < 4);

  const genderSplit = post.demographics?.genderSplit ?? {};
  const genderData = [
    { name: "Female", value: genderSplit.female ?? 0, color: "#CC9A3D" },
    { name: "Male", value: genderSplit.male ?? 0, color: "#3F6B62" },
    { name: "Other", value: genderSplit.other ?? 0, color: "#52657A" },
  ].filter((g) => g.value > 0);

  const locations = post.demographics?.topLocations ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded-lg shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-paper/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {post.platform === Platform.INSTAGRAM ? "Instagram" : "TikTok"} •{" "}
                {post.format.charAt(0) + post.format.slice(1).toLowerCase()}
              </span>
              <span className="text-xs text-muted font-mono">
                {new Date(post.postedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h2 className="text-base font-semibold text-ink mt-0.5">
              Post Performance & Demographics
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-line/40 transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Caption & Link */}
          {post.caption && (
            <div className="p-3.5 rounded bg-paper border border-line space-y-1">
              <p className="text-xs text-ink leading-relaxed font-medium">{post.caption}</p>
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline font-mono"
                >
                  <span>Open original post</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}

          {/* Metrics Summary Grid */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2.5">
              Native Metrics Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Engagement Rate</div>
                <div className="text-xl font-bold font-mono text-gold stat-number mt-0.5">
                  {er != null ? `${er.toFixed(2)}%` : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Reach</div>
                <div className="text-xl font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.reach != null ? post.metrics.reach.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Views</div>
                <div className="text-xl font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.views != null ? post.metrics.views.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Likes</div>
                <div className="text-xl font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.likes != null ? post.metrics.likes.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Comments</div>
                <div className="text-base font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.comments != null ? post.metrics.comments.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Shares</div>
                <div className="text-base font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.shares != null ? post.metrics.shares.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Saves</div>
                <div className="text-base font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.saves != null ? post.metrics.saves.toLocaleString("en-IN") : "—"}
                </div>
              </div>

              <div className="p-3 rounded bg-paper border border-line">
                <div className="text-[10px] text-muted uppercase">Impressions</div>
                <div className="text-base font-bold font-mono text-ink stat-number mt-0.5">
                  {post.metrics?.impressions != null
                    ? post.metrics.impressions.toLocaleString("en-IN")
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-line" />

          {/* Demographics Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Audience Demographics
            </h3>

            {/* Age Chart */}
            {ageData.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink flex items-center gap-1">
                    <BarChart3 size={13} className="text-gold" /> Age Distribution (%)
                  </span>
                </div>
                <div className="h-44 w-full bg-paper p-3 rounded border border-line">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis
                        dataKey="bracket"
                        tick={{ fontSize: 10, fill: "#7A7266" }}
                        axisLine={{ stroke: "#E7E1D4" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#7A7266" }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, "Share"]}
                        contentStyle={{
                          backgroundColor: "#FAF8F4",
                          borderColor: "#E7E1D4",
                          borderRadius: "6px",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="percentage" fill="#CC9A3D" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted">No age demographic data logged for this post.</p>
            )}

            {/* Gender Split */}
            {genderData.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-ink flex items-center gap-1">
                  <PieIcon size={13} className="text-viz-teal" /> Gender Split (%)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {genderData.map((g) => (
                    <div key={g.name} className="p-2.5 rounded bg-paper border border-line text-center">
                      <span className="text-[11px] text-muted block">{g.name}</span>
                      <span className="text-sm font-bold font-mono text-ink stat-number mt-0.5 block">
                        {g.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Locations */}
            {locations.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-ink flex items-center gap-1">
                  <MapPin size={13} className="text-viz-rose" /> Top Locations
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {locations.map((loc, i) => (
                    <div
                      key={loc.location}
                      className="p-2 rounded bg-paper border border-line flex items-center justify-between text-xs"
                    >
                      <span className="text-ink truncate font-medium">{loc.location}</span>
                      <span className="font-mono text-gold font-semibold shrink-0">
                        {loc.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-line bg-paper/50 flex justify-end">
          <button type="button" onClick={onClose} className="btn-secondary btn-small">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


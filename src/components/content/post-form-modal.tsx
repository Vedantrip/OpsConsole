"use client";

import { useState } from "react";
import { Platform, ContentFormat } from "@prisma/client";
import { X, Plus, Trash2, Sparkles, Check, ChevronDown, ChevronUp } from "lucide-react";
import { savePost, SavePostInput } from "@/app/creators/[id]/actions";
import { PostWithRelations, computeEngagementRate } from "@/lib/types/content";

interface PostFormModalProps {
  creatorId: string;
  creatorName: string;
  isOpen: boolean;
  onClose: () => void;
  postToEdit?: PostWithRelations | null;
  existingTags?: string[];
  onSaved?: () => void;
}

const AGE_BRACKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

export default function PostFormModal({
  creatorId,
  creatorName,
  isOpen,
  onClose,
  postToEdit,
  existingTags = [],
  onSaved,
}: PostFormModalProps) {
  const isEdit = Boolean(postToEdit);

  // Group 1: Details
  const [platform, setPlatform] = useState<Platform>(postToEdit?.platform ?? Platform.INSTAGRAM);
  const [format, setFormat] = useState<ContentFormat>(postToEdit?.format ?? ContentFormat.REEL);
  const [caption, setCaption] = useState(postToEdit?.caption ?? "");
  const [url, setUrl] = useState(postToEdit?.url ?? "");
  const [postedAt, setPostedAt] = useState(
    postToEdit?.postedAt
      ? new Date(postToEdit.postedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [tags, setTags] = useState<string[]>(postToEdit?.tags?.map((t) => t.name) ?? []);
  const [newTagInput, setNewTagInput] = useState("");

  // Group 2: Metrics
  const [views, setViews] = useState<string>(postToEdit?.metrics?.views?.toString() ?? "");
  const [reach, setReach] = useState<string>(postToEdit?.metrics?.reach?.toString() ?? "");
  const [impressions, setImpressions] = useState<string>(postToEdit?.metrics?.impressions?.toString() ?? "");
  const [likes, setLikes] = useState<string>(postToEdit?.metrics?.likes?.toString() ?? "");
  const [comments, setComments] = useState<string>(postToEdit?.metrics?.comments?.toString() ?? "");
  const [shares, setShares] = useState<string>(postToEdit?.metrics?.shares?.toString() ?? "");
  const [saves, setSaves] = useState<string>(postToEdit?.metrics?.saves?.toString() ?? "");

  // Group 3: Demographics
  const [ageDistribution, setAgeDistribution] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const b of AGE_BRACKETS) {
      const val = postToEdit?.demographics?.ageRanges?.[b];
      initial[b] = val != null ? String(val) : "";
    }
    return initial;
  });

  const [femaleSplit, setFemaleSplit] = useState<string>(
    postToEdit?.demographics?.genderSplit?.female != null ? String(postToEdit.demographics.genderSplit.female) : ""
  );
  const [maleSplit, setMaleSplit] = useState<string>(
    postToEdit?.demographics?.genderSplit?.male != null ? String(postToEdit.demographics.genderSplit.male) : ""
  );
  const [otherSplit, setOtherSplit] = useState<string>(
    postToEdit?.demographics?.genderSplit?.other != null ? String(postToEdit.demographics.genderSplit.other) : ""
  );

  const [locations, setLocations] = useState<Array<{ location: string; percentage: string }>>(() => {
    if (postToEdit?.demographics?.topLocations?.length) {
      return postToEdit.demographics.topLocations.map((l) => ({
        location: l.location,
        percentage: String(l.percentage),
      }));
    }
    return [
      { location: "Mumbai, India", percentage: "" },
      { location: "Delhi, India", percentage: "" },
    ];
  });

  // Section collapses
  const [metricsOpen, setMetricsOpen] = useState(true);
  const [demographicsOpen, setDemographicsOpen] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Live calculated Engagement Rate
  const currentMetrics = {
    views: views ? Number(views) : null,
    reach: reach ? Number(reach) : null,
    likes: likes ? Number(likes) : null,
    comments: comments ? Number(comments) : null,
    shares: shares ? Number(shares) : null,
    saves: saves ? Number(saves) : null,
  };
  const liveER = computeEngagementRate(currentMetrics);

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^#/, "");
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddLocationRow = () => {
    setLocations([...locations, { location: "", percentage: "" }]);
  };

  const handleRemoveLocationRow = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Parse demographics
      const parsedAgeRanges: Record<string, number> = {};
      for (const [k, v] of Object.entries(ageDistribution)) {
        if (v && !isNaN(Number(v))) {
          parsedAgeRanges[k] = Number(v);
        }
      }

      const parsedGenderSplit: Record<string, number> = {};
      if (femaleSplit && !isNaN(Number(femaleSplit))) parsedGenderSplit.female = Number(femaleSplit);
      if (maleSplit && !isNaN(Number(maleSplit))) parsedGenderSplit.male = Number(maleSplit);
      if (otherSplit && !isNaN(Number(otherSplit))) parsedGenderSplit.other = Number(otherSplit);

      const parsedLocations = locations
        .filter((l) => l.location.trim() && l.percentage && !isNaN(Number(l.percentage)))
        .map((l) => ({
          location: l.location.trim(),
          percentage: Number(l.percentage),
        }));

      const input: SavePostInput = {
        postId: postToEdit?.id,
        creatorId,
        platform,
        format,
        caption: caption.trim() || undefined,
        url: url.trim() || undefined,
        postedAt,
        tags,
        metrics: {
          views: views ? parseInt(views, 10) : null,
          reach: reach ? parseInt(reach, 10) : null,
          impressions: impressions ? parseInt(impressions, 10) : null,
          likes: likes ? parseInt(likes, 10) : null,
          comments: comments ? parseInt(comments, 10) : null,
          shares: shares ? parseInt(shares, 10) : null,
          saves: saves ? parseInt(saves, 10) : null,
        },
        demographics:
          Object.keys(parsedAgeRanges).length > 0 ||
          Object.keys(parsedGenderSplit).length > 0 ||
          parsedLocations.length > 0
            ? {
                ageRanges: parsedAgeRanges,
                genderSplit: parsedGenderSplit,
                topLocations: parsedLocations,
              }
            : undefined,
      };

      await savePost(input);
      setToastMessage(isEdit ? "Post updated" : "Post logged");
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded-lg shadow-xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-paper/50">
          <div>
            <h2 className="text-base font-semibold text-ink">
              {isEdit ? "Edit logged post" : "Log content post"}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Creator: <span className="font-medium text-ink">{creatorName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-line/40 transition-colors"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs rounded bg-viz-rose/10 border border-viz-rose/30 text-viz-rose font-medium">
              {error}
            </div>
          )}

          {/* Group 1: Post Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                1. Post Details
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="input text-xs"
                >
                  <option value={Platform.INSTAGRAM}>Instagram</option>
                  <option value={Platform.TIKTOK}>TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Format</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ContentFormat)}
                  className="input text-xs"
                >
                  <option value={ContentFormat.REEL}>Reel</option>
                  <option value={ContentFormat.POST}>Post / Photo</option>
                  <option value={ContentFormat.CAROUSEL}>Carousel</option>
                  <option value={ContentFormat.VIDEO}>Video</option>
                  <option value={ContentFormat.STORY}>Story</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-ink mb-1">Date Posted</label>
                <input
                  type="date"
                  value={postedAt}
                  onChange={(e) => setPostedAt(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Caption / Title</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Paste post caption or summary..."
                rows={2}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Post URL (optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://instagram.com/p/... or https://tiktok.com/@..."
                className="input text-xs"
              />
            </div>

            {/* Tags section */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Content Tags</label>
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-paper border border-line text-ink"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted hover:text-ink ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(newTagInput);
                    }
                  }}
                  placeholder="Add tag (e.g. tutorial, skincare, unboxing)..."
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(newTagInput)}
                  className="btn-secondary btn-small"
                >
                  <Plus size={13} />
                  Add
                </button>
              </div>

              {/* Suggestions from existing tags */}
              {existingTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[11px] text-muted self-center mr-1">Suggested:</span>
                  {existingTags
                    .filter((t) => !tags.includes(t))
                    .slice(0, 6)
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        className="text-[11px] px-1.5 py-0.5 rounded border border-line bg-paper/60 text-muted hover:text-ink hover:border-gold/50 transition-colors"
                      >
                        +{t}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-line" />

          {/* Group 2: Metrics (Optional) */}
          <div className="space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setMetricsOpen(!metricsOpen)}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  2. Native Metrics (Optional)
                </h3>
                {liveER != null && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                    ER: {liveER.toFixed(2)}%
                  </span>
                )}
              </div>
              <button type="button" className="text-muted hover:text-ink p-1">
                {metricsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {metricsOpen && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Views</label>
                    <input
                      type="number"
                      value={views}
                      onChange={(e) => setViews(e.target.value)}
                      placeholder="e.g. 150000"
                      className="input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1">Reach</label>
                    <input
                      type="number"
                      value={reach}
                      onChange={(e) => setReach(e.target.value)}
                      placeholder="e.g. 135000"
                      className="input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1">Impressions</label>
                    <input
                      type="number"
                      value={impressions}
                      onChange={(e) => setImpressions(e.target.value)}
                      placeholder="e.g. 180000"
                      className="input text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-muted mb-1">Likes</label>
                    <input
                      type="number"
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      placeholder="e.g. 12000"
                      className="input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1">Comments</label>
                    <input
                      type="number"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="e.g. 450"
                      className="input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1">Shares</label>
                    <input
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      placeholder="e.g. 850"
                      className="input text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted mb-1">Saves</label>
                    <input
                      type="number"
                      value={saves}
                      onChange={(e) => setSaves(e.target.value)}
                      placeholder="e.g. 2100"
                      className="input text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted">
                  Engagement rate is calculated automatically from (Likes + Comments + Shares + Saves) ÷ Reach.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-line" />

          {/* Group 3: Demographics (Optional) */}
          <div className="space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setDemographicsOpen(!demographicsOpen)}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                3. Audience Demographics Breakdown (Optional)
              </h3>
              <button type="button" className="text-muted hover:text-ink p-1">
                {demographicsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>

            {demographicsOpen && (
              <div className="space-y-4 pt-1">
                {/* Age brackets */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-2">
                    Age Distribution (%)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {AGE_BRACKETS.map((bracket) => (
                      <div key={bracket}>
                        <label className="block text-[10px] text-muted mb-0.5">{bracket}</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={ageDistribution[bracket] || ""}
                            onChange={(e) =>
                              setAgeDistribution({
                                ...ageDistribution,
                                [bracket]: e.target.value,
                              })
                            }
                            placeholder="0"
                            className="input text-xs font-mono pr-4"
                          />
                          <span className="absolute right-1.5 top-2 text-[10px] text-muted">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gender Split */}
                <div>
                  <label className="block text-xs font-medium text-ink mb-2">Gender Split (%)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">Female</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={femaleSplit}
                          onChange={(e) => setFemaleSplit(e.target.value)}
                          placeholder="e.g. 75"
                          className="input text-xs font-mono pr-4"
                        />
                        <span className="absolute right-1.5 top-2 text-[10px] text-muted">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">Male</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={maleSplit}
                          onChange={(e) => setMaleSplit(e.target.value)}
                          placeholder="e.g. 23"
                          className="input text-xs font-mono pr-4"
                        />
                        <span className="absolute right-1.5 top-2 text-[10px] text-muted">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-muted mb-0.5">Other / Non-Binary</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={otherSplit}
                          onChange={(e) => setOtherSplit(e.target.value)}
                          placeholder="e.g. 2"
                          className="input text-xs font-mono pr-4"
                        />
                        <span className="absolute right-1.5 top-2 text-[10px] text-muted">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Locations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-ink">Top Audience Locations</label>
                    <button
                      type="button"
                      onClick={handleAddLocationRow}
                      className="text-xs text-gold hover:underline flex items-center gap-1 font-medium"
                    >
                      <Plus size={12} /> Add city
                    </button>
                  </div>

                  <div className="space-y-2">
                    {locations.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => {
                            const updated = [...locations];
                            updated[idx].location = e.target.value;
                            setLocations(updated);
                          }}
                          placeholder="City / Region (e.g. Mumbai, India)"
                          className="input text-xs flex-1"
                        />
                        <div className="relative w-24">
                          <input
                            type="number"
                            step="0.1"
                            value={row.percentage}
                            onChange={(e) => {
                              const updated = [...locations];
                              updated[idx].percentage = e.target.value;
                              setLocations(updated);
                            }}
                            placeholder="%"
                            className="input text-xs font-mono pr-4"
                          />
                          <span className="absolute right-1.5 top-2 text-[10px] text-muted">%</span>
                        </div>
                        {locations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLocationRow(idx)}
                            className="p-1.5 text-muted hover:text-viz-rose transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <div className="text-xs text-muted">
              {toastMessage ? (
                <span className="inline-flex items-center gap-1 text-viz-teal font-medium">
                  <Check size={14} /> {toastMessage}
                </span>
              ) : (
                "Save with partial data and update anytime."
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary btn-small"
              >
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="btn btn-small">
                {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Log post"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


"use client";

import { useState, useMemo } from "react";
import { Platform, ContentFormat } from "@prisma/client";
import {
  Filter,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  BarChart2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { PostWithRelations, computeEngagementRate } from "@/lib/types/content";
import { deletePost } from "@/app/creators/[id]/actions";
import PostFormModal from "./post-form-modal";

interface ContentTableProps {
  creatorId: string;
  creatorName: string;
  posts: PostWithRelations[];
  existingTags: string[];
  onSelectPostForDemographics?: (post: PostWithRelations) => void;
}

export default function ContentTable({
  creatorId,
  creatorName,
  posts,
  existingTags,
  onSelectPostForDemographics,
}: ContentTableProps) {
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [tagFilter, setTagFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithRelations | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Available tags in current posts
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      for (const t of p.tags) {
        set.add(t.name);
      }
    }
    return Array.from(set).sort();
  }, [posts]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (platformFilter !== "ALL" && post.platform !== platformFilter) return false;
      if (formatFilter !== "ALL" && post.format !== formatFilter) return false;
      if (tagFilter !== "ALL" && !post.tags.some((t) => t.name === tagFilter)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCaption = post.caption?.toLowerCase().includes(query);
        const matchesTag = post.tags.some((t) => t.name.toLowerCase().includes(query));
        if (!matchesCaption && !matchesTag) return false;
      }
      return true;
    });
  }, [posts, platformFilter, formatFilter, tagFilter, searchQuery]);

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this logged post?")) return;
    setIsDeletingId(postId);
    try {
      await deletePost(postId, creatorId);
    } catch (err: any) {
      alert(err?.message || "Failed to delete post");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel p-3.5 rounded-lg border border-line">
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="input text-xs w-auto py-1.5 px-2.5"
          >
            <option value="ALL">All Platforms</option>
            <option value={Platform.INSTAGRAM}>Instagram</option>
            <option value={Platform.TIKTOK}>TikTok</option>
          </select>

          {/* Format Filter */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="input text-xs w-auto py-1.5 px-2.5"
          >
            <option value="ALL">All Formats</option>
            <option value={ContentFormat.REEL}>Reels</option>
            <option value={ContentFormat.POST}>Posts / Photos</option>
            <option value={ContentFormat.CAROUSEL}>Carousels</option>
            <option value={ContentFormat.VIDEO}>Videos</option>
            <option value={ContentFormat.STORY}>Stories</option>
          </select>

          {/* Tag Filter */}
          {availableTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input text-xs w-auto py-1.5 px-2.5"
            >
              <option value="ALL">All Tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {/* Search caption */}
          <input
            type="text"
            placeholder="Search caption or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input text-xs w-44 py-1.5 px-2.5"
          />

          {(platformFilter !== "ALL" || formatFilter !== "ALL" || tagFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setPlatformFilter("ALL");
                setFormatFilter("ALL");
                setTagFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-muted hover:text-ink underline px-1"
            >
              Reset
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setEditingPost(null);
            setIsLogModalOpen(true);
          }}
          className="btn btn-small whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Log post</span>
        </button>
      </div>

      {/* Posts Table */}
      <div className="card overflow-hidden">
        {filteredPosts.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-line/50 text-muted flex items-center justify-center mx-auto">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">
                {posts.length === 0 ? "No content logged yet for this creator" : "No posts matching filters"}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                {posts.length === 0
                  ? "Log native post performance metrics and audience demographics from Instagram or TikTok insights."
                  : "Try clearing your filters or search keywords to view all logged posts."}
              </p>
            </div>
            {posts.length === 0 && (
              <button
                onClick={() => {
                  setEditingPost(null);
                  setIsLogModalOpen(true);
                }}
                className="btn btn-small mt-2"
              >
                <Plus size={14} />
                <span>Log first post</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-ledger">
              <thead>
                <tr>
                  <th className="w-28">Format & Platform</th>
                  <th className="w-28">Date</th>
                  <th>Caption & Tags</th>
                  <th className="w-24 text-right">Reach</th>
                  <th className="w-24 text-right">Views</th>
                  <th className="w-28 text-right">Engagement</th>
                  <th className="w-24 text-center">Demographics</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => {
                  const er = computeEngagementRate(post.metrics);
                  const hasDemographics =
                    Boolean(post.demographics?.ageRanges && Object.keys(post.demographics.ageRanges).length > 0) ||
                    Boolean(post.demographics?.genderSplit && Object.keys(post.demographics.genderSplit).length > 0) ||
                    Boolean(post.demographics?.topLocations && post.demographics.topLocations.length > 0);

                  return (
                    <tr key={post.id} className="table-row">
                      {/* Format & Platform */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-xs text-ink">
                            {post.format.charAt(0) + post.format.slice(1).toLowerCase()}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded w-fit ${
                              post.platform === Platform.INSTAGRAM
                                ? "bg-viz-rose/10 text-viz-rose border border-viz-rose/20"
                                : "bg-viz-teal/10 text-viz-teal border border-viz-teal/20"
                            }`}
                          >
                            {post.platform === Platform.INSTAGRAM ? "Instagram" : "TikTok"}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="text-xs font-mono text-muted whitespace-nowrap">
                        {new Date(post.postedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Caption & Tags */}
                      <td>
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-ink font-medium line-clamp-1">
                              {post.caption || <span className="text-muted italic">No caption provided</span>}
                            </span>
                            {post.url && (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted hover:text-gold shrink-0"
                                title="Open post URL"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {post.tags.map((t) => (
                                <span
                                  key={t.id}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-paper text-muted border border-line"
                                >
                                  #{t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Reach */}
                      <td className="text-right text-xs font-mono">
                        {post.metrics?.reach != null ? (
                          post.metrics.reach.toLocaleString("en-IN")
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Views */}
                      <td className="text-right text-xs font-mono">
                        {post.metrics?.views != null ? (
                          post.metrics.views.toLocaleString("en-IN")
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Engagement Rate */}
                      <td className="text-right">
                        {er != null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                              er >= 5
                                ? "bg-gold/15 text-gold border border-gold/30"
                                : er >= 2.5
                                ? "bg-viz-teal/10 text-viz-teal border border-viz-teal/20"
                                : "bg-line/40 text-muted"
                            }`}
                          >
                            {er.toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted font-mono">—</span>
                        )}
                      </td>

                      {/* Demographics View Trigger */}
                      <td className="text-center">
                        {hasDemographics ? (
                          <button
                            type="button"
                            onClick={() => onSelectPostForDemographics?.(post)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-gold bg-gold/10 hover:bg-gold/20 border border-gold/25 transition-colors"
                            title="View post demographics"
                          >
                            <BarChart2 size={12} />
                            <span>View</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPost(post);
                              setIsLogModalOpen(true);
                            }}
                            className="text-[11px] text-muted hover:text-ink underline"
                          >
                            + Add
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPost(post);
                              setIsLogModalOpen(true);
                            }}
                            className="p-1.5 text-muted hover:text-ink transition-colors rounded hover:bg-line/30"
                            title="Edit post"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            disabled={isDeletingId === post.id}
                            className="p-1.5 text-muted hover:text-viz-rose transition-colors rounded hover:bg-line/30"
                            title="Delete post"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log/Edit Modal */}
      {isLogModalOpen && (
        <PostFormModal
          creatorId={creatorId}
          creatorName={creatorName}
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          postToEdit={editingPost}
          existingTags={existingTags}
        />
      )}
    </div>
  );
}


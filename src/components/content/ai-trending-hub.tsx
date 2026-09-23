"use client";

import { useState, useEffect } from "react";
import { TrendingTopic } from "@/lib/ai-trending";
import {
  Flame,
  Rocket,
  Zap,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Music,
  Share2,
  Video,
  ChevronDown,
  BrainCircuit,
  Lightbulb,
  ArrowUpRight,
} from "lucide-react";

interface AITrendingHubProps {
  initialTopics?: TrendingTopic[];
  creatorId?: string;
  creatorName?: string;
  compact?: boolean;
}

const CATEGORIES = [
  { id: "ALL", label: "All Niches" },
  { id: "TECH", label: "Tech & AI" },
  { id: "FASHION", label: "Fashion & Beauty" },
  { id: "LIFESTYLE", label: "Lifestyle & Vlogs" },
  { id: "FINANCE", label: "Finance & Career" },
  { id: "FITNESS", label: "Fitness & Health" },
  { id: "FOOD_TRAVEL", label: "Food & Travel" },
  { id: "ENTERTAINMENT", label: "Pop Culture" },
] as const;

export default function AITrendingHub({
  initialTopics,
  creatorId,
  creatorName,
  compact = false,
}: AITrendingHubProps) {
  const [topics, setTopics] = useState<TrendingTopic[]>(initialTopics || []);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [loading, setLoading] = useState(!initialTopics);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const fetchTopics = async (category: string, force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const endpoint = force
        ? "/api/ai/trending-topics"
        : `/api/ai/trending-topics?category=${category}${creatorId ? `&creatorId=${creatorId}` : ""}`;
      const res = await fetch(endpoint, {
        method: force ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(force ? { body: JSON.stringify({ category, creatorId }) } : {}),
      });

      if (!res.ok) throw new Error("Failed to load trends");
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (err) {
      console.error("Error fetching AI trends:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialTopics || activeCategory !== "ALL") {
      fetchTopics(activeCategory, false);
    }
  }, [activeCategory, creatorId]);

  const handleCopyHook = async (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy hook:", err);
    }
  };

  const handleCopyFullBrief = async (e: React.MouseEvent, topic: TrendingTopic) => {
    e.stopPropagation();
    const briefText = `🔥 MountLift Trend Brief: ${topic.title}\n\n🎬 Platform: ${topic.targetPlatform}\n🎯 Hook: "${topic.hookIdea}"\n\n💡 Retention Angle: ${topic.contentAngle}\n🎵 Audio Vibe: ${topic.suggestedAudioStyle}\n🏷️ Tags: ${topic.suggestedHashtags?.join(" ")}`;
    try {
      await navigator.clipboard.writeText(briefText);
      setCopiedId(`brief-${topic.id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy brief:", err);
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCardId((prev) => (prev === id ? null : id));
  };

  const getViralBadge = (score: string) => {
    switch (score) {
      case "VIRAL":
        return {
          icon: <Flame size={12} className="text-orange-500" />,
          label: "Viral Spike",
          style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
        };
      case "HIGH":
        return {
          icon: <Rocket size={12} className="text-gold" />,
          label: "High Momentum",
          style: "bg-gold/10 text-gold border-gold/25",
        };
      case "EMERGING":
      default:
        return {
          icon: <Zap size={12} className="text-sky-500" />,
          label: "Emerging Wave",
          style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
        };
    }
  };

  const getCategoryLabel = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.label : cat;
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper/50 p-3.5 rounded-xl border border-line">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-ink tracking-tight">
                Daily AI Trend Radar
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-gold/10 text-gold border border-gold/25">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <span>Live Insights</span>
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {creatorName
                ? `Hot topics, viral hooks & script angles tailored for ${creatorName}.`
                : "Real-time viral topics and script hooks curated for today."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTopics(activeCategory, true)}
            disabled={refreshing || loading}
            className="btn btn-secondary btn-small flex items-center gap-1.5 text-xs font-medium"
            title="Trigger an on-demand AI scan for fresh trends"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin text-gold" : ""} />
            <span>{refreshing ? "Scanning Radar..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-ink text-paper border-ink shadow-sm"
                  : "bg-paper/60 hover:bg-paper text-muted hover:text-ink border-line"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Topics Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="card p-4 space-y-2.5 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-3.5 w-16 bg-line/80 rounded" />
                <div className="h-3.5 w-20 bg-line/80 rounded" />
              </div>
              <div className="h-4.5 w-3/4 bg-line/80 rounded" />
              <div className="h-3.5 w-full bg-line/50 rounded" />
              <div className="h-3.5 w-2/3 bg-line/50 rounded" />
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-ink">No trends found for this niche right now.</p>
          <p className="text-xs text-muted">Click Refresh to prompt the AI for a fresh scan.</p>
          <button
            onClick={() => fetchTopics(activeCategory, true)}
            className="btn btn-secondary btn-small inline-flex items-center gap-1.5"
          >
            <RefreshCw size={12} />
            <span>Run Fresh AI Scan</span>
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-3.5`}>
          {topics.map((topic) => {
            const badge = getViralBadge(topic.viralScore);
            const isExpanded = expandedCardId === topic.id;

            return (
              <div
                key={topic.id}
                onClick={() => toggleCard(topic.id)}
                className={`card p-4 flex flex-col justify-between transition-all duration-300 ease-out cursor-pointer group ${
                  isExpanded
                    ? "border-gold/50 bg-paper/90 shadow-md ring-1 ring-gold/20"
                    : "border-line bg-paper/40 hover:bg-paper/70 hover:border-gold/30 hover:-translate-y-0.5 shadow-sm"
                }`}
              >
                <div>
                  {/* Card Header: Category & Viral Tag */}
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className="font-mono text-[10px] uppercase font-medium text-muted tracking-wider bg-background px-2 py-0.5 rounded border border-line">
                      {getCategoryLabel(topic.category)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border flex items-center gap-1 ${badge.style}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Topic Title */}
                  <h3 className="text-sm font-bold text-ink group-hover:text-gold transition-colors leading-snug">
                    {topic.title}
                  </h3>

                  {/* Concise 1-Line Hook Preview in Collapsed State */}
                  {!isExpanded && (
                    <div className="mt-2 text-xs text-muted flex items-start gap-1.5 line-clamp-2">
                      <Lightbulb size={13} className="text-gold shrink-0 mt-0.5 opacity-80" />
                      <span className="italic text-ink/80">&ldquo;{topic.hookIdea}&rdquo;</span>
                    </div>
                  )}

                  {/* Smooth Accordion Content: Expands on Click */}
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isExpanded ? "grid-rows-[1fr] opacity-100 mt-3.5 pt-3 border-t border-line/70" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden space-y-3">
                      {/* Platform & Why Trending */}
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted mb-1">
                          <Video size={12} className="text-gold" />
                          <span>{topic.targetPlatform}</span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {topic.whyTrending}
                        </p>
                      </div>

                      {/* Ready-to-Record Hook Box */}
                      <div className="p-3 rounded-lg bg-background border border-line space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gold font-bold tracking-wider">
                          <span>Opening 3-Sec Hook</span>
                          <button
                            onClick={(e) => handleCopyHook(e, topic.id, topic.hookIdea)}
                            className="text-muted hover:text-ink transition-colors flex items-center gap-1 bg-paper px-2 py-0.5 rounded border border-line text-[10px] font-mono"
                            title="Copy opening hook"
                          >
                            {copiedId === topic.id ? (
                              <>
                                <Check size={11} className="text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>Copy Hook</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-ink italic leading-snug">
                          &ldquo;{topic.hookIdea}&rdquo;
                        </p>
                      </div>

                      {/* Retention Strategy & Angle */}
                      <div>
                        <div className="text-[10px] font-mono uppercase text-muted font-semibold mb-1">
                          Retention & Script Angle
                        </div>
                        <p className="text-xs text-ink leading-relaxed bg-background/60 p-2.5 rounded-md border border-line/60">
                          {topic.contentAngle}
                        </p>
                      </div>

                      {/* Audio Vibe */}
                      {topic.suggestedAudioStyle && (
                        <div className="flex items-start gap-1.5 text-[11px] text-muted font-mono bg-background/40 px-2 py-1.5 rounded border border-line/50">
                          <Music size={12} className="text-gold mt-0.5 shrink-0" />
                          <span>{topic.suggestedAudioStyle}</span>
                        </div>
                      )}

                      {/* Hashtags */}
                      {topic.suggestedHashtags && topic.suggestedHashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {topic.suggestedHashtags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-background border border-line text-muted"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Bottom / Toggle Prompt */}
                <div className="pt-2.5 mt-2.5 border-t border-line/40 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-muted group-hover:text-gold transition-colors flex items-center gap-1">
                    {isExpanded ? "Click to collapse" : "Click to view full brief"}
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </span>

                  {isExpanded && (
                    <button
                      onClick={(e) => handleCopyFullBrief(e, topic)}
                      className="text-[11px] font-mono text-gold hover:underline flex items-center gap-1"
                      title="Copy formatted brief"
                    >
                      {copiedId === `brief-${topic.id}` ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-emerald-500 font-sans">Copied Brief</span>
                        </>
                      ) : (
                        <>
                          <Share2 size={11} />
                          <span>Copy Brief</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

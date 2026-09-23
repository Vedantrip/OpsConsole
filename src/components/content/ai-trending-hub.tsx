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
  Hash,
  Share2,
  Video,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Filter,
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
  const [source, setSource] = useState<string>("gemini");

  const fetchTopics = async (category: string, force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const endpoint = force ? "/api/ai/trending-topics" : `/api/ai/trending-topics?category=${category}${creatorId ? `&creatorId=${creatorId}` : ""}`;
      const res = await fetch(endpoint, {
        method: force ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        ...(force ? { body: JSON.stringify({ category, creatorId }) } : {}),
      });

      if (!res.ok) throw new Error("Failed to load trends");
      const data = await res.json();
      setTopics(data.topics || []);
      if (data.source) setSource(data.source);
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

  const handleCopyHook = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy hook:", err);
    }
  };

  const getViralBadge = (score: string) => {
    switch (score) {
      case "VIRAL":
        return {
          icon: <Flame size={13} className="text-orange-500 animate-pulse" />,
          label: "Viral Spike",
          style: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
        };
      case "HIGH":
        return {
          icon: <Rocket size={13} className="text-gold" />,
          label: "High Momentum",
          style: "bg-gold/10 text-gold border-gold/30",
        };
      case "EMERGING":
      default:
        return {
          icon: <Zap size={13} className="text-sky-500" />,
          label: "Emerging Wave",
          style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper/60 p-4 rounded-xl border border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-gold/20 to-amber-500/10 border border-gold/30 flex items-center justify-center text-gold shrink-0 shadow-sm">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-ink tracking-tight flex items-center gap-1.5">
                <span>Daily Trending AI Radar</span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gold/10 text-gold border border-gold/30 flex items-center gap-1">
                <BrainCircuit size={11} />
                <span>Live AI Curation</span>
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {creatorName
                ? `Real-time hot topics, viral formats & hook scripts tailored for ${creatorName}.`
                : "Real-time viral topics, script hooks, and trending content angles for today."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchTopics(activeCategory, true)}
            disabled={refreshing || loading}
            className="btn btn-secondary btn-small flex items-center gap-1.5 text-xs"
            title="Trigger a live AI scan for fresh trends"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-gold" : ""} />
            <span>{refreshing ? "Scanning AI Radar..." : "Refresh Trends"}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      {!compact && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border ${
                activeCategory === cat.id
                  ? "bg-ink text-paper border-ink shadow-sm"
                  : "bg-paper/80 hover:bg-paper text-muted hover:text-ink border-line"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Topics Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="card p-5 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-line rounded" />
                <div className="h-4 w-24 bg-line rounded" />
              </div>
              <div className="h-5 w-3/4 bg-line rounded" />
              <div className="h-14 bg-line/60 rounded-lg" />
              <div className="h-16 bg-line/40 rounded-lg" />
            </div>
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-sm font-medium text-ink">No specific trends found for this niche right now.</p>
          <p className="text-xs text-muted">Click &quot;Refresh Trends&quot; to prompt the AI for a fresh scan.</p>
          <button
            onClick={() => fetchTopics(activeCategory, true)}
            className="btn btn-secondary btn-small inline-flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Run Fresh AI Scan</span>
          </button>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"} gap-4`}>
          {topics.map((topic) => {
            const badge = getViralBadge(topic.viralScore);
            const isExpanded = expandedCardId === topic.id;

            return (
              <div
                key={topic.id}
                className="card p-4.5 flex flex-col justify-between border-line hover:border-gold/40 transition-all duration-200 group bg-paper/40 hover:bg-paper/70 shadow-sm"
              >
                <div className="space-y-3">
                  {/* Card Header: Category & Viral Badge */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-[10px] uppercase font-semibold text-muted tracking-wider bg-background px-2 py-0.5 rounded border border-line">
                      {getCategoryLabel(topic.category)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border flex items-center gap-1 ${badge.style}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Title & Target Platform */}
                  <div>
                    <h3 className="text-sm font-bold text-ink group-hover:text-gold transition-colors leading-snug">
                      {topic.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted mt-1">
                      <Video size={12} className="text-gold" />
                      <span>{topic.targetPlatform}</span>
                    </div>
                  </div>

                  {/* Why it's trending */}
                  <p className="text-xs text-muted leading-relaxed line-clamp-2">
                    {topic.whyTrending}
                  </p>

                  {/* High Impact Hook Callout */}
                  <div className="p-3 rounded-lg bg-background border border-line/80 relative space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase text-gold font-bold tracking-wider">
                      <span>Viral Hook Script</span>
                      <button
                        onClick={() => handleCopyHook(topic.id, topic.hookIdea)}
                        className="text-muted hover:text-ink transition-colors flex items-center gap-1 bg-paper px-1.5 py-0.5 rounded border border-line"
                        title="Copy hook to clipboard"
                      >
                        {copiedId === topic.id ? (
                          <>
                            <Check size={11} className="text-emerald-500" />
                            <span className="text-emerald-500 text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs font-medium text-ink italic leading-snug">
                      &ldquo;{topic.hookIdea}&rdquo;
                    </p>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="pt-2 space-y-2.5 text-xs border-t border-line/60 animate-fade-in">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-muted font-semibold mb-0.5">
                          Retention Angle
                        </div>
                        <p className="text-ink text-xs leading-relaxed bg-background/50 p-2 rounded border border-line/60">
                          {topic.contentAngle}
                        </p>
                      </div>

                      {topic.suggestedAudioStyle && (
                        <div className="flex items-start gap-1.5 text-[11px] text-muted font-mono">
                          <Music size={12} className="text-gold mt-0.5 shrink-0" />
                          <span>{topic.suggestedAudioStyle}</span>
                        </div>
                      )}

                      {topic.suggestedHashtags && topic.suggestedHashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
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
                  )}
                </div>

                {/* Card Footer: Toggle Strategy Details */}
                <div className="pt-3 mt-3 border-t border-line/50 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setExpandedCardId(isExpanded ? null : topic.id)}
                    className="text-xs text-muted hover:text-ink font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>{isExpanded ? "Hide Strategy" : "View Angle & Audio"}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <button
                    onClick={() => handleCopyHook(topic.id, `${topic.title}\n\nHook: "${topic.hookIdea}"\n\nAngle: ${topic.contentAngle}\n\nTags: ${topic.suggestedHashtags?.join(" ")}`)}
                    className="text-[11px] font-mono text-gold hover:underline flex items-center gap-1"
                    title="Copy full brief"
                  >
                    <Share2 size={11} />
                    <span>Copy Full Brief</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Flame,
  Music,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Award,
  ChevronRight,
  Headphones,
} from "lucide-react";

interface HookTemplate {
  vibe: "POV" | "VIRAL_OPENER" | "CONTROVERSIAL" | "SECRET_SAUCE" | "STORYTIME";
  badge: string;
  hook: string;
  retentionHack: string;
  soundStyle: string;
  niche: string;
}

const SAMPLE_HOOKS: HookTemplate[] = [
  {
    vibe: "POV",
    badge: "🔥 3-Sec Hook",
    hook: "POV: You found the one cheat code that 99% of people in your industry refuse to share on camera.",
    retentionHack: "Cut immediately on beat 2. Zoom in 1.15x for instant eye-tracking retention.",
    soundStyle: "Speed-up UK Drill / Low-pass Bass Drop",
    niche: "Tech & Career",
  },
  {
    vibe: "VIRAL_OPENER",
    badge: "⚡ Viral Opener",
    hook: "Do NOT buy this until you know the exact truth they don't print on the packaging...",
    retentionHack: "Show the product upside down for 1.2s to spike comment inquiries.",
    soundStyle: "Subtle Eerie Synth Suspense ➔ Beat Drop",
    niche: "Lifestyle & Beauty",
  },
  {
    vibe: "SECRET_SAUCE",
    badge: "🤫 Secret Sauce",
    hook: "I tested this exact routine for 14 days straight so you don't waste 6 months doing it wrong.",
    retentionHack: "Flash a quick split-screen day 1 vs day 14 before 0:03.",
    soundStyle: "Chill Neo-Soul / French House Lo-Fi",
    niche: "Fitness & Wellness",
  },
  {
    vibe: "CONTROVERSIAL",
    badge: "💥 Hot Take",
    hook: "Unpopular opinion: Stop saving 20% of your money the old way. Do this exact 3-step modern flip instead.",
    retentionHack: "Text bubble on screen: 'Save this before it gets taken down'.",
    soundStyle: "Fast Phonk Drift / Aggressive Beat",
    niche: "Finance & Wealth",
  },
  {
    vibe: "STORYTIME",
    badge: "📖 Storytime Spike",
    hook: "The craziest thing just happened with a client and I honestly cannot believe I'm putting this on the internet...",
    retentionHack: "Start walking forward towards the lens with dynamic natural lighting.",
    soundStyle: "Aesthetic Indie Vlog Beat",
    niche: "Creative & Travel",
  },
];

const TRENDING_AUDIO_DROPS = [
  {
    title: "Midnight Tokyo Drift",
    bpm: "142 BPM",
    vibe: "⚡ High Energy Reels",
    velocity: "+340% today",
    format: "Transition / Outfit Swap",
  },
  {
    title: "Chill Cafe Lo-Fi Tape",
    bpm: "84 BPM",
    vibe: "☕ Aesthetic Vlogs",
    velocity: "+180% steady",
    format: "Talking Head / Story",
  },
  {
    title: "Synthwave Pulse 2026",
    bpm: "128 BPM",
    vibe: "🚀 Tech / Product Reveal",
    velocity: "+520% viral surge",
    format: "3D Motion / UI Teaser",
  },
];

export default function CreatorVibeStudio() {
  const [selectedVibe, setSelectedVibe] = useState<string>("ALL");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAudio, setCopiedAudio] = useState<string | null>(null);
  const [randomSeed, setRandomSeed] = useState(0);

  const filteredHooks =
    selectedVibe === "ALL"
      ? SAMPLE_HOOKS
      : SAMPLE_HOOKS.filter((h) => h.vibe === selectedVibe);

  const handleCopyHook = async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyAudio = async (title: string, info: string) => {
    try {
      await navigator.clipboard.writeText(`🎵 Audio Cue: ${title} (${info})`);
      setCopiedAudio(title);
      setTimeout(() => setCopiedAudio(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Vibe & Hook Studio Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: AI Viral Hook Generator (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl bg-panel/70 border border-line p-6 backdrop-blur-md shadow-sm relative overflow-hidden group">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-gold/5 blur-3xl pointer-events-none group-hover:bg-gold/10 transition-all duration-700" />

          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-base text-ink tracking-tight">
                    Viral Hook & Script Studio
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-mono font-bold border border-gold/30 uppercase">
                    Gen-Z AI
                  </span>
                </div>
                <p className="text-xs text-muted">
                  High-retention 3-second openers and retention angles for your creators.
                </p>
              </div>
            </div>

            <button
              onClick={() => setRandomSeed((s) => s + 1)}
              className="px-3 py-1.5 rounded-lg bg-paper hover:bg-paper/80 text-muted hover:text-ink text-xs font-mono flex items-center gap-1.5 border border-line transition-all self-start sm:self-auto hover:border-gold/40"
            >
              <RefreshCw size={12} className={randomSeed ? "animate-spin-once" : ""} />
              <span>Shuffle Hooks</span>
            </button>
          </div>

          {/* Vibe Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none relative z-10">
            {[
              { id: "ALL", label: "✨ All Vibes" },
              { id: "POV", label: "🎬 POV Style" },
              { id: "VIRAL_OPENER", label: "⚡ 3-Sec Hooks" },
              { id: "SECRET_SAUCE", label: "🤫 Secret Sauce" },
              { id: "CONTROVERSIAL", label: "💥 Hot Takes" },
              { id: "STORYTIME", label: "📖 Storytime" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedVibe(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                  selectedVibe === tab.id
                    ? "bg-gold text-paper font-semibold shadow-sm"
                    : "bg-paper/60 hover:bg-paper text-muted hover:text-ink border border-line"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Hook Cards Feed */}
          <div className="space-y-3 relative z-10">
            {filteredHooks.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl bg-paper/50 border border-line p-4 hover:border-gold/40 hover:bg-paper/80 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/25">
                        {item.badge}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-paper border border-line text-muted">
                        {item.niche}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-ink leading-snug">
                      &ldquo;{item.hook}&rdquo;
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-[11px]">
                        <Zap size={13} className="shrink-0" />
                        <span>{item.retentionHack}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted font-mono text-[11px]">
                        <Headphones size={13} className="shrink-0 text-gold" />
                        <span className="truncate">{item.soundStyle}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyHook(idx, item.hook)}
                    className="btn btn-secondary btn-small self-end sm:self-center shrink-0"
                    title="Copy hook to clipboard"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Hook</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Audio Trend Radar & Mojo Gauge (4 cols) */}
        <div className="lg:col-span-4 space-y-5 flex flex-col">
          {/* Creator Mojo & Momentum Gauge */}
          <div className="rounded-2xl bg-panel/70 border border-line p-5 backdrop-blur-md shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
                  Live Roster Momentum
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-mono font-bold border border-gold/30">
                Peak Velocity
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-display font-bold text-ink tracking-tight">
                  94.8<span className="text-xs font-mono text-muted font-normal"> / 100</span>
                </span>
                <span className="text-xs font-mono text-emerald-500 font-semibold flex items-center gap-1">
                  <TrendingUp size={13} /> +12.4% this week
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-paper border border-line overflow-hidden p-0.5">
                <div className="h-full rounded-full bg-gold w-[94%] transition-all duration-1000" />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1">
                <span>🔥 6-Day Consistency</span>
                <span>⚡ 0 Scraping Violations</span>
              </div>
            </div>
          </div>

          {/* Trending Audio & Sound Styles */}
          <div className="rounded-2xl bg-panel/70 border border-line p-5 backdrop-blur-md shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                    <Music size={14} />
                  </div>
                  <h4 className="font-display font-bold text-xs sm:text-sm text-ink">Audio Wave Radar</h4>
                </div>
                <span className="text-[10px] font-mono text-muted">Viral Sounds</span>
              </div>

              <div className="space-y-2.5">
                {TRENDING_AUDIO_DROPS.map((audio, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopyAudio(audio.title, `${audio.bpm} · ${audio.format}`)}
                    className="p-3 rounded-xl bg-paper/50 hover:bg-paper border border-line hover:border-gold/40 transition-all cursor-pointer group/audio"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-ink group-hover/audio:text-gold transition-colors">
                        {audio.title}
                      </div>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">
                        {audio.velocity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-muted">
                      <span className="px-1.5 py-0.5 rounded bg-panel border border-line">
                        {audio.bpm}
                      </span>
                      <span className="truncate">{audio.vibe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {copiedAudio && (
              <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono text-center animate-fade-in">
                ✓ Copied &ldquo;{copiedAudio}&rdquo; audio cue!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

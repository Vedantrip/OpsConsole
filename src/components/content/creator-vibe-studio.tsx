"use client";

import { useState } from "react";
import {
  Sparkles,
  Zap,
  Flame,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  Award,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Eye,
  Camera,
  Play,
  Share2,
  Bookmark,
  Volume2,
  SlidersHorizontal,
} from "lucide-react";

interface ScriptBlueprint {
  hookLine: string;
  visualAction: string;
  audioCue: string;
  bodyDelivery: string;
  ctaAngle: string;
  directorTip: string;
  estimatedRetention: string;
}

interface HookTemplate {
  id: string;
  vibe: "POV" | "VIRAL_OPENER" | "CONTROVERSIAL" | "SECRET_SAUCE" | "STORYTIME" | "CTA_HACK";
  badge: string;
  hook: string;
  retentionHack: string;
  soundStyle: string;
  niche: string;
  blueprint: ScriptBlueprint;
}

const ALL_HOOKS: HookTemplate[] = [
  {
    id: "h-1",
    vibe: "POV",
    badge: "🔥 3-Sec Retention Spike",
    hook: "POV: You found the one cheat code that 99% of people in your industry refuse to share on camera.",
    retentionHack: "Cut immediately on beat 2. Zoom in 1.15x for instant eye-tracking retention.",
    soundStyle: "Speed-up UK Drill / Low-pass Bass Drop",
    niche: "Tech & AI",
    blueprint: {
      hookLine: "POV: You found the one cheat code that 99% of people in your industry refuse to share on camera.",
      visualAction: "Screen recording zoom-in with cursor highlighting a hidden toggle or dashboard setting.",
      audioCue: "Subtle sub-bass whoosh transition on cut 1.",
      bodyDelivery: "Instead of spending 4 hours manually formatting content, this single workflow automated 80% of our production pipeline in 3 clicks.",
      ctaAngle: "Comment 'WORKFLOW' and I will DM you the direct template file before it is locked.",
      directorTip: "Keep text overlay at upper-chest height to avoid Instagram UI icons overlay.",
      estimatedRetention: "94% at 3.0s",
    },
  },
  {
    id: "h-2",
    vibe: "VIRAL_OPENER",
    badge: "⚡ 3-Sec Hook",
    hook: "Do NOT buy this until you know the exact truth they don't print on the packaging...",
    retentionHack: "Show the product upside down for 1.2s to spike comment inquiries.",
    soundStyle: "Subtle Eerie Synth Suspense ➔ Beat Drop",
    niche: "Lifestyle & Beauty",
    blueprint: {
      hookLine: "Do NOT buy this until you know the exact truth they don't print on the packaging...",
      visualAction: "Hold product upside-down close to camera lens, then snap it right-side up.",
      audioCue: "Vinyl scratch stop sound effect right after first sentence.",
      bodyDelivery: "Everyone is hyping the bottle design, but the active ingredient concentration is actually 2x higher than products costing $90 more.",
      ctaAngle: "Save this so you don't overpay when restocks go live Friday.",
      directorTip: "Natural window light at 45-degree angle makes bottle textures pop.",
      estimatedRetention: "96% at 3.0s",
    },
  },
  {
    id: "h-3",
    vibe: "SECRET_SAUCE",
    badge: "🤫 Secret Sauce",
    hook: "I tested this exact routine for 14 days straight so you don't waste 6 months doing it wrong.",
    retentionHack: "Flash a quick split-screen day 1 vs day 14 before 0:03.",
    soundStyle: "Chill Neo-Soul / French House Lo-Fi",
    niche: "Fitness & Health",
    blueprint: {
      hookLine: "I tested this exact routine for 14 days straight so you don't waste 6 months doing it wrong.",
      visualAction: "Fast 0.5s b-roll flash of Day 1 notebook vs Day 14 results.",
      audioCue: "Smooth neo-soul drum fill on beat.",
      bodyDelivery: "Rule #1: Ditch the 90-minute marathon sessions. 3 compound movements with strict 90s rests outperformed everything else.",
      ctaAngle: "Bookmark this breakdown for your next gym session tomorrow.",
      directorTip: "Use wide-angle lens (24mm) positioned low to give dynamic athletic perspective.",
      estimatedRetention: "91% at 3.0s",
    },
  },
  {
    id: "h-4",
    vibe: "CONTROVERSIAL",
    badge: "💥 Hot Take",
    hook: "Unpopular opinion: Stop saving 20% of your money the old way. Do this exact 3-step modern flip instead.",
    retentionHack: "Text bubble on screen: 'Save this before it gets taken down'.",
    soundStyle: "Fast Phonk Drift / Aggressive Beat",
    niche: "Finance & Wealth",
    blueprint: {
      hookLine: "Unpopular opinion: Stop saving 20% of your money the old way. Do this exact 3-step modern flip instead.",
      visualAction: "Talking head pacing briskly towards camera with quick jump cuts.",
      audioCue: "Muffled bass into high-energy drop.",
      bodyDelivery: "Traditional savings accounts lose 4% to real inflation annually. Allocating into high-yield liquidity pools preserves upside with zero lock-in.",
      ctaAngle: "Drop your biggest finance question below and I'll break it down in part 2.",
      directorTip: "High-contrast rim lighting creates authority on camera.",
      estimatedRetention: "95% at 3.0s",
    },
  },
  {
    id: "h-5",
    vibe: "STORYTIME",
    badge: "📖 Storytime Spike",
    hook: "The craziest thing just happened with a brand sponsor and I honestly cannot believe I'm putting this on the internet...",
    retentionHack: "Start walking forward towards the lens with dynamic natural lighting.",
    soundStyle: "Aesthetic Indie Vlog Beat",
    niche: "Content & Growth",
    blueprint: {
      hookLine: "The craziest thing just happened with a brand sponsor and I honestly cannot believe I'm putting this on the internet...",
      visualAction: "Handheld vlog camera walking through a doorway or outdoors.",
      audioCue: "Warm acoustic guitar ambient strum.",
      bodyDelivery: "They offered a $15,000 deal on one condition: delete all competitor reviews from last year. Here is why I rejected the bag and what happened next.",
      ctaAngle: "Share this with another creator who needs to hear this integrity lesson.",
      directorTip: "Use built-in lapel mic to capture crisp, unfiltered vocal intimacy.",
      estimatedRetention: "98% at 3.0s",
    },
  },
  {
    id: "h-6",
    vibe: "POV",
    badge: "🎬 POV Angle",
    hook: "POV: You finally stopped doing what everyone told you to do, and your numbers 10x'd in 3 weeks.",
    retentionHack: "Rapid text reveal on screen with sound effect on word 4.",
    soundStyle: "Hyperpop / Synth Melodic Drop",
    niche: "Content & Growth",
    blueprint: {
      hookLine: "POV: You finally stopped doing what everyone told you to do, and your numbers 10x'd in 3 weeks.",
      visualAction: "Quick 3-shot montage: Laptop screen, analytics chart spike, celebratory reaction.",
      audioCue: "Synth pluck crescendo.",
      bodyDelivery: "We cut our posting frequency in half and spent that extra time testing high-contrast opening 3-second visual hooks.",
      ctaAngle: "Tap the link in bio for the free hook formula sheet.",
      directorTip: "Color grade with warm highlights and deep shadows for cinematic punch.",
      estimatedRetention: "92% at 3.0s",
    },
  },
  {
    id: "h-7",
    vibe: "VIRAL_OPENER",
    badge: "⚡ 3-Sec Hook",
    hook: "This single habit feels illegal to know, but it will literally save you 10 hours this week...",
    retentionHack: "Whisper opening line into phone mic close to lens.",
    soundStyle: "Low-Fi Vinyl Texture / Soft Kick",
    niche: "Tech & AI",
    blueprint: {
      hookLine: "This single habit feels illegal to know, but it will literally save you 10 hours this week...",
      visualAction: "Close-up portrait framing with shallow depth of field.",
      audioCue: "ASMR paper rustle or keyboard clack.",
      bodyDelivery: "Instead of writing emails from scratch, feed your meeting transcripts directly into this custom prompt template.",
      ctaAngle: "Save this post to copy the prompt when you get back to your desk.",
      directorTip: "Position phone at eye-level with soft front ring light.",
      estimatedRetention: "97% at 3.0s",
    },
  },
  {
    id: "h-8",
    vibe: "CTA_HACK",
    badge: "🎯 Conversion Engine",
    hook: "If you only implement ONE strategy from this entire page, make it this 10-second fix.",
    retentionHack: "Hold up 1 finger firmly with a fast snap animation sound.",
    soundStyle: "Modern Cinematic Trap / Snare Pop",
    niche: "E-Commerce & Brands",
    blueprint: {
      hookLine: "If you only implement ONE strategy from this entire page, make it this 10-second fix.",
      visualAction: "Point directly at camera lens, then shift focus to on-screen product demonstration.",
      audioCue: "Crisp snare hit on 'ONE strategy'.",
      bodyDelivery: "Changing our hero product headline to directly address the buyer's #1 fear bumped checkout conversions by 31% in 48 hours.",
      ctaAngle: "Send this to your marketing team or partner right now.",
      directorTip: "Keep caption text size large and readable on mobile feeds.",
      estimatedRetention: "93% at 3.0s",
    },
  },
];

interface CreatorVibeStudioProps {
  averageScore?: number | null;
  activeRosterCount?: number;
  verifiedCount?: number;
  openDeliverablesCount?: number;
}

export default function CreatorVibeStudio({
  averageScore,
  activeRosterCount = 0,
  verifiedCount = 0,
  openDeliverablesCount = 0,
}: CreatorVibeStudioProps) {
  const [selectedVibe, setSelectedVibe] = useState<string>("ALL");
  const [selectedNiche, setSelectedNiche] = useState<string>("ALL");
  const [expandedHookId, setExpandedHookId] = useState<string | null>(null);
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null);
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);

  // Deterministic seed rotation without calling AI APIs
  const dayOffset = (new Date().getDate() + shuffleSeed) % ALL_HOOKS.length;
  const rotatedHooks = [...ALL_HOOKS.slice(dayOffset), ...ALL_HOOKS.slice(0, dayOffset)];

  const filteredHooks = rotatedHooks.filter((h) => {
    const matchesVibe = selectedVibe === "ALL" || h.vibe === selectedVibe;
    const matchesNiche = selectedNiche === "ALL" || h.niche.toLowerCase().includes(selectedNiche.toLowerCase());
    return matchesVibe && matchesNiche;
  });

  const handleCopyHookOnly = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHookId(id);
      setTimeout(() => setCopiedHookId(null), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyFullScript = async (id: string, item: HookTemplate) => {
    try {
      const scriptText = `🎬 VIRAL 30-SEC SCRIPT BLUEPRINT (${item.niche})
------------------------------------------------
⏱️ 0:00 - 0:03 [3-SEC HOOK]:
"${item.blueprint.hookLine}"
Visual: ${item.blueprint.visualAction}
Audio: ${item.blueprint.audioCue}

⚡ 0:03 - 0:18 [RETENTION BRIDGE & VALUE]:
${item.blueprint.bodyDelivery}

🎯 0:18 - 0:30 [HIGH-CONVERTING CTA]:
${item.blueprint.ctaAngle}

🎥 DIRECTOR CUT TIP:
${item.blueprint.directorTip}
Expected Retention: ${item.blueprint.estimatedRetention}
------------------------------------------------
Generated via MountLift Ops Creative Studio`;

      await navigator.clipboard.writeText(scriptText);
      setCopiedScriptId(id);
      setTimeout(() => setCopiedScriptId(null), 2200);
    } catch (e) {
      console.error(e);
    }
  };

  // Accurate live database calculation (no fake default score if roster is empty)
  const hasRoster = activeRosterCount > 0;
  const hasScore = hasRoster && averageScore != null && Number.isFinite(averageScore);
  const displayScore = hasScore ? Math.round(averageScore! * 10) / 10 : null;

  let scoreTier = "Awaiting Talent";
  let scoreColor = "text-muted";
  let progressWidth = 0;

  if (!hasRoster) {
    scoreTier = "No Roster Active";
    scoreColor = "text-muted";
    progressWidth = 0;
  } else if (!hasScore) {
    scoreTier = "Audits Pending";
    scoreColor = "text-amber-400";
    progressWidth = 15;
  } else {
    progressWidth = Math.min(100, Math.max(10, displayScore!));
    if (displayScore! >= 90) {
      scoreTier = "A+ Tier 1% Elite";
      scoreColor = "text-gold";
    } else if (displayScore! >= 80) {
      scoreTier = "High Impact Roster";
      scoreColor = "text-emerald-500";
    } else if (displayScore! >= 70) {
      scoreTier = "Solid Growth";
      scoreColor = "text-sky-400";
    } else {
      scoreTier = "Roster Developing";
      scoreColor = "text-amber-400";
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Live Roster Momentum Metric (Real Data Sync) */}
      <div className="rounded-2xl bg-gradient-to-r from-panel/90 via-paper/70 to-panel/90 border border-line p-5 sm:p-6 backdrop-blur-md shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-gold/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${hasRoster ? "bg-emerald-500 animate-pulse" : "bg-muted"}`} />
              <span className="text-xs font-mono font-bold text-muted uppercase tracking-wider">
                Live Roster Momentum
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-mono font-bold border border-gold/30">
                {scoreTier}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-display font-black text-ink tracking-tight">
                {displayScore != null ? displayScore : "—"}
                <span className="text-sm font-mono text-muted font-normal"> / 100</span>
              </span>
              <span className="text-xs font-mono text-muted">
                {hasRoster
                  ? `${activeRosterCount} Creator${activeRosterCount === 1 ? "" : "s"} on Roster · ${openDeliverablesCount} Deals in Flight`
                  : "Add your first creator in the Creators tab to calculate live momentum"}
              </span>
            </div>

            {/* Real Progress Bar */}
            <div className="w-full max-w-xl h-2 rounded-full bg-paper border border-line overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  hasScore ? "bg-gradient-to-r from-gold to-amber-400" : "bg-muted/30"
                }`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap lg:border-l lg:border-line lg:pl-6">
            <div className="p-3 rounded-xl bg-paper/60 border border-line min-w-[130px]">
              <div className="text-[10px] font-mono text-muted uppercase">Verified APIs</div>
              <div className="text-lg font-display font-bold text-emerald-500 flex items-center gap-1.5 mt-0.5">
                <Award size={16} />
                <span>{verifiedCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-paper/60 border border-line min-w-[130px]">
              <div className="text-[10px] font-mono text-muted uppercase">Roster Status</div>
              <div className="text-lg font-display font-bold text-ink flex items-center gap-1.5 mt-0.5">
                <TrendingUp size={16} className="text-gold" />
                <span>{hasRoster ? "Active" : "Standby"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio: Viral Hook & Script Studio (Aesthetic Redesign) */}
      <div className="rounded-3xl bg-panel/75 border border-line p-6 sm:p-7 backdrop-blur-md shadow-sm relative overflow-hidden group">
        {/* Ambient Warm Studio Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none group-hover:bg-gold/15 transition-all duration-700" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

        {/* Studio Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 mb-6 pb-5 border-b border-line">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/25 via-amber-500/15 to-transparent border border-gold/40 text-gold flex items-center justify-center shrink-0 shadow-md">
              <Clapperboard size={22} className="text-gold animate-subtle-float" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg text-ink tracking-tight">
                  Viral Hook & Script Studio
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-gold/15 text-gold text-[10px] font-mono font-bold border border-gold/30 uppercase tracking-wide">
                  2026 Production Blueprints
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                High-retention 3-second openers, camera shot-lists, and conversion script angles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShuffleSeed((s) => s + 1)}
              className="px-3.5 py-2 rounded-xl bg-paper hover:bg-paper/80 text-ink hover:text-gold text-xs font-mono font-medium flex items-center gap-2 border border-line hover:border-gold/40 transition-all shadow-sm"
              title="Rotate fresh set of viral frameworks"
            >
              <RefreshCw size={13} className={shuffleSeed ? "animate-spin-once text-gold" : "text-muted"} />
              <span>Rotate Angles</span>
            </button>
          </div>
        </div>

        {/* Dual Filter Controls: Vibes & Niches */}
        <div className="space-y-3 mb-6 relative z-10">
          {/* Vibe Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: "ALL", label: "✨ All Frameworks" },
              { id: "POV", label: "🎬 POV Angles" },
              { id: "VIRAL_OPENER", label: "⚡ 3-Sec Hooks" },
              { id: "SECRET_SAUCE", label: "🤫 Secret Sauce" },
              { id: "CONTROVERSIAL", label: "💥 Hot Takes" },
              { id: "STORYTIME", label: "📖 Storytime Spikes" },
              { id: "CTA_HACK", label: "🎯 High-Converting CTAs" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedVibe(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedVibe === tab.id
                    ? "bg-gold text-paper font-semibold shadow-md shadow-gold/10"
                    : "bg-paper/60 hover:bg-paper text-muted hover:text-ink border border-line"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Niche Selector Filter */}
          <div className="flex items-center gap-2 text-xs font-mono text-muted flex-wrap pt-1">
            <span className="flex items-center gap-1 text-gold">
              <SlidersHorizontal size={11} /> Niche:
            </span>
            {["ALL", "Tech & AI", "Lifestyle & Beauty", "Finance & Wealth", "Fitness & Health", "Content & Growth"].map((n) => (
              <button
                key={n}
                onClick={() => setSelectedNiche(n)}
                className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                  selectedNiche === n
                    ? "bg-gold/15 text-gold font-bold border border-gold/30"
                    : "hover:text-ink text-muted"
                }`}
              >
                {n === "ALL" ? "All Niches" : n}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Hook & Script Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {filteredHooks.map((item) => {
            const isExpanded = expandedHookId === item.id;
            const isCopiedHook = copiedHookId === item.id;
            const isCopiedScript = copiedScriptId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
                  isExpanded
                    ? "bg-paper/90 border-gold/50 shadow-lg shadow-gold/5 ring-1 ring-gold/20"
                    : "bg-paper/50 hover:bg-paper/80 border-line hover:border-gold/35"
                }`}
              >
                <div className="p-5 space-y-3.5 flex-1">
                  {/* Badges & Meta Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-gold/10 text-gold border border-gold/25">
                        {item.badge}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-panel border border-line text-muted">
                        {item.niche}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 flex items-center gap-1">
                      <Eye size={10} /> {item.blueprint.estimatedRetention}
                    </span>
                  </div>

                  {/* The Primary Hook Line */}
                  <div className="relative">
                    <p className="text-sm sm:text-base font-semibold text-ink leading-snug font-sans tracking-tight">
                      &ldquo;{item.hook}&rdquo;
                    </p>
                  </div>

                  {/* Retention & Audio Cues */}
                  <div className="space-y-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-panel/60 border border-line/60 flex items-start gap-2 text-xs">
                      <Zap size={14} className="text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                          3-Sec Retention Trigger
                        </span>
                        <p className="text-ink/90 text-xs">{item.retentionHack}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted px-1">
                      <Volume2 size={12} className="text-gold shrink-0" />
                      <span className="truncate">Audio Cue: {item.soundStyle}</span>
                    </div>
                  </div>

                  {/* Expanded 30-Sec Script Blueprint Drawer */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gold/20 space-y-3.5 animate-fade-in bg-panel/40 p-4 rounded-xl border border-line">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                          <Play size={12} className="text-gold fill-gold" />
                          <span>Full 30-Sec Storyboard</span>
                        </span>
                        <span className="text-[10px] font-mono text-muted">Director Cut</span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-2.5 rounded-lg bg-paper border border-line">
                          <span className="font-mono font-bold text-muted text-[10px] block mb-1">
                            ⏱️ 0:00 - 0:03 [Visual & Audio Action]
                          </span>
                          <p className="text-ink font-medium">{item.blueprint.visualAction}</p>
                        </div>

                        <div className="p-2.5 rounded-lg bg-paper border border-line">
                          <span className="font-mono font-bold text-muted text-[10px] block mb-1">
                            ⚡ 0:03 - 0:18 [Value Bridge]
                          </span>
                          <p className="text-ink">{item.blueprint.bodyDelivery}</p>
                        </div>

                        <div className="p-2.5 rounded-lg bg-paper border border-line">
                          <span className="font-mono font-bold text-muted text-[10px] block mb-1">
                            🎯 0:18 - 0:30 [Call To Action]
                          </span>
                          <p className="text-gold font-semibold">{item.blueprint.ctaAngle}</p>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300">
                          <span className="font-mono font-bold text-[10px] block mb-1">
                            🎥 Pro Production Tip
                          </span>
                          <p className="text-xs text-amber-200">{item.blueprint.directorTip}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Actions */}
                <div className="p-4 bg-paper/80 border-t border-line flex items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedHookId(isExpanded ? null : item.id)}
                    className="text-xs font-mono text-muted hover:text-gold flex items-center gap-1 transition-colors"
                  >
                    <span>{isExpanded ? "Hide Blueprint" : "View 30s Script"}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Copy Hook Only */}
                    <button
                      onClick={() => handleCopyHookOnly(item.id, item.hook)}
                      className="px-2.5 py-1.5 rounded-lg bg-panel hover:bg-paper text-ink text-xs font-mono border border-line hover:border-gold/40 flex items-center gap-1.5 transition-all"
                      title="Copy 3-second hook"
                    >
                      {isCopiedHook ? (
                        <>
                          <Check size={12} className="text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Hook</span>
                        </>
                      )}
                    </button>

                    {/* Copy Full Script */}
                    <button
                      onClick={() => handleCopyFullScript(item.id, item)}
                      className="px-3 py-1.5 rounded-lg bg-gold hover:bg-gold/90 text-paper font-semibold text-xs font-mono flex items-center gap-1.5 transition-all shadow-sm"
                      title="Copy full 30s production script"
                    >
                      {isCopiedScript ? (
                        <>
                          <Check size={12} className="text-paper" />
                          <span>Script Copied!</span>
                        </>
                      ) : (
                        <>
                          <Clapperboard size={12} />
                          <span>Copy Script</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

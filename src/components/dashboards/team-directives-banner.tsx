"use client";

import { useState } from "react";
import {
  AlertCircle,
  BellRing,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  X,
  Radio,
  CheckCircle2,
} from "lucide-react";

interface ManagerUpdateItem {
  id: string;
  title: string;
  body: string;
  createdAt: Date | string;
}

interface TeamDirectivesBannerProps {
  updates: ManagerUpdateItem[];
}

export default function TeamDirectivesBanner({ updates }: TeamDirectivesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (!updates || updates.length === 0 || dismissed) {
    return null;
  }

  const latestUpdate = updates[activeTab] || updates[0];
  const dateObj = new Date(latestUpdate.createdAt);
  const formattedDate = dateObj.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-paper/80 backdrop-blur-md p-4 sm:p-5 shadow-lg shadow-amber-950/10 transition-all duration-300">
      {/* Ambient Pulsing Glow */}
      <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full bg-amber-500/15 blur-2xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 right-10 w-40 h-40 rounded-full bg-gold/10 blur-2xl pointer-events-none" />

      {/* Main Banner Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {/* Pulsing "!" Alert Badge */}
          <div className="relative shrink-0 mt-0.5 sm:mt-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-display font-black text-lg shadow-inner">
              <span>!</span>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/35 uppercase flex items-center gap-1">
                <Radio size={10} className="animate-pulse text-amber-400" />
                <span>Admin Directive</span>
              </span>
              {updates.length > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-paper border border-line text-muted text-[10px] font-mono">
                  {updates.length} Updates Available
                </span>
              )}
              <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                <Clock size={11} />
                {formattedDate}
              </span>
            </div>

            <h3 className="font-display font-bold text-sm sm:text-base text-ink truncate">
              {latestUpdate.title}
            </h3>
            
            {!isExpanded && (
              <p className="text-xs text-muted/90 truncate max-w-2xl mt-0.5">
                {latestUpdate.body}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-paper hover:bg-paper/90 text-xs font-mono text-ink border border-line hover:border-amber-500/40 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>{isExpanded ? "Collapse" : "Read Directive"}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-paper/80 text-muted hover:text-ink transition-colors"
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Directives View */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-amber-500/20 relative z-10 space-y-4 animate-fade-in">
          {/* Multiple updates tabs if > 1 */}
          {updates.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {updates.map((up, idx) => (
                <button
                  key={up.id}
                  onClick={() => setActiveTab(idx)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all whitespace-nowrap ${
                    activeTab === idx
                      ? "bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40"
                      : "bg-paper/60 text-muted hover:text-ink border border-line"
                  }`}
                >
                  #{idx + 1} {up.title.slice(0, 24)}...
                </button>
              ))}
            </div>
          )}

          <div className="p-4 rounded-xl bg-paper/70 border border-line space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider">
                Operational Memo
              </span>
              <span className="text-[10px] font-mono text-muted">
                Target: Creator Management Desk
              </span>
            </div>
            <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap font-sans">
              {latestUpdate.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

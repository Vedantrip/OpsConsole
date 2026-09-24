"use client";

import { useState } from "react";
import { Search, Play, FileSpreadsheet, Loader2, Sparkles, AlertCircle, ChevronDown, CheckCircle2, ShieldCheck, Users, MapPin, Heart, BarChart3 } from "lucide-react";
import { saveInsightSnapshot, saveInsightSnapshotForCreator, extractInsightMetrics } from "./actions";

type Creator = { id: string; name: string; handle: string | null; platform: string | null };
type AuditResult = Record<string, any>;
type DistributionItem = { label: string; value: number | null };

function pct(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function num(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function consistencyColor(label: unknown) {
  const l = String(label ?? "").toLowerCase();
  if (l.includes("very consistent") || l === "consistent") return "bg-gold/10 text-gold border-gold/30";
  if (l.includes("somewhat")) return "bg-paper text-ink border-line";
  if (l.includes("highly inconsistent")) return "bg-viz-rose/10 text-viz-rose border-viz-rose/30";
  return "bg-paper text-muted border-line";
}

function scoreTone(score: unknown) {
  if (typeof score !== "number" || Number.isNaN(score)) return "text-muted";
  if (score >= 80) return "text-gold";
  if (score >= 60) return "text-ink";
  return "text-viz-rose";
}

function formatScore(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return Math.round(n).toString();
}

function distributionRows(value: unknown): DistributionItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(Boolean).map((item) => {
    if (typeof item === "string") return { label: item, value: null };
    return {
      label: String(item.label ?? item.name ?? item.location ?? item.category ?? "Unknown"),
      value: typeof item.value === "number" ? item.value : null,
    };
  });
}

function Distribution({ title, icon, items }: { title: string; icon: React.ReactNode; items: unknown }) {
  const rows = distributionRows(items).slice(0, 6);
  return (
    <div className="rounded-lg border border-line bg-paper/60 p-3.5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted font-mono font-medium mb-2.5">
        {icon}<span>{title}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-muted">Not available from public signals.</div>
      ) : (
        <div className="space-y-2">
          {rows.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-ink font-medium truncate">{item.label}</span>
              <span className="font-mono text-muted shrink-0 font-medium">{item.value == null ? "—" : `${item.value}%`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditPanel({ creators }: { creators: Creator[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [manualHandles, setManualHandles] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, AuditResult> | null>(null);
  const [extractedMetricsMap, setExtractedMetricsMap] = useState<Record<string, any>>({});
  const [savedHandles, setSavedHandles] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const igCreators = creators.filter((c) => c.handle && (!c.platform || c.platform.toLowerCase().includes("insta")));
  const filteredRoster = igCreators.filter((c) => c.name.toLowerCase().includes(rosterSearch.toLowerCase()) || (c.handle && c.handle.toLowerCase().includes(rosterSearch.toLowerCase())));

  function toggle(handle: string) {
    setSelected((prev) => prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]);
  }

  function toggleSelectAll() {
    if (selected.length === filteredRoster.length) setSelected([]);
    else setSelected(filteredRoster.map((c) => c.handle!).filter(Boolean));
  }

  function allHandles() {
    const fromManual = manualHandles.split(/[\n,]/).map((h) => h.trim().replace(/^@/, "")).filter(Boolean);
    const fromSelected = selected.map((h) => h.replace(/^@/, ""));
    return Array.from(new Set([...fromSelected, ...fromManual]));
  }

  async function runAudit() {
    const handles = allHandles();
    if (handles.length === 0) {
      setError("Pick at least one creator from your roster or paste a handle below.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setSavedHandles([]);
    setExtractedMetricsMap({});

    try {
      const res = await fetch("/api/instagram-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, full: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The scraper backend returned an error.");
        return;
      }

      const apiResults = data.results ?? data;
      const rawEntries: [string, AuditResult][] = Array.isArray(apiResults)
        ? apiResults.map((result, index) => [String(index), result])
        : Object.entries(apiResults);
      const resObj: Record<string, AuditResult> = Object.fromEntries(
        rawEntries.map(([returnedKey, rawData], index) => {
          const isPositionKey = /^\d+$/.test(returnedKey);
          const returnedHandle = String(rawData?.username ?? "").replace(/^@/, "");
          const key = returnedHandle || (isPositionKey ? handles[index] ?? returnedKey : returnedKey.replace(/^@/, ""));
          return [key, rawData];
        })
      );
      setResults(resObj);

      const saved: string[] = [];
      const metricsMap: Record<string, any> = {};
      for (const [handle, rawData] of Object.entries(resObj)) {
        if (rawData && !rawData.error) {
          const metrics = await extractInsightMetrics(rawData);
          metricsMap[handle] = metrics;
          const rosterCreator = igCreators.find((creator) => creator.handle?.trim().replace(/^@/, "").toLowerCase() === handle.toLowerCase());
          const savedInsight = rosterCreator ? await saveInsightSnapshotForCreator(rosterCreator.id, rawData) : await saveInsightSnapshot(handle, rawData);
          if (savedInsight) saved.push(handle.toLowerCase());
        }
      }
      setExtractedMetricsMap(metricsMap);
      setSavedHandles(saved);

      if (Array.isArray(data.errors) && data.errors.length > 0) {
        setError(`${data.errors.length} creator${data.errors.length === 1 ? "" : "s"} could not be fully analyzed. Completed profiles remain below.`);
      }
    } catch {
      setError("Couldn't complete the Instagram audit. The public Instagram provider may be temporarily unavailable — retry in a moment.");
    } finally {
      setLoading(false);
    }
  }

  async function exportXlsx() {
    const handles = allHandles();
    if (handles.length === 0) {
      setError("Pick at least one creator or paste a handle.");
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/instagram-audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handles, full: true }),
      });
      if (!res.ok) {
        setError("Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mountlift-insights-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {igCreators.length > 0 && (
          <div className="card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted">Select From Roster ({selected.length} selected)</span>
                <button type="button" onClick={toggleSelectAll} className="text-xs text-lift hover:underline font-mono">{selected.length === filteredRoster.length ? "Deselect all" : "Select all"}</button>
              </div>
              <div className="relative mb-3">
                <input type="text" placeholder="Filter roster creators..." value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} className="input pl-8 py-1.5 text-xs w-full" />
                <Search size={14} className="text-muted absolute left-2.5 top-2.5" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border border-line rounded-lg p-2 bg-paper/40">
                {filteredRoster.map((c) => (
                  <label key={c.id} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md hover:bg-paper cursor-pointer transition-colors">
                    <div className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(c.handle!)} onChange={() => toggle(c.handle!)} className="accent-gold" /><span className="font-medium text-ink">{c.name}</span></div>
                    <span className="text-muted font-mono text-[11px]">@{c.handle?.replace(/^@/, "")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="card p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-muted block mb-3">Or Paste Handles Directly</span>
            <textarea className="input text-xs font-mono w-full" rows={4} placeholder="nasa, dysonusa, marquesbrownlee (comma or line separated)" value={manualHandles} onChange={(e) => setManualHandles(e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-line">
            <button className="btn flex items-center gap-2" onClick={runAudit} disabled={loading}>
              {loading ? <><Loader2 size={14} className="animate-spin" /><span>Auditing public reels...</span></> : <><Play size={14} /><span>Run Audit</span></>}
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors" onClick={exportXlsx} disabled={exporting}>
              {exporting ? <><Loader2 size={12} className="animate-spin" /><span>Exporting...</span></> : <><FileSpreadsheet size={14} /><span>Export .xlsx</span></>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="card p-4 bg-viz-rose/10 border-viz-rose/30 text-viz-rose flex items-center gap-2 text-xs"><AlertCircle size={16} className="shrink-0" /><span>{error}</span></div>}

      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-display font-semibold text-ink flex items-center gap-2"><Sparkles size={16} className="text-gold" /><span>Creator Intelligence ({Object.keys(results).length} profiles)</span></h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border border-gold/20 text-gold bg-gold/10"><ShieldCheck size={11} /> Public-data estimates clearly labeled</span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {Object.entries(results).map(([handle, rawObj]) => {
              const metrics = extractedMetricsMap[handle] ?? {};
              const isSaved = savedHandles.includes(handle.toLowerCase());
              const audience = rawObj.audience ?? {};
              const profile = rawObj.profile ?? {};
              const scores = rawObj.scores ?? {};
              const performance = rawObj.performance ?? {};
              const dataQuality = rawObj.dataQuality ?? {};
              const audienceAvailable = audience.source !== "unavailable" && (
                (Array.isArray(audience.gender) && audience.gender.length > 0) ||
                (Array.isArray(audience.age) && audience.age.length > 0) ||
                (Array.isArray(audience.locations) && audience.locations.length > 0) ||
                (Array.isArray(audience.interests) && audience.interests.length > 0)
              );

              return (
                <div key={handle} className="card p-5 space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 text-gold flex items-center justify-center font-display font-bold">@</div>
                      <div>
                        <div className="font-display font-semibold text-ink text-base flex items-center gap-2">
                          <span>@{handle}</span>
                          {profile.verified === true && <span className="text-[10px] text-gold font-mono px-1.5 py-0.5 rounded bg-gold/10 border border-gold/20">VERIFIED</span>}
                          {isSaved && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"><CheckCircle2 size={10} />Auto-Saved</span>}
                        </div>
                        <div className="text-[11px] text-muted font-mono mt-0.5">{num(profile.followers)} followers · {num(profile.following)} following · {num(profile.posts)} posts</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono border border-gold/20 text-gold bg-gold/10">Audience Intelligence · Estimated from public signals</span>
                      {metrics.consistencyLabel && <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${consistencyColor(metrics.consistencyLabel)}`}>{metrics.consistencyLabel}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-5">
                    <div className="rounded-xl border border-line bg-paper/60 p-5 flex flex-col items-center justify-center text-center">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted font-mono font-medium">MountLift Score</div>
                      <div className={`text-5xl font-display font-bold mt-2 stat-number ${scoreTone(scores.overall)}`}>{formatScore(scores.overall)}</div>
                      <div className="text-[10px] text-muted mt-2">
                        {dataQuality.status === "profile_only" ? "Withheld · no public reels returned" : scores.note || "Proprietary evaluation · v1"}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 w-full text-left">
                        {[["Engagement", scores.engagement], ["Audience", scores.audience], ["Content", scores.content], ["Consistency", scores.consistency], ["Profile", scores.profile]].map(([label, value]) => (
                          <div key={String(label)} className="rounded-md border border-line bg-panel px-2.5 py-1.5 shadow-sm">
                            <div className="text-[9px] uppercase tracking-wider text-muted font-mono">{label}</div>
                            <div className={`text-sm font-semibold stat-number ${scoreTone(value)}`}>{formatScore(value)}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted font-mono font-medium"><BarChart3 size={13} />Performance Intelligence</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                        {[
                          ["Engagement Rate", pct(performance.engagementRate)],
                          ["Avg Views", num(performance.avgViews)],
                          ["Median Views", num(performance.medianViews)],
                          ["Avg Likes", num(performance.avgLikes)],
                          ["Avg Comments", num(performance.avgComments)],
                          ["Post Frequency", performance.postingFrequencyDays != null ? `${num(performance.postingFrequencyDays)}d` : "—"],
                          ["View / Follower", performance.viewToFollowerRatio != null ? `${(Number(performance.viewToFollowerRatio) * 100).toFixed(1)}%` : "—"],
                          ["Reels Analyzed", num(performance.reelsAnalyzed)],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="p-3 rounded-lg bg-paper/50 border border-line">
                            <div className="text-muted text-[10px] uppercase tracking-wider">{label}</div>
                            <div className="text-sm font-semibold text-ink mt-0.5 stat-number">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted font-mono font-medium"><Users size={13} />Audience Intelligence</div><span className="text-[10px] font-mono text-muted">Source: {audience.source || "unavailable"} · confidence: {audience.confidence || "none"}</span></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                      <Distribution title="Gender" icon={<Users size={12} />} items={audience.gender} />
                      <Distribution title="Age" icon={<BarChart3 size={12} />} items={audience.age} />
                      <Distribution title="Top Locations" icon={<MapPin size={12} />} items={audience.locations} />
                      <Distribution title="Interests" icon={<Heart size={12} />} items={audience.interests} />
                    </div>
                  </div>

                  {(rawObj.errors?.audience || rawObj.errors?.performance) && <div className="rounded-lg border border-gold/30 bg-gold/10 p-3 text-xs text-muted"><span className="text-gold font-semibold">Partial analysis:</span>{rawObj.errors?.performance ? ` performance: ${rawObj.errors.performance}` : ""}{rawObj.errors?.audience ? ` audience: ${rawObj.errors.audience}` : ""}</div>}

                  <details className="group pt-1">
                    <summary className="text-xs text-muted cursor-pointer hover:text-gold flex items-center gap-1 font-mono"><ChevronDown size={14} className="group-open:rotate-180 transition-transform" /><span>Raw JSON / debug data</span></summary>
                    <pre className="text-[11px] font-mono text-ink/80 bg-paper/70 p-3 rounded-lg border border-line mt-2 overflow-x-auto max-h-72">{JSON.stringify(rawObj, null, 2)}</pre>
                  </details>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

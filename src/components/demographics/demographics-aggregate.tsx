"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { PostWithRelations } from "@/lib/types/content";
import { Users, MapPin, PieChart as PieIcon, BarChart3 } from "lucide-react";

interface DemographicsAggregateProps {
  posts: PostWithRelations[];
  creatorName: string;
}

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];

export default function DemographicsAggregate({ posts, creatorName }: DemographicsAggregateProps) {
  // Filter posts with demographics
  const postsWithDemo = useMemo(() => {
    return posts.filter(
      (p) =>
        (p.demographics?.ageRanges && Object.keys(p.demographics.ageRanges).length > 0) ||
        (p.demographics?.genderSplit && Object.keys(p.demographics.genderSplit).length > 0) ||
        (p.demographics?.topLocations && p.demographics.topLocations.length > 0)
    );
  }, [posts]);

  // Compute reach-weighted demographics
  const weighted = useMemo(() => {
    if (postsWithDemo.length === 0) return null;

    let totalWeight = 0;
    const ageSums: Record<string, number> = {};
    const genderSums: Record<string, number> = { female: 0, male: 0, other: 0 };
    const locationSums: Record<string, number> = {};

    for (const p of postsWithDemo) {
      // Weight by reach, views, or default to 1000
      const weight = p.metrics?.reach && p.metrics.reach > 0
        ? p.metrics.reach
        : p.metrics?.views && p.metrics.views > 0
        ? p.metrics.views
        : 1000;

      totalWeight += weight;

      // Age
      if (p.demographics?.ageRanges) {
        for (const [bracket, val] of Object.entries(p.demographics.ageRanges)) {
          if (val != null) {
            ageSums[bracket] = (ageSums[bracket] ?? 0) + val * weight;
          }
        }
      }

      // Gender
      if (p.demographics?.genderSplit) {
        if (p.demographics.genderSplit.female != null) {
          genderSums.female += p.demographics.genderSplit.female * weight;
        }
        if (p.demographics.genderSplit.male != null) {
          genderSums.male += p.demographics.genderSplit.male * weight;
        }
        if (p.demographics.genderSplit.other != null) {
          genderSums.other += p.demographics.genderSplit.other * weight;
        }
      }

      // Locations
      if (p.demographics?.topLocations) {
        for (const loc of p.demographics.topLocations) {
          const name = loc.location.trim();
          if (name && loc.percentage != null) {
            locationSums[name] = (locationSums[name] ?? 0) + loc.percentage * weight;
          }
        }
      }
    }

    if (totalWeight === 0) return null;

    // Age chart data
    const ageData = AGE_ORDER.map((bracket) => ({
      bracket,
      percentage: ageSums[bracket] ? Number((ageSums[bracket] / totalWeight).toFixed(1)) : 0,
    })).filter((d) => d.percentage > 0 || AGE_ORDER.indexOf(d.bracket) < 4);

    // Gender split data
    const totalGenderRaw = genderSums.female + genderSums.male + genderSums.other;
    const genderData = [
      {
        name: "Female",
        value: totalGenderRaw > 0 ? Number((genderSums.female / totalWeight).toFixed(1)) : 0,
        color: "#CC9A3D", // Viz gold
      },
      {
        name: "Male",
        value: totalGenderRaw > 0 ? Number((genderSums.male / totalWeight).toFixed(1)) : 0,
        color: "#3F6B62", // Viz teal
      },
      {
        name: "Other",
        value: totalGenderRaw > 0 ? Number((genderSums.other / totalWeight).toFixed(1)) : 0,
        color: "#52657A", // Viz slate
      },
    ].filter((g) => g.value > 0);

    // Top locations sorted
    const locationData = Object.entries(locationSums)
      .map(([location, sum]) => ({
        location,
        percentage: Number((sum / totalWeight).toFixed(1)),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    return { ageData, genderData, locationData, sampleSize: postsWithDemo.length };
  }, [postsWithDemo]);

  if (!weighted || weighted.sampleSize === 0) {
    return (
      <div className="card p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-line/50 text-muted flex items-center justify-center mx-auto">
          <Users size={20} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">No audience demographics logged</h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            Log age distribution, gender split, and top locations when recording posts for {creatorName}{" "}
            to build a reach-weighted profile of who this creator&apos;s audience actually is.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">Reach-Weighted Audience Profile</h3>
          <p className="text-xs text-muted mt-0.5">
            Calculated across {weighted.sampleSize} post{weighted.sampleSize === 1 ? "" : "s"} weighted by
            impressions & reach.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Age Distribution Bar Chart (7 cols) */}
        <div className="card p-5 lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <BarChart3 size={14} className="text-gold" />
              <span>Age Bracket Distribution</span>
            </h4>
            <span className="text-[11px] font-mono text-muted">Audience Share %</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weighted.ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="bracket"
                  tick={{ fontSize: 11, fill: "#7A7266" }}
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
                  formatter={(val: any) => [`${val}%`, "Audience Share"]}
                  contentStyle={{
                    backgroundColor: "#FAF8F4",
                    borderColor: "#E7E1D4",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#1A1815",
                  }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {weighted.ageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.percentage === Math.max(...weighted.ageData.map((d) => d.percentage)) ? "#CC9A3D" : "#52657A"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Gender Split Breakdown (5 cols) */}
        <div className="card p-5 lg:col-span-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <PieIcon size={14} className="text-viz-teal" />
            <span>Gender Distribution</span>
          </h4>

          {/* Segment Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-paper flex overflow-hidden border border-line">
              {weighted.genderData.map((g) => (
                <div
                  key={g.name}
                  style={{ width: `${g.value}%`, backgroundColor: g.color }}
                  className="h-full transition-all duration-500"
                  title={`${g.name}: ${g.value}%`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              {weighted.genderData.map((g) => (
                <div key={g.name} className="p-2 rounded bg-paper/60 border border-line text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="text-[11px] text-muted">{g.name}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-ink stat-number">{g.value}%</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted pt-1">
            Dominant audience demographic is{" "}
            <strong className="text-ink">
              {weighted.genderData.sort((a, b) => b.value - a.value)[0]?.name || "balanced"}
            </strong>
            .
          </p>
        </div>

        {/* 3. Top Locations List (12 cols) */}
        <div className="card p-5 lg:col-span-12 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <MapPin size={14} className="text-viz-rose" />
              <span>Top Geographic Markets</span>
            </h4>
            <span className="text-[11px] text-muted font-mono">{weighted.locationData.length} cities identified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weighted.locationData.map((loc, i) => (
              <div key={loc.location} className="p-3 rounded bg-paper border border-line flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded bg-panel border border-line text-[10px] font-mono font-bold flex items-center justify-center text-muted shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium text-ink truncate">{loc.location}</span>
                </div>
                <span className="text-xs font-mono font-semibold text-gold shrink-0">
                  {loc.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useState, useMemo } from "react";
import { PostWithRelations, computeEngagementRate } from "@/lib/types/content";
import { ContentFormat } from "@prisma/client";
import { Grid, Tag, HelpCircle } from "lucide-react";

interface CrossAnalysisMatrixProps {
  posts: PostWithRelations[];
}

const AGE_BRACKETS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55+"];
const GENDERS = ["female", "male", "other"];

export default function CrossAnalysisMatrix({ posts }: CrossAnalysisMatrixProps) {
  const [rowDimension, setRowDimension] = useState<"format" | "tag">("tag");
  const [colDimension, setColDimension] = useState<"age" | "gender">("age");

  const matrixData = useMemo(() => {
    // Collect rows
    const rowKeys = new Set<string>();

    if (rowDimension === "format") {
      for (const p of posts) {
        rowKeys.add(p.format);
      }
    } else {
      for (const p of posts) {
        for (const t of p.tags) {
          rowKeys.add(t.name);
        }
      }
    }

    const columns = colDimension === "age" ? AGE_BRACKETS : GENDERS;
    const sortedRows = Array.from(rowKeys).sort();

    // Calculate cell averages: for each row & column, find posts matching row and average the demographic %
    const grid: Record<string, Record<string, { avgShare: number; avgER: number; postCount: number }>> = {};

    for (const row of sortedRows) {
      grid[row] = {};
      for (const col of columns) {
        let totalShare = 0;
        let totalER = 0;
        let countWithDemo = 0;
        let validERCount = 0;

        for (const p of posts) {
          const matchesRow =
            rowDimension === "format"
              ? p.format === row
              : p.tags.some((t) => t.name === row);

          if (!matchesRow) continue;

          const er = computeEngagementRate(p.metrics);
          if (er !== null) {
            totalER += er;
            validERCount += 1;
          }

          if (colDimension === "age" && p.demographics?.ageRanges) {
            const val = p.demographics.ageRanges[col];
            if (val != null) {
              totalShare += val;
              countWithDemo += 1;
            }
          } else if (colDimension === "gender" && p.demographics?.genderSplit) {
            const val = p.demographics.genderSplit[col];
            if (val != null) {
              totalShare += val;
              countWithDemo += 1;
            }
          }
        }

        grid[row][col] = {
          avgShare: countWithDemo > 0 ? Number((totalShare / countWithDemo).toFixed(1)) : 0,
          avgER: validERCount > 0 ? Number((totalER / validERCount).toFixed(1)) : 0,
          postCount: countWithDemo,
        };
      }
    }

    // Find max share for relative heatmap shading
    let maxShare = 0;
    for (const row of sortedRows) {
      for (const col of columns) {
        if (grid[row][col].avgShare > maxShare) {
          maxShare = grid[row][col].avgShare;
        }
      }
    }

    return { rows: sortedRows, columns, grid, maxShare };
  }, [posts, rowDimension, colDimension]);

  if (matrixData.rows.length === 0) {
    return (
      <div className="card p-8 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-line/50 text-muted flex items-center justify-center mx-auto">
          <Grid size={20} />
        </div>
        <h3 className="text-sm font-semibold text-ink">Demographic cross-analysis unavailable</h3>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Log tags and demographics on at least 2 posts to unlock content resonance matrices across age brackets.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      {/* Matrix Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <Grid size={15} className="text-gold" />
            <span>Content × Demographic Cross-Analysis</span>
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Identify which content themes and formats strike hardest with specific audience cohorts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Row Dimension Toggle */}
          <div className="inline-flex rounded-md border border-line bg-paper p-0.5 text-xs font-medium">
            <button
              onClick={() => setRowDimension("tag")}
              className={`px-2.5 py-1 rounded transition-colors ${
                rowDimension === "tag" ? "bg-panel text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              By Theme / Tag
            </button>
            <button
              onClick={() => setRowDimension("format")}
              className={`px-2.5 py-1 rounded transition-colors ${
                rowDimension === "format" ? "bg-panel text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              By Format
            </button>
          </div>

          {/* Col Dimension Toggle */}
          <div className="inline-flex rounded-md border border-line bg-paper p-0.5 text-xs font-medium">
            <button
              onClick={() => setColDimension("age")}
              className={`px-2.5 py-1 rounded transition-colors ${
                colDimension === "age" ? "bg-panel text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              Age Brackets
            </button>
            <button
              onClick={() => setColDimension("gender")}
              className={`px-2.5 py-1 rounded transition-colors ${
                colDimension === "gender" ? "bg-panel text-ink shadow-sm font-semibold" : "text-muted hover:text-ink"
              }`}
            >
              Gender Split
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="overflow-x-auto">
        <table className="table-ledger">
          <thead>
            <tr>
              <th className="w-40 font-semibold text-ink">
                {rowDimension === "tag" ? "Content Tag" : "Format"}
              </th>
              {matrixData.columns.map((col) => (
                <th key={col} className="text-center w-28 uppercase text-[11px] font-mono">
                  {col}
                </th>
              ))}
              <th className="text-right w-24 font-mono">Avg ER</th>
            </tr>
          </thead>
          <tbody>
            {matrixData.rows.map((row) => {
              const rowData = matrixData.grid[row];
              const overallER = Object.values(rowData)[0]?.avgER ?? 0;

              return (
                <tr key={row} className="table-row">
                  <td className="font-medium text-xs text-ink">
                    {rowDimension === "tag" ? (
                      <span className="inline-flex items-center gap-1 font-mono text-gold">
                        #{row}
                      </span>
                    ) : (
                      row.charAt(0) + row.slice(1).toLowerCase()
                    )}
                  </td>

                  {matrixData.columns.map((col) => {
                    const cell = rowData[col];
                    const intensity =
                      matrixData.maxShare > 0 ? (cell.avgShare / matrixData.maxShare) : 0;

                    return (
                      <td key={col} className="text-center p-2">
                        {cell.avgShare > 0 ? (
                          <div
                            className="py-1.5 px-2 rounded font-mono text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor: `rgba(204, 154, 61, ${Math.max(0.08, intensity * 0.35)})`,
                              color: intensity > 0.6 ? "#1A1815" : "#1A1815",
                            }}
                            title={`${cell.avgShare}% audience share across ${cell.postCount} posts`}
                          >
                            {cell.avgShare}%
                          </div>
                        ) : (
                          <span className="text-muted text-xs font-mono">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="text-right text-xs font-mono font-semibold text-gold">
                    {overallER > 0 ? `${overallER}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted pt-1">
        <span>Darker golden cells indicate higher demographic concentration for that theme.</span>
        <span>Cell values show average % share of audience</span>
      </div>
    </div>
  );
}


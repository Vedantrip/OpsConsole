import { NextResponse } from "next/server";
import { analyzeHandles, toInsightsResult } from "@/lib/instagram-audit";

export const maxDuration = 300;

export async function POST(req: Request) {
  if (!process.env.APIFY_API_TOKEN) {
    return NextResponse.json(
      { error: "APIFY_API_TOKEN is not configured for this deployment." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body?.handles) || body.handles.length === 0) {
      return NextResponse.json({ error: "Provide a non-empty 'handles' array." }, { status: 400 });
    }
    const audit = await analyzeHandles(body.handles, body.reelsLimit);
    if (audit.results.length === 0) {
      return NextResponse.json({ error: "All handles failed.", errors: audit.errors }, { status: 502 });
    }
    return NextResponse.json({ results: audit.results.map(toInsightsResult), errors: audit.errors });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Instagram audit failed." }, { status: 500 });
  }
}

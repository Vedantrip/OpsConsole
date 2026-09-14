import { NextResponse } from "next/server";

// Full audience enrichment is backed by a slower Apify actor. Allow the
// proxy to wait longer than the old 60s window for deployments that support
// extended serverless function duration.
export const maxDuration = 300;

export async function POST(req: Request) {
  const base = process.env.IG_SCRAPER_API_BASE;
  if (!base) {
    return NextResponse.json(
      { error: "IG_SCRAPER_API_BASE is not set in the environment." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const endpoint = body?.full === false ? "/analyze" : "/analyze/full";
  const { full: _full, ...payload } = body ?? {};

  try {
    const upstream = await fetch(`${base}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: data?.error ?? "The scraper backend returned an error.", details: data?.errors ?? null },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          "Couldn't reach the scraper backend. Full audience analysis can take longer than the proxy window; retry or use a smaller batch.",
      },
      { status: 502 }
    );
  }
}

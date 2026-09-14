const APIFY_BASE = "https://api.apify.com/v2";
const DEFAULT_ACTOR_ID = "hypebridge~influencer-evaluation-agent-instagram-tiktok";

export async function fetchAudienceForUsername(
  username: string,
  options: { token?: string; actorId?: string; timeoutMs?: number } = {}
) {
  const token = options.token || process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not set in the environment.");

  const cleanUsername = String(username || "").trim().replace(/^@/, "");
  if (!cleanUsername) throw new Error("Instagram handle cannot be empty.");

  const actorId = options.actorId || process.env.HYPEBRIDGE_ACTOR_ID || DEFAULT_ACTOR_ID;
  const response = await fetch(
    `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ influencerHandle: cleanUsername, platform: "instagram" }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 280_000),
    }
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText || "Unknown HypeBridge error";
    throw new Error(`HypeBridge request failed (${response.status}): ${message}`);
  }

  return Array.isArray(data) ? data : [data];
}

export const HYPEBRIDGE_DEFAULT_ACTOR_ID = DEFAULT_ACTOR_ID;

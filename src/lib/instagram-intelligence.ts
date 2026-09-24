function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").replace(/%/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDistribution(value: unknown) {
  const items = Array.isArray(value) ? value : value == null ? [] : [value];
  return items.map((item) => {
    if (typeof item === "string") return { label: item, value: null };
    if (!item || typeof item !== "object") return { label: String(item), value: null };
    const record = item as Record<string, unknown>;
    const label = firstDefined(
      record.label, record.name, record.category, record.location,
      record.country, record.city, record.gender, record.age, record.range
    );
    const numericValue = firstDefined(
      record.value, record.percentage, record.percent, record.share,
      record.weight, record.count
    );
    return {
      label: label == null ? "Unknown" : String(label),
      value: asNumber(numericValue),
    };
  });
}

function findDeep(root: unknown, keys: Set<string>, depth = 0): unknown {
  if (!root || typeof root !== "object" || depth > 7) return undefined;
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = findDeep(item, keys, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  const record = root as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (keys.has(key.toLowerCase()) && value !== undefined && value !== null) return value;
  }
  for (const value of Object.values(record)) {
    const found = findDeep(value, keys, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function distribution(raw: unknown, aliases: string[]) {
  return normalizeDistribution(findDeep(raw, new Set(aliases.map((value) => value.toLowerCase()))));
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function engagementScore(performance: any) {
  const rate = Number(performance?.engagementRate);
  return Number.isFinite(rate) ? clamp((rate / 8) * 100) : 50;
}

function audienceScore(audience: any) {
  const confidence = String(audience?.confidence || "medium").toLowerCase();
  const signalCount = [audience?.gender, audience?.age, audience?.locations, audience?.interests]
    .filter((value) => Array.isArray(value) && value.length > 0).length;
  const base = confidence === "high" ? 88 : confidence === "low" ? 52 : 70;
  return clamp(base + signalCount * 3);
}

function contentScore(performance: any) {
  const ratio = Number(performance?.viewToFollowerRatio);
  if (Number.isFinite(ratio) && ratio > 0) return clamp((ratio / 0.75) * 100);
  const views = Number(performance?.avgViews);
  return Number.isFinite(views) && views > 0 ? clamp(55 + Math.log10(views + 1) * 5) : 50;
}

function consistencyScore(performance: any) {
  const label = String(performance?.consistency || "").toLowerCase();
  if (label.includes("very consistent")) return 95;
  if (label === "consistent") return 88;
  if (label.includes("somewhat")) return 68;
  if (label.includes("highly inconsistent")) return 35;
  return 60;
}

function profileScore(profile: any) {
  let score = 50;
  if (profile?.profileUrl) score += 15;
  if (profile?.verified) score += 20;
  if (Number(profile?.followers) > 0) score += 10;
  if (Number(profile?.posts) > 0) score += 5;
  return clamp(score);
}

export function normalizeAudience(rawResponse: unknown) {
  const source = Array.isArray(rawResponse) && rawResponse.length === 1 ? rawResponse[0] : rawResponse;
  const root = source && typeof source === "object" ? source : {};
  const confidence = String(firstDefined(
    findDeep(root, new Set(["confidence", "confidencelevel", "confidence_level"])),
    "medium"
  )).toLowerCase();

  const profile = {
    fullName: (firstDefined(findDeep(root, new Set(["fullname", "full_name", "name"])), null) as string | null) || null,
    biography: (firstDefined(findDeep(root, new Set(["biography", "bio", "description"])), null) as string | null) || null,
    profilePicUrl: (firstDefined(findDeep(root, new Set(["profilepicurl", "profile_pic_url", "avatar", "image"])), null) as string | null) || null,
    followers: asNumber(findDeep(root, new Set(["followers", "followercount", "followerscount"]))),
    following: asNumber(findDeep(root, new Set(["following", "followingcount"]))),
    posts: asNumber(findDeep(root, new Set(["posts", "postcount", "media_count"]))),
    verified: Boolean(findDeep(root, new Set(["verified", "isverified"])) ?? false),
    isVerified: Boolean(findDeep(root, new Set(["verified", "isverified"])) ?? false),
    profileUrl: firstDefined(
      findDeep(root, new Set(["profileurl", "profile_url", "instagramurl", "url"])),
      null
    ),
  };

  return {
    source: "estimated",
    label: "Audience Intelligence · Estimated from public signals",
    confidence,
    gender: distribution(root, ["gender", "genderdistribution", "gender_distribution", "audiencegender"]),
    age: distribution(root, ["age", "agedistribution", "age_distribution", "audienceage"]),
    locations: distribution(root, ["locations", "location", "toplocations", "top_locations", "geography", "countries", "cities"]),
    interests: distribution(root, ["interests", "interest", "audienceinterests", "audience_interests"]),
    profile,
    sourceVersion: firstDefined(
      findDeep(root, new Set(["version", "sourceversion", "modelversion"])),
      null
    ),
    raw: rawResponse,
  };
}

export function buildFullIntelligence(username: string, performance: any, audienceRaw: unknown) {
  const audience = normalizeAudience(audienceRaw);
  const profile = { ...audience.profile };
  if (!profile.followers && performance?.followerCount) profile.followers = performance.followerCount;

  const normalizedPerformance = {
    avgViews: performance?.avgViews ?? null,
    medianViews: performance?.medianViews ?? null,
    avgLikes: performance?.avgLikes ?? null,
    avgComments: performance?.avgComments ?? null,
    engagementRate: performance?.avgEngagementRatePct ?? null,
    postingFrequencyDays: performance?.avgDaysBetweenPosts ?? null,
    viewToFollowerRatio:
      performance?.viewToFollowerRatioPct != null ? performance.viewToFollowerRatioPct / 100 : null,
    consistency: performance?.consistency?.label ?? null,
    reelsAnalyzed: performance?.reelsAnalyzed ?? 0,
  };

  const scoresBase = {
    engagement: engagementScore(normalizedPerformance),
    audience: audienceScore(audience),
    content: contentScore(normalizedPerformance),
    consistency: consistencyScore(normalizedPerformance),
    profile: profileScore(profile),
  };
  const overall = Math.round(
    scoresBase.engagement * 0.3 +
    scoresBase.audience * 0.25 +
    scoresBase.content * 0.2 +
    scoresBase.consistency * 0.15 +
    scoresBase.profile * 0.1
  );

  return {
    username,
    profile,
    performance: normalizedPerformance,
    audience: {
      source: audience.source,
      label: audience.label,
      confidence: audience.confidence,
      gender: audience.gender,
      age: audience.age,
      locations: audience.locations,
      interests: audience.interests,
      sourceVersion: audience.sourceVersion,
    },
    scores: {
      ...scoresBase,
      overall: clamp(overall),
      methodology: "MountLift proprietary v1",
      weights: { engagement: 0.3, audience: 0.25, content: 0.2, consistency: 0.15, profile: 0.1 },
    },
    rawAudience: audience.raw,
  };
}

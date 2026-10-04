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
  if (!Number.isFinite(rate) || rate <= 0) return null;

  // Realistic Instagram Engagement Rate Curves:
  // >= 5.0% ER = 92 - 100 (Viral Top Tier)
  // 3.0% - 5.0% ER = 82 - 92 (High Engagement)
  // 1.8% - 3.0% ER = 70 - 82 (Solid Average)
  // 1.0% - 1.8% ER = 55 - 70 (Developing)
  // < 1.0% ER = 25 - 55 (Low)
  if (rate >= 5.0) {
    return clamp(92 + ((rate - 5.0) / 3.0) * 8);
  } else if (rate >= 3.0) {
    return clamp(82 + ((rate - 3.0) / 2.0) * 10);
  } else if (rate >= 1.8) {
    return clamp(70 + ((rate - 1.8) / 1.2) * 12);
  } else if (rate >= 1.0) {
    return clamp(55 + ((rate - 1.0) / 0.8) * 15);
  } else {
    return clamp(25 + (rate / 1.0) * 30);
  }
}

function audienceScore(audience: any) {
  const signalCount = [audience?.gender, audience?.age, audience?.locations, audience?.interests]
    .filter((value) => Array.isArray(value) && value.length > 0).length;
  if (signalCount === 0) return null;
  const confidence = String(audience?.confidence || "medium").toLowerCase();
  const base = confidence === "high" ? 85 : confidence === "low" ? 60 : 75;
  return clamp(base + signalCount * 3.5);
}

function contentScore(performance: any) {
  const ratio = Number(performance?.viewToFollowerRatio);
  const views = Number(performance?.avgViews);
  const avgLikes = Number(performance?.avgLikes);

  // If view-to-follower ratio is available
  if (Number.isFinite(ratio) && ratio > 0) {
    // 30%+ ratio is viral, 15-30% is high, 8-15% is standard, <8% is low
    if (ratio >= 0.30) {
      return clamp(88 + ((ratio - 0.30) / 0.30) * 12);
    } else if (ratio >= 0.15) {
      return clamp(78 + ((ratio - 0.15) / 0.15) * 10);
    } else if (ratio >= 0.08) {
      return clamp(65 + ((ratio - 0.08) / 0.07) * 13);
    } else {
      return clamp(35 + (ratio / 0.08) * 30);
    }
  }

  // Fallback to absolute views & likes velocity
  const effectiveViews = views > 0 ? views : (avgLikes > 0 ? avgLikes * 12 : 0);
  if (effectiveViews > 0) {
    if (effectiveViews >= 100_000) {
      return clamp(90 + Math.min(10, Math.log10(effectiveViews / 100_000) * 6));
    } else if (effectiveViews >= 20_000) {
      return clamp(80 + ((effectiveViews - 20_000) / 80_000) * 10);
    } else if (effectiveViews >= 5_000) {
      return clamp(68 + ((effectiveViews - 5_000) / 15_000) * 12);
    } else {
      return clamp(40 + (effectiveViews / 5_000) * 28);
    }
  }

  return null;
}

function consistencyScore(performance: any) {
  const days = Number(performance?.postingFrequencyDays);
  const label = String(performance?.consistency || "").toLowerCase();

  if (Number.isFinite(days) && days > 0) {
    if (days <= 2.5) return 95; // 3+ posts per week
    if (days <= 4.0) return 88; // 2 posts per week
    if (days <= 7.0) return 78; // Weekly post
    if (days <= 14.0) return 65; // Bi-weekly
    return clamp(60 - (days - 14) * 1.5, 30, 60);
  }

  if (label.includes("very consistent")) return 95;
  if (label === "consistent") return 88;
  if (label.includes("somewhat")) return 74;
  if (label.includes("highly inconsistent")) return 40;
  return 70;
}

function profileScore(profile: any) {
  let score = 55;
  if (profile?.profileUrl || profile?.externalUrl) score += 12;
  if (profile?.verified || profile?.isVerified) score += 15;
  
  const followers = Number(profile?.followers || profile?.followerCount || 0);
  if (followers >= 500_000) score += 18;
  else if (followers >= 100_000) score += 14;
  else if (followers >= 10_000) score += 10;
  else if (followers > 0) score += 6;

  const posts = Number(profile?.posts || profile?.postsCount || 0);
  if (posts >= 100) score += 8;
  else if (posts >= 30) score += 5;
  else if (posts > 0) score += 3;

  if (profile?.fullName || profile?.biography) score += 5;

  return clamp(score, 30, 100);
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

  const signalCount = [
    distribution(root, ["gender", "genderdistribution", "gender_distribution", "audiencegender"]),
    distribution(root, ["age", "agedistribution", "age_distribution", "audienceage"]),
    distribution(root, ["locations", "location", "toplocations", "top_locations", "geography", "countries", "cities"]),
    distribution(root, ["interests", "interest", "audienceinterests", "audience_interests"]),
  ].filter((items) => items.length > 0).length;

  return {
    source: signalCount > 0 ? "estimated" : "unavailable",
    label: signalCount > 0 ? "Audience Intelligence · Estimated from public signals" : "Audience Intelligence · Not available from public data",
    confidence: signalCount > 0 ? confidence : "none",
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

  // Public audits do not have authenticated audience demographics. Do not invent an
  // audience score; normalize the overall score across dimensions that actually exist.
  const weights = { engagement: 0.3, audience: 0.25, content: 0.2, consistency: 0.15, profile: 0.1 };
  const available = Object.entries(weights).filter(([key]) => Number.isFinite((scoresBase as any)[key]));
  const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  const overall = availableWeight > 0
    ? Math.round(available.reduce((sum, [key, weight]) => sum + Number((scoresBase as any)[key]) * weight, 0) / availableWeight)
    : null;

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
      overall,
      methodology: "MountLift proprietary v1",
      weights: { engagement: 0.3, audience: 0.25, content: 0.2, consistency: 0.15, profile: 0.1 },
      note: audienceScore(audience) == null ? "Audience dimension excluded because authenticated audience data is unavailable." : undefined,
    },
    rawAudience: audience.raw,
  };
}

import { PrismaClient, Platform, ContentFormat } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // 1. Create Tags
  const tagNames = ["skincare", "tutorial", "unboxing", "lifestyle", "routine", "summer-glow", "grwm", "behind-the-scenes"];
  const tags: Record<string, { id: string; name: string }> = {};

  for (const name of tagNames) {
    const tag = await prisma.contentTag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    tags[name] = tag;
  }

  // 2. Create Brands
  const brandA = await prisma.brand.create({
    data: {
      name: "Northfield Skincare",
      contactName: "Priya Shah",
      contactEmail: "priya@northfieldskincare.com",
      notes: "Direct-to-consumer clean skincare brand.",
    },
  });

  const brandB = await prisma.brand.create({
    data: {
      name: "Solstice Botanicals",
      contactName: "Arjun Mehta",
      contactEmail: "arjun@solsticebotanicals.in",
      notes: "Ayurvedic wellness & hair oil products.",
    },
  });

  // 3. Create Creators
  const creatorA = await prisma.creator.create({
    data: {
      name: "Maya Torres",
      handle: "@mayatorres",
      platform: "Instagram",
      email: "maya@example.com",
      rateCard: "₹25,000 / Reel, ₹15,000 / Carousel",
      notes: "Beauty & skincare specialist with strong 18-34 engagement.",
    },
  });

  const creatorB = await prisma.creator.create({
    data: {
      name: "Jonah Lee",
      handle: "@jonahlee",
      platform: "TikTok",
      email: "jonah@example.com",
      rateCard: "₹35,000 / Video, ₹20,000 / Short",
      notes: "Gen-Z lifestyle & dynamic unboxing creator.",
    },
  });

  const creatorC = await prisma.creator.create({
    data: {
      name: "Alisha Verma",
      handle: "@alisha.wellness",
      platform: "Instagram",
      email: "alisha@example.com",
      rateCard: "₹20,000 / Reel, ₹10,000 / Story Set",
      notes: "Daily wellness, mindfulness, and healthy routines.",
    },
  });

  // 4. Create Campaigns
  const campaignA = await prisma.campaign.create({
    data: {
      name: "Northfield Summer Launch",
      brandId: brandA.id,
      budget: 150000,
      status: "ACTIVE",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-31"),
      notes: "Q3 hero product awareness push across beauty creators.",
    },
  });

  const campaignB = await prisma.campaign.create({
    data: {
      name: "Solstice Scalp Serum Campaign",
      brandId: brandB.id,
      budget: 95000,
      status: "PLANNING",
      startDate: new Date("2026-09-15"),
      endDate: new Date("2026-10-31"),
    },
  });

  // 5. Create Deliverables
  const d1 = await prisma.deliverable.create({
    data: {
      campaignId: campaignA.id,
      creatorId: creatorA.id,
      type: "REEL",
      agreedRate: 25000,
      status: "APPROVED",
      dueDate: new Date("2026-07-15"),
    },
  });

  const d2 = await prisma.deliverable.create({
    data: {
      campaignId: campaignA.id,
      creatorId: creatorB.id,
      type: "VIDEO",
      agreedRate: 35000,
      status: "IN_PROGRESS",
      dueDate: new Date("2026-07-28"),
    },
  });

  // 6. Create Payouts & Invoices
  await prisma.payout.create({
    data: { deliverableId: d1.id, amount: 25000, status: "APPROVED" },
  });
  await prisma.payout.create({
    data: { deliverableId: d2.id, amount: 35000, status: "PENDING" },
  });

  await prisma.invoice.create({
    data: {
      brandId: brandA.id,
      campaignId: campaignA.id,
      amount: 150000,
      status: "SENT",
      issuedAt: new Date("2026-06-05"),
      dueAt: new Date("2026-07-05"),
    },
  });

  // 7. Seed Posts, Metrics, and Demographics for Maya Torres (Instagram Focus)
  const mayaPosts = [
    {
      platform: Platform.INSTAGRAM,
      format: ContentFormat.REEL,
      caption: "5-step morning glow routine using the new Hydra Cream ✨🧴",
      url: "https://instagram.com/p/C9abc123",
      postedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
      tagNames: ["skincare", "routine", "summer-glow"],
      metrics: {
        views: 142000,
        reach: 128000,
        impressions: 165000,
        likes: 9800,
        comments: 640,
        shares: 1200,
        saves: 2850,
      },
      demographics: {
        ageRanges: { "13-17": 5.2, "18-24": 42.8, "25-34": 38.4, "35-44": 9.6, "45-54": 3.1, "55+": 0.9 },
        genderSplit: { female: 78.4, male: 19.8, other: 1.8 },
        topLocations: [
          { location: "Mumbai, India", percentage: 28.5 },
          { location: "Delhi, India", percentage: 22.1 },
          { location: "Bengaluru, India", percentage: 18.4 },
          { location: "Pune, India", percentage: 7.2 },
          { location: "Hyderabad, India", percentage: 6.8 },
        ],
      },
    },
    {
      platform: Platform.INSTAGRAM,
      format: ContentFormat.REEL,
      caption: "Quick hydration tutorial: Layering hyaluronic acid without pilling 💧",
      url: "https://instagram.com/p/C9def456",
      postedAt: new Date(Date.now() - 7 * 86400000), // 7 days ago
      tagNames: ["tutorial", "skincare"],
      metrics: {
        views: 188000,
        reach: 164000,
        impressions: 210000,
        likes: 14200,
        comments: 890,
        shares: 2150,
        saves: 4400,
      },
      demographics: {
        ageRanges: { "13-17": 4.1, "18-24": 46.2, "25-34": 36.5, "35-44": 9.8, "45-54": 2.6, "55+": 0.8 },
        genderSplit: { female: 81.2, male: 17.1, other: 1.7 },
        topLocations: [
          { location: "Mumbai, India", percentage: 31.2 },
          { location: "Bengaluru, India", percentage: 20.4 },
          { location: "Delhi, India", percentage: 19.1 },
          { location: "Chennai, India", percentage: 6.5 },
        ],
      },
    },
    {
      platform: Platform.INSTAGRAM,
      format: ContentFormat.CAROUSEL,
      caption: "Honest unboxing & ingredient breakdown of 4 barrier serums 📦",
      url: "https://instagram.com/p/C9ghi789",
      postedAt: new Date(Date.now() - 12 * 86400000), // 12 days ago
      tagNames: ["unboxing", "skincare"],
      metrics: {
        views: 68000,
        reach: 59000,
        impressions: 78000,
        likes: 3800,
        comments: 310,
        shares: 420,
        saves: 1650,
      },
      demographics: {
        ageRanges: { "13-17": 3.5, "18-24": 34.2, "25-34": 44.8, "35-44": 13.2, "45-54": 3.6, "55+": 0.7 },
        genderSplit: { female: 74.5, male: 23.8, other: 1.7 },
        topLocations: [
          { location: "Mumbai, India", percentage: 26.4 },
          { location: "Delhi, India", percentage: 24.2 },
          { location: "Bengaluru, India", percentage: 16.5 },
        ],
      },
    },
    {
      platform: Platform.INSTAGRAM,
      format: ContentFormat.POST,
      caption: "Sunday skin reset diary & current shelfie 🌿",
      url: "https://instagram.com/p/C9jkl012",
      postedAt: new Date(Date.now() - 18 * 86400000), // 18 days ago
      tagNames: ["lifestyle", "routine"],
      metrics: {
        views: 42000,
        reach: 36000,
        impressions: 48000,
        likes: 2100,
        comments: 145,
        shares: 110,
        saves: 480,
      },
      demographics: {
        ageRanges: { "13-17": 6.0, "18-24": 39.5, "25-34": 37.0, "35-44": 12.5, "45-54": 4.1, "55+": 0.9 },
        genderSplit: { female: 79.0, male: 19.2, other: 1.8 },
        topLocations: [
          { location: "Mumbai, India", percentage: 29.0 },
          { location: "Delhi, India", percentage: 21.0 },
        ],
      },
    },
    {
      platform: Platform.TIKTOK,
      format: ContentFormat.VIDEO,
      caption: "Things nobody tells you about double cleansing! 😱🧼",
      url: "https://tiktok.com/@mayatorres/video/73829102",
      postedAt: new Date(Date.now() - 24 * 86400000), // 24 days ago
      tagNames: ["tutorial", "skincare"],
      metrics: {
        views: 215000,
        reach: 195000,
        impressions: 240000,
        likes: 18900,
        comments: 1120,
        shares: 3400,
        saves: 5200,
      },
      demographics: {
        ageRanges: { "13-17": 12.4, "18-24": 58.1, "25-34": 22.3, "35-44": 5.4, "45-54": 1.5, "55+": 0.3 },
        genderSplit: { female: 72.0, male: 25.5, other: 2.5 },
        topLocations: [
          { location: "Mumbai, India", percentage: 24.1 },
          { location: "Bengaluru, India", percentage: 19.8 },
          { location: "Delhi, India", percentage: 17.5 },
        ],
      },
    },
  ];

  for (const p of mayaPosts) {
    const post = await prisma.post.create({
      data: {
        creatorId: creatorA.id,
        platform: p.platform,
        format: p.format,
        caption: p.caption,
        url: p.url,
        postedAt: p.postedAt,
        tags: {
          connect: p.tagNames.map((t) => ({ name: t })),
        },
        metrics: {
          create: p.metrics,
        },
        demographics: {
          create: p.demographics,
        },
      },
    });
    console.log(`Seeded post for ${creatorA.name}: ${post.id}`);
  }

  // 8. Seed Posts for Jonah Lee (TikTok Focus)
  const jonahPosts = [
    {
      platform: Platform.TIKTOK,
      format: ContentFormat.VIDEO,
      caption: "Testing the most viral summer gadgets so you don't have to 🚀",
      url: "https://tiktok.com/@jonahlee/video/73910293",
      postedAt: new Date(Date.now() - 2 * 86400000),
      tagNames: ["unboxing", "lifestyle"],
      metrics: {
        views: 340000,
        reach: 290000,
        impressions: 380000,
        likes: 31000,
        comments: 2100,
        shares: 4900,
        saves: 7200,
      },
      demographics: {
        ageRanges: { "13-17": 24.5, "18-24": 52.8, "25-34": 18.2, "35-44": 3.8, "45-54": 0.5, "55+": 0.2 },
        genderSplit: { male: 56.4, female: 41.2, other: 2.4 },
        topLocations: [
          { location: "Delhi, India", percentage: 27.8 },
          { location: "Mumbai, India", percentage: 23.4 },
          { location: "Bengaluru, India", percentage: 15.6 },
        ],
      },
    },
    {
      platform: Platform.TIKTOK,
      format: ContentFormat.VIDEO,
      caption: "Day in my life as a full-time creator in Mumbai 🎥",
      url: "https://tiktok.com/@jonahlee/video/73884910",
      postedAt: new Date(Date.now() - 8 * 86400000),
      tagNames: ["lifestyle", "behind-the-scenes"],
      metrics: {
        views: 185000,
        reach: 160000,
        impressions: 205000,
        likes: 16200,
        comments: 980,
        shares: 1100,
        saves: 2100,
      },
      demographics: {
        ageRanges: { "13-17": 21.0, "18-24": 54.5, "25-34": 19.8, "35-44": 3.9, "45-54": 0.6, "55+": 0.2 },
        genderSplit: { male: 52.0, female: 45.8, other: 2.2 },
        topLocations: [
          { location: "Mumbai, India", percentage: 34.5 },
          { location: "Pune, India", percentage: 18.2 },
          { location: "Delhi, India", percentage: 16.0 },
        ],
      },
    },
    {
      platform: Platform.INSTAGRAM,
      format: ContentFormat.REEL,
      caption: "Tech accessories that genuinely changed my workflow ⚡",
      url: "https://instagram.com/p/C9zzz111",
      postedAt: new Date(Date.now() - 15 * 86400000),
      tagNames: ["tutorial", "lifestyle"],
      metrics: {
        views: 95000,
        reach: 82000,
        impressions: 110000,
        likes: 7400,
        comments: 420,
        shares: 880,
        saves: 1950,
      },
      demographics: {
        ageRanges: { "13-17": 10.5, "18-24": 48.0, "25-34": 32.5, "35-44": 7.5, "45-54": 1.2, "55+": 0.3 },
        genderSplit: { male: 61.2, female: 36.8, other: 2.0 },
        topLocations: [
          { location: "Bengaluru, India", percentage: 29.5 },
          { location: "Hyderabad, India", percentage: 22.0 },
          { location: "Mumbai, India", percentage: 20.1 },
        ],
      },
    },
  ];

  for (const p of jonahPosts) {
    const post = await prisma.post.create({
      data: {
        creatorId: creatorB.id,
        platform: p.platform,
        format: p.format,
        caption: p.caption,
        url: p.url,
        postedAt: p.postedAt,
        tags: {
          connect: p.tagNames.map((t) => ({ name: t })),
        },
        metrics: {
          create: p.metrics,
        },
        demographics: {
          create: p.demographics,
        },
      },
    });
    console.log(`Seeded post for ${creatorB.name}: ${post.id}`);
  }

  console.log("Seed finished successfully.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


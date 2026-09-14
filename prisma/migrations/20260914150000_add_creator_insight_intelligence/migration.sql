ALTER TABLE "CreatorInsight" ADD COLUMN "followerCount" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "followingCount" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "postCount" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "verified" BOOLEAN;
ALTER TABLE "CreatorInsight" ADD COLUMN "profileUrl" TEXT;
ALTER TABLE "CreatorInsight" ADD COLUMN "overallScore" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "engagementScore" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "audienceScore" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "contentQualityScore" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "consistencyScore" DOUBLE PRECISION;
ALTER TABLE "CreatorInsight" ADD COLUMN "audienceData" JSONB;
ALTER TABLE "CreatorInsight" ADD COLUMN "topLocations" JSONB;
ALTER TABLE "CreatorInsight" ADD COLUMN "interests" JSONB;
ALTER TABLE "CreatorInsight" ADD COLUMN "ageDistribution" JSONB;
ALTER TABLE "CreatorInsight" ADD COLUMN "genderDistribution" JSONB;
ALTER TABLE "CreatorInsight" ADD COLUMN "source" TEXT;
ALTER TABLE "CreatorInsight" ADD COLUMN "sourceVersion" TEXT;

CREATE INDEX "CreatorInsight_creatorId_createdAt_idx" ON "CreatorInsight"("creatorId", "createdAt");

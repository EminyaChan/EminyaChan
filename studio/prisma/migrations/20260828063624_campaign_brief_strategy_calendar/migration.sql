-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('BRAND_AWARENESS', 'LEAD_GENERATION', 'SALES', 'ENGAGEMENT', 'TRAFFIC', 'RECRUITMENT', 'PRODUCT_LAUNCH', 'EVENT_PROMOTION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContentStatus" ADD VALUE 'IDEA';
ALTER TYPE "ContentStatus" ADD VALUE 'AI_GENERATED';
ALTER TYPE "ContentStatus" ADD VALUE 'EDITING';
ALTER TYPE "ContentStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "ContentStatus" ADD VALUE 'APPROVED';
ALTER TYPE "ContentStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "additionalNotes" TEXT,
ADD COLUMN     "brandColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "brandGuidelines" TEXT,
ADD COLUMN     "brandTone" TEXT,
ADD COLUMN     "budget" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "competitors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "objective" "CampaignObjective",
ADD COLUMN     "product" TEXT,
ADD COLUMN     "promotion" TEXT,
ADD COLUMN     "sellingPoints" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "targetAudience" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "contentPillar" TEXT,
ADD COLUMN     "scheduledDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MarketingStrategy" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "audienceProfile" JSONB,
    "positioning" JSONB,
    "contentPillars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendedPlatforms" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingStrategy_campaignId_key" ON "MarketingStrategy"("campaignId");

-- AddForeignKey
ALTER TABLE "MarketingStrategy" ADD CONSTRAINT "MarketingStrategy_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

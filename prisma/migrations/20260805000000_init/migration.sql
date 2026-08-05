-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('OWNER', 'PARENT', 'GUARDIAN', 'CHILD', 'ADVISOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetCode" AS ENUM ('XLM', 'USDC', 'EURC', 'AQUA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('EMERGENCY_FUND', 'VACATION', 'HOUSE_PURCHASE', 'EDUCATION_FUND', 'OTHER');

-- CreateEnum
CREATE TYPE "BillCategory" AS ENUM ('ELECTRICITY', 'RENT', 'INTERNET', 'SCHOOL_FEES', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('UPCOMING', 'DUE', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'EXECUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestmentCategory" AS ENUM ('STABLE', 'GROWTH', 'YIELD', 'EXPERIMENTAL');

-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('RECURRING_SAVINGS', 'ALLOWANCE', 'BILL_PAYMENT', 'PROFIT_DISTRIBUTION', 'INHERITANCE_RELEASE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "stellarPublicKey" TEXT,
    "passkeyCredentialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "spendingLimit" DECIMAL(20,7),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasuries" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "contractTreasuryId" BIGINT,
    "contractAddress" TEXT,
    "name" TEXT NOT NULL,
    "assetCode" "AssetCode" NOT NULL,
    "assetIssuer" TEXT,
    "balance" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "approvalThreshold" DECIMAL(20,7) NOT NULL,
    "requiredApprovals" INTEGER NOT NULL DEFAULT 1,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasuries_pkey" PRIMARY KEY ("id")
);


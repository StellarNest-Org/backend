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

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "contractGoalId" BIGINT,
    "name" TEXT NOT NULL,
    "category" "GoalCategory" NOT NULL DEFAULT 'OTHER',
    "targetAmount" DECIMAL(20,7) NOT NULL,
    "currentAmount" DECIMAL(20,7) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "contractBillId" BIGINT,
    "name" TEXT NOT NULL,
    "category" "BillCategory" NOT NULL DEFAULT 'OTHER',
    "payeeName" TEXT NOT NULL,
    "payeeAddress" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UPCOMING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "contractWithdrawalId" BIGINT,
    "requestedByUserId" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "amount" DECIMAL(20,7) NOT NULL,
    "reason" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "withdrawalId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_holdings" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "assetCode" "AssetCode" NOT NULL,
    "category" "InvestmentCategory" NOT NULL DEFAULT 'GROWTH',
    "quantity" DECIMAL(20,7) NOT NULL,
    "costBasis" DECIMAL(20,7) NOT NULL,
    "currentValue" DECIMAL(20,7) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investment_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inheritance_vaults" (
    "id" TEXT NOT NULL,
    "treasuryId" TEXT NOT NULL,
    "timeLockAt" TIMESTAMP(3) NOT NULL,
    "deadManSwitchDays" INTEGER NOT NULL,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guardianApprovalsRequired" INTEGER NOT NULL DEFAULT 1,
    "legalNotes" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,


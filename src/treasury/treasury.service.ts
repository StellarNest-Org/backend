import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetCode, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async createTreasury(
    userId: string,
    familyId: string,
    name: string,
    assetCode: AssetCode,
    approvalThreshold: number,
    requiredApprovals: number,
  ) {
    await this.families.assertAdmin(familyId, userId);
    const existing = await this.prisma.treasury.findUnique({ where: { familyId } });
    if (existing) {
      throw new ForbiddenException('This family already has a treasury');
    }
    return this.prisma.treasury.create({
      data: { familyId, name, assetCode, approvalThreshold, requiredApprovals },
    });
  }

  async recordOnChain(
    userId: string,
    treasuryId: string,
    contractTreasuryId: string,
    contractAddress: string,
  ) {
    const treasury = await this.getOwned(treasuryId, userId);
    return this.prisma.treasury.update({
      where: { id: treasury.id },
      data: { contractTreasuryId: BigInt(contractTreasuryId), contractAddress },
    });
  }

  async setFrozen(userId: string, treasuryId: string, frozen: boolean) {
    const treasury = await this.getOwned(treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    return this.prisma.treasury.update({ where: { id: treasury.id }, data: { frozen } });
  }

  async setApprovalRule(
    userId: string,
    treasuryId: string,
    approvalThreshold: number,
    requiredApprovals: number,
  ) {
    const treasury = await this.getOwned(treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    return this.prisma.treasury.update({
      where: { id: treasury.id },
      data: { approvalThreshold, requiredApprovals },
    });
  }

  async getOwned(treasuryId: string, userId: string) {
    const treasury = await this.prisma.treasury.findUnique({ where: { id: treasuryId } });
    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }
    await this.families.requireMembership(treasury.familyId, userId);
    return treasury;
  }

  async getByFamily(familyId: string, userId: string) {
    await this.families.requireMembership(familyId, userId);
    return this.prisma.treasury.findUnique({ where: { familyId } });
  }

  async dashboard(treasuryId: string, userId: string) {
    const treasury = await this.getOwned(treasuryId, userId);

    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      goals,
      dueBills,
      investments,
      upcomingTransfers,
      pendingApprovals,
      vault,
      monthlyWithdrawals,
    ] = await Promise.all([
      this.prisma.savingsGoal.findMany({ where: { treasuryId } }),
      this.prisma.bill.aggregate({
        where: { treasuryId, active: true, nextDueAt: { lte: endOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.investmentHolding.aggregate({
        where: { treasuryId },
        _sum: { currentValue: true },
      }),
      this.prisma.bill.count({ where: { treasuryId, active: true, nextDueAt: { gte: now } } }),
      this.prisma.withdrawalRequest.count({
        where: { treasuryId, status: WithdrawalStatus.PENDING },
      }),
      this.prisma.inheritanceVault.findUnique({ where: { treasuryId } }),
      this.prisma.withdrawalRequest.aggregate({
        where: {
          treasuryId,
          status: WithdrawalStatus.EXECUTED,
          createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalSavings = goals.reduce((sum, g) => sum + Number(g.currentAmount), 0);

    return {
      totalBalance: Number(treasury.balance),
      totalSavings,
      billsDueThisMonth: Number(dueBills._sum.amount ?? 0),
      investmentsValue: Number(investments._sum.currentValue ?? 0),
      monthlySpending: Number(monthlyWithdrawals._sum.amount ?? 0),
      upcomingTransfers,
      inheritanceStatus: vault ? (vault.claimed ? 'Claimed' : 'Active') : 'Not configured',
      pendingApprovals,
    };
  }

  /** Called by the chain-sync worker after confirming an on-chain balance-changing event. */
  async syncBalance(treasuryId: string, balance: number) {
    return this.prisma.treasury.update({ where: { id: treasuryId }, data: { balance } });
  }
}

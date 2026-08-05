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


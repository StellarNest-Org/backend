import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';
import { BeneficiaryInput } from './dto/inheritance.dto';

@Injectable()
export class InheritanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async getVault(treasuryId: string, userId: string) {
    const treasury = await this.requireAccess(treasuryId, userId);
    return this.prisma.inheritanceVault.findUnique({
      where: { treasuryId: treasury.id },
      include: { beneficiaries: true },
    });
  }

  async createVault(
    treasuryId: string,
    userId: string,
    timeLockAt: Date,
    deadManSwitchDays: number,
    guardianApprovalsRequired: number,
    beneficiaries: BeneficiaryInput[],
    legalNotes?: string,
  ) {
    const treasury = await this.requireAccess(treasuryId, userId);
    const member = await this.families.requireMembership(treasury.familyId, userId);
    if (member.role !== 'OWNER') {
      throw new BadRequestException('Only the treasury Owner can configure the inheritance vault');
    }

    const existing = await this.prisma.inheritanceVault.findUnique({ where: { treasuryId } });
    if (existing) {
      throw new ConflictException('An inheritance vault already exists for this treasury');
    }

    const totalBps = beneficiaries.reduce((sum, b) => sum + b.allocationBps, 0);
    if (totalBps !== 10_000) {
      throw new BadRequestException('Beneficiary allocations must sum to 100% (10,000 bps)');
    }

    return this.prisma.inheritanceVault.create({
      data: {
        treasuryId,
        timeLockAt,
        deadManSwitchDays,
        guardianApprovalsRequired,
        legalNotes,
        beneficiaries: { createMany: { data: beneficiaries } },
      },
      include: { beneficiaries: true },
    });
  }

  /** The owner calls this periodically (mirrors the on-chain `heartbeat`) to reset the dead-man switch. */
  async heartbeat(treasuryId: string, userId: string) {
    const treasury = await this.requireAccess(treasuryId, userId);
    const member = await this.families.requireMembership(treasury.familyId, userId);
    if (member.role !== 'OWNER') {
      throw new BadRequestException('Only the treasury Owner can send a heartbeat');
    }
    return this.prisma.inheritanceVault.update({
      where: { treasuryId },
      data: { lastHeartbeatAt: new Date() },
      include: { beneficiaries: true },
    });
  }

  async approveClaim(treasuryId: string, userId: string, beneficiaryId: string) {
    const treasury = await this.requireAccess(treasuryId, userId);
    const member = await this.families.requireMembership(treasury.familyId, userId);
    if (member.role !== 'GUARDIAN') {
      throw new BadRequestException('Only a Guardian can approve an inheritance claim');
    }
    const beneficiary = await this.prisma.beneficiary.findUnique({ where: { id: beneficiaryId } });
    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }
    await this.prisma.beneficiary.update({
      where: { id: beneficiaryId },
      data: { guardianApproved: true },
    });
    return this.getVault(treasuryId, userId);
  }

  /** True once the time-lock or dead-man switch has elapsed — mirrors the contract's claim condition. */
  isClaimable(vault: {
    timeLockAt: Date;
    deadManSwitchDays: number;
    lastHeartbeatAt: Date;
  }): boolean {
    const now = Date.now();
    const switchExpired =
      now - vault.lastHeartbeatAt.getTime() > vault.deadManSwitchDays * 24 * 60 * 60 * 1000;
    return now >= vault.timeLockAt.getTime() || switchExpired;
  }

  async markClaimed(treasuryId: string) {
    return this.prisma.inheritanceVault.update({
      where: { treasuryId },
      data: { claimed: true, claimedAt: new Date() },
    });
  }

  private async requireAccess(treasuryId: string, userId: string) {
    const treasury = await this.prisma.treasury.findUnique({ where: { id: treasuryId } });
    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }
    await this.families.requireMembership(treasury.familyId, userId);
    return treasury;
  }
}

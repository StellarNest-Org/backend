import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AutomationType, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

const APPROVER_ROLES = ['OWNER', 'PARENT', 'GUARDIAN'];

@Injectable()
export class RulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async listWithdrawals(treasuryId: string, userId: string) {
    const treasury = await this.requireAccess(treasuryId, userId);
    return this.prisma.withdrawalRequest.findMany({
      where: { treasuryId: treasury.id },
      include: { approvals: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Records a withdrawal request off-chain, mirroring the treasury contract's
   * rules engine: below-threshold requests are auto-approved so the UI can
   * show them as ready to submit on-chain immediately.
   */
  async requestWithdrawal(
    treasuryId: string,
    userId: string,
    toAddress: string,
    amount: number,
    reason?: string,
  ) {
    const treasury = await this.requireAccess(treasuryId, userId);
    if (treasury.frozen) {
      throw new BadRequestException('This treasury is frozen — withdrawals are disabled');
    }
    const member = await this.families.requireMembership(treasury.familyId, userId);
    if (member.role === 'VIEWER') {
      throw new BadRequestException('Viewers cannot request withdrawals');
    }
    if (member.spendingLimit && amount > Number(member.spendingLimit)) {
      throw new BadRequestException('This exceeds your spending limit');
    }

    const status =
      amount < Number(treasury.approvalThreshold)
        ? WithdrawalStatus.EXECUTED
        : WithdrawalStatus.PENDING;

    return this.prisma.withdrawalRequest.create({
      data: { treasuryId, requestedByUserId: userId, toAddress, amount, reason, status },
      include: { approvals: true },
    });
  }

  async approveWithdrawal(withdrawalId: string, userId: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { approvals: true },
    });
    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found');
    }
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      throw new BadRequestException('This withdrawal is not pending approval');
    }
    const treasury = await this.prisma.treasury.findUniqueOrThrow({
      where: { id: withdrawal.treasuryId },
    });
    const member = await this.families.requireMembership(treasury.familyId, userId);
    if (!APPROVER_ROLES.includes(member.role)) {
      throw new BadRequestException(
        'Only Owner, Parent or Guardian members can approve withdrawals',
      );
    }
    if (withdrawal.approvals.some((a) => a.approverId === userId)) {
      throw new ConflictException('You already approved this withdrawal');
    }

    await this.prisma.approval.create({ data: { withdrawalId, approverId: userId } });
    const approvalCount = withdrawal.approvals.length + 1;


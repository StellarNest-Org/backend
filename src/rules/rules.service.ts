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

    if (approvalCount >= treasury.requiredApprovals) {
      return this.prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: { status: WithdrawalStatus.APPROVED },
        include: { approvals: true },
      });
    }
    return this.prisma.withdrawalRequest.findUniqueOrThrow({
      where: { id: withdrawalId },
      include: { approvals: true },
    });
  }

  /** Marks a withdrawal executed once the on-chain transaction has been confirmed. */
  async markExecuted(withdrawalId: string) {
    return this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.EXECUTED },
    });
  }

  async listAutomations(treasuryId: string, userId: string) {
    await this.requireAccess(treasuryId, userId);
    return this.prisma.automation.findMany({
      where: { treasuryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAutomation(
    treasuryId: string,
    userId: string,
    type: AutomationType,
    description: string,
    amount?: number,
    intervalDays?: number,
  ) {
    const treasury = await this.requireAccess(treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    const nextRunAt = intervalDays
      ? new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)
      : undefined;
    return this.prisma.automation.create({
      data: { treasuryId, type, description, amount, intervalDays, nextRunAt },
    });
  }

  async toggleAutomation(automationId: string, userId: string, active: boolean) {
    const automation = await this.prisma.automation.findUnique({ where: { id: automationId } });
    if (!automation) {
      throw new NotFoundException('Automation not found');
    }
    const treasury = await this.prisma.treasury.findUniqueOrThrow({
      where: { id: automation.treasuryId },
    });
    await this.families.assertAdmin(treasury.familyId, userId);
    return this.prisma.automation.update({ where: { id: automationId }, data: { active } });
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

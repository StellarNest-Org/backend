import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillCategory, BillStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async list(treasuryId: string, userId: string) {
    await this.requireAccess(treasuryId, userId);
    return this.prisma.bill.findMany({ where: { treasuryId }, orderBy: { nextDueAt: 'asc' } });
  }

  async create(
    treasuryId: string,
    userId: string,
    name: string,
    category: BillCategory,
    payeeName: string,
    payeeAddress: string,
    amount: number,
    intervalDays: number,
  ) {
    const treasury = await this.requireAccess(treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    const nextDueAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    return this.prisma.bill.create({
      data: {
        treasuryId,
        name,
        category,
        payeeName,
        payeeAddress,
        amount,
        intervalDays,
        nextDueAt,
      },
    });
  }

  async cancel(billId: string, userId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    const treasury = await this.requireAccess(bill.treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    return this.prisma.bill.update({
      where: { id: billId },
      data: { active: false, status: BillStatus.CANCELLED },
    });
  }

  /** Marks a bill paid once the on-chain `pay_bill` call has been confirmed. */
  async recordPaid(billId: string) {
    const bill = await this.prisma.bill.findUniqueOrThrow({ where: { id: billId } });
    const nextDueAt = new Date(Date.now() + bill.intervalDays * 24 * 60 * 60 * 1000);
    return this.prisma.bill.update({
      where: { id: billId },
      data: { status: BillStatus.PAID, nextDueAt },
    });
  }

  /** Refreshes reminder status daily: DUE within 3 days, OVERDUE past the due date. */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async refreshStatuses() {
    const now = new Date();
    const dueWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [dueCount, overdueCount] = await Promise.all([
      this.prisma.bill.updateMany({
        where: {
          active: true,
          nextDueAt: { lte: dueWindow, gt: now },
          status: BillStatus.UPCOMING,
        },
        data: { status: BillStatus.DUE },
      }),
      this.prisma.bill.updateMany({
        where: {
          active: true,
          nextDueAt: { lt: now },
          status: { in: [BillStatus.UPCOMING, BillStatus.DUE] },
        },
        data: { status: BillStatus.OVERDUE },
      }),
    ]);
    this.logger.log(
      `Bill reminders refreshed: ${dueCount.count} due, ${overdueCount.count} overdue`,
    );
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

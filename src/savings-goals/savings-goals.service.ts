import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

@Injectable()
export class SavingsGoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async list(treasuryId: string, userId: string) {
    await this.requireAccess(treasuryId, userId);
    return this.prisma.savingsGoal.findMany({
      where: { treasuryId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    treasuryId: string,
    userId: string,
    name: string,
    category: GoalCategory,
    targetAmount: number,
  ) {
    const treasury = await this.requireAccess(treasuryId, userId);
    await this.families.assertAdmin(treasury.familyId, userId);
    return this.prisma.savingsGoal.create({ data: { treasuryId, name, category, targetAmount } });
  }

  /** Records a contribution once the on-chain `contribute_to_goal` call has been confirmed. */
  async recordContribution(goalId: string, userId: string, amount: number) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }
    await this.requireAccess(goal.treasuryId, userId);
    return this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: { currentAmount: { increment: amount } },
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

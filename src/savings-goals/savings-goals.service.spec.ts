import { GoalCategory } from '@prisma/client';
import { SavingsGoalsService } from './savings-goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

describe('SavingsGoalsService', () => {
  let service: SavingsGoalsService;
  let prisma: {
    treasury: { findUnique: jest.Mock };
    savingsGoal: { create: jest.Mock; update: jest.Mock; findUnique: jest.Mock };
  };
  let families: { requireMembership: jest.Mock; assertAdmin: jest.Mock };

  beforeEach(() => {
    prisma = {
      treasury: { findUnique: jest.fn().mockResolvedValue({ id: 't1', familyId: 'fam1' }) },
      savingsGoal: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'g1', currentAmount: 0, ...data })),
        update: jest.fn(({ data }) =>
          Promise.resolve({ id: 'g1', currentAmount: 400 + (data.currentAmount?.increment ?? 0) }),
        ),
        findUnique: jest.fn().mockResolvedValue({ id: 'g1', treasuryId: 't1' }),
      },
    };
    families = { requireMembership: jest.fn(), assertAdmin: jest.fn() };
    service = new SavingsGoalsService(
      prisma as unknown as PrismaService,
      families as unknown as FamiliesService,
    );
  });

  it('creates a goal only for family admins', async () => {
    await service.create('t1', 'u1', 'Emergency Fund', GoalCategory.EMERGENCY_FUND, 1000);
    expect(families.assertAdmin).toHaveBeenCalledWith('fam1', 'u1');
    expect(prisma.savingsGoal.create).toHaveBeenCalled();
  });

  it('increments the current amount when a contribution is recorded', async () => {
    const result = await service.recordContribution('g1', 'u1', 250);
    expect(prisma.savingsGoal.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { currentAmount: { increment: 250 } },
    });
    expect(result.currentAmount).toBe(650);
  });
});

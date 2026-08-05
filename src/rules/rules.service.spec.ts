import { BadRequestException, ConflictException } from '@nestjs/common';
import { WithdrawalStatus } from '@prisma/client';
import { RulesService } from './rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

describe('RulesService', () => {
  let service: RulesService;
  let prisma: {
    treasury: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    withdrawalRequest: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    approval: { create: jest.Mock };
  };
  let families: { requireMembership: jest.Mock };

  const treasury = {
    id: 't1',
    familyId: 'fam1',
    frozen: false,
    approvalThreshold: 1000,
    requiredApprovals: 2,
  };

  beforeEach(() => {
    prisma = {
      treasury: {
        findUnique: jest.fn().mockResolvedValue(treasury),
        findUniqueOrThrow: jest.fn().mockResolvedValue(treasury),
      },
      withdrawalRequest: {
        create: jest.fn(({ data }) => Promise.resolve({ ...data, id: 'w1', approvals: [] })),
        findUnique: jest.fn(),
        update: jest.fn(({ data }) => Promise.resolve({ id: 'w1', ...data })),
        findUniqueOrThrow: jest.fn(),
      },
      approval: { create: jest.fn() },
    };
    families = { requireMembership: jest.fn() };
    service = new RulesService(
      prisma as unknown as PrismaService,
      families as unknown as FamiliesService,
    );
  });

  it('auto-executes a withdrawal below the approval threshold', async () => {
    families.requireMembership.mockResolvedValue({ role: 'PARENT', spendingLimit: null });
    const result = await service.requestWithdrawal('t1', 'u1', 'GABC...', 500);
    expect(result.status).toBe(WithdrawalStatus.EXECUTED);
  });

  it('creates a pending withdrawal at or above the approval threshold', async () => {
    families.requireMembership.mockResolvedValue({ role: 'PARENT', spendingLimit: null });
    const result = await service.requestWithdrawal('t1', 'u1', 'GABC...', 1500);
    expect(result.status).toBe(WithdrawalStatus.PENDING);
  });

  it('blocks withdrawals when the treasury is frozen', async () => {
    prisma.treasury.findUnique.mockResolvedValue({ ...treasury, frozen: true });
    families.requireMembership.mockResolvedValue({ role: 'PARENT', spendingLimit: null });
    await expect(service.requestWithdrawal('t1', 'u1', 'GABC...', 100)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('blocks a child from exceeding their spending limit', async () => {
    families.requireMembership.mockResolvedValue({ role: 'CHILD', spendingLimit: 100 });
    await expect(service.requestWithdrawal('t1', 'child1', 'GABC...', 200)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('blocks viewers from requesting a withdrawal', async () => {
    families.requireMembership.mockResolvedValue({ role: 'VIEWER', spendingLimit: null });
    await expect(service.requestWithdrawal('t1', 'viewer1', 'GABC...', 10)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('marks a withdrawal approved once required approvals are met', async () => {
    const pending = {
      id: 'w1',
      treasuryId: 't1',
      status: WithdrawalStatus.PENDING,
      approvals: [{ approverId: 'parent1' }],
    };
    prisma.withdrawalRequest.findUnique.mockResolvedValue(pending);
    families.requireMembership.mockResolvedValue({ role: 'GUARDIAN' });

    const result = await service.approveWithdrawal('w1', 'guardian1');
    expect(prisma.withdrawalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: WithdrawalStatus.APPROVED } }),
    );
    expect(result.status).toBe(WithdrawalStatus.APPROVED);
  });

  it('rejects a second approval from the same approver', async () => {
    const pending = {
      id: 'w1',
      treasuryId: 't1',
      status: WithdrawalStatus.PENDING,
      approvals: [{ approverId: 'guardian1' }],
    };
    prisma.withdrawalRequest.findUnique.mockResolvedValue(pending);
    families.requireMembership.mockResolvedValue({ role: 'GUARDIAN' });

    await expect(service.approveWithdrawal('w1', 'guardian1')).rejects.toThrow(ConflictException);
  });
});

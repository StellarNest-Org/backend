import { BadRequestException } from '@nestjs/common';
import { InheritanceService } from './inheritance.service';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

describe('InheritanceService', () => {
  let service: InheritanceService;
  let prisma: {
    treasury: { findUnique: jest.Mock };
    inheritanceVault: { findUnique: jest.Mock; create: jest.Mock };
  };
  let families: { requireMembership: jest.Mock };

  beforeEach(() => {
    prisma = {
      treasury: { findUnique: jest.fn().mockResolvedValue({ id: 't1', familyId: 'fam1' }) },
      inheritanceVault: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) => Promise.resolve(data)),
      },
    };
    families = { requireMembership: jest.fn() };
    service = new InheritanceService(
      prisma as unknown as PrismaService,
      families as unknown as FamiliesService,
    );
  });

  it('rejects beneficiary allocations that do not sum to 10,000 bps', async () => {
    families.requireMembership.mockResolvedValue({ role: 'OWNER' });
    await expect(
      service.createVault('t1', 'owner1', new Date(), 30, 1, [
        { name: 'Amaka', stellarAddress: 'GABC', allocationBps: 5000 },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('accepts allocations that sum to exactly 10,000 bps', async () => {
    families.requireMembership.mockResolvedValue({ role: 'OWNER' });
    await expect(
      service.createVault('t1', 'owner1', new Date(), 30, 1, [
        { name: 'Amaka', stellarAddress: 'GABC', allocationBps: 6000 },
        { name: 'Tunde', stellarAddress: 'GDEF', allocationBps: 4000 },
      ]),
    ).resolves.toBeDefined();
  });

  it('only allows the Owner to configure the vault', async () => {
    families.requireMembership.mockResolvedValue({ role: 'PARENT' });
    await expect(
      service.createVault('t1', 'parent1', new Date(), 30, 1, [
        { name: 'Amaka', stellarAddress: 'GABC', allocationBps: 10000 },
      ]),
    ).rejects.toThrow(BadRequestException);
  });

  it('is claimable once the time-lock has passed', () => {
    const claimable = service.isClaimable({
      timeLockAt: new Date(Date.now() - 1000),
      deadManSwitchDays: 365,
      lastHeartbeatAt: new Date(),
    });
    expect(claimable).toBe(true);
  });

  it('is claimable once the dead-man switch has expired, even before the time-lock', () => {
    const claimable = service.isClaimable({
      timeLockAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      deadManSwitchDays: 30,
      lastHeartbeatAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31),
    });
    expect(claimable).toBe(true);
  });

  it('is not claimable while both conditions are unmet', () => {
    const claimable = service.isClaimable({
      timeLockAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      deadManSwitchDays: 30,
      lastHeartbeatAt: new Date(),
    });
    expect(claimable).toBe(false);
  });
});

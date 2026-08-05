import { ForbiddenException } from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { FamiliesService } from './families.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FamiliesService', () => {
  let service: FamiliesService;
  let prisma: { familyMember: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { familyMember: { findUnique: jest.fn() } };
    service = new FamiliesService(prisma as unknown as PrismaService);
  });

  it.each([FamilyRole.OWNER, FamilyRole.PARENT])(
    'allows %s to administer the family',
    async (role) => {
      prisma.familyMember.findUnique.mockResolvedValue({ role });
      await expect(service.assertAdmin('fam1', 'u1')).resolves.toBeDefined();
    },
  );

  it.each([FamilyRole.CHILD, FamilyRole.GUARDIAN, FamilyRole.ADVISOR, FamilyRole.VIEWER])(
    'rejects %s from administering the family',
    async (role) => {
      prisma.familyMember.findUnique.mockResolvedValue({ role });
      await expect(service.assertAdmin('fam1', 'u1')).rejects.toThrow(ForbiddenException);
    },
  );

  it('rejects a non-member entirely', async () => {
    prisma.familyMember.findUnique.mockResolvedValue(null);
    await expect(service.assertAdmin('fam1', 'stranger')).rejects.toThrow(ForbiddenException);
  });
});

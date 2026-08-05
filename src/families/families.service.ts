import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FamilyRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_ROLES: FamilyRole[] = [FamilyRole.OWNER, FamilyRole.PARENT];

@Injectable()
export class FamiliesService {
  constructor(private readonly prisma: PrismaService) {}

  async createFamily(userId: string, name: string) {
    return this.prisma.family.create({
      data: {
        name,
        members: {
          create: { userId, role: FamilyRole.OWNER },
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async findForUser(userId: string) {
    return this.prisma.family.findMany({
      where: { members: { some: { userId } } },
      include: { members: { include: { user: true } } },
    });
  }

  async findOne(familyId: string, userId: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, members: { some: { userId } } },
      include: { members: { include: { user: true } } },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    return family;
  }

  async addMember(
    familyId: string,
    actingUserId: string,
    email: string,
    displayName: string,
    role: FamilyRole,
    spendingLimit?: number,
  ) {
    await this.assertAdmin(familyId, actingUserId);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, displayName },
    });

    const existing = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('This person is already a member of the family');
    }

    return this.prisma.familyMember.create({
      data: { familyId, userId: user.id, role, spendingLimit },
      include: { user: true },
    });
  }

  async updateMemberRole(
    memberId: string,
    actingUserId: string,
    role: FamilyRole,
    spendingLimit?: number,
  ) {
    const member = await this.prisma.familyMember.findUnique({ where: { id: memberId } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    await this.assertAdmin(member.familyId, actingUserId);

    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role, spendingLimit },
      include: { user: true },
    });
  }

  async assertAdmin(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member || !ADMIN_ROLES.includes(member.role)) {
      throw new ForbiddenException('Only the Owner or a Parent can perform this action');
    }
    return member;
  }

  async requireMembership(familyId: string, userId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this family');
    }
    return member;
  }
}

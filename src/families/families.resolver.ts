import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FamiliesService } from './families.service';
import { FamilyModel } from './models/family.model';
import {
  AddFamilyMemberInput,
  CreateFamilyInput,
  UpdateFamilyMemberRoleInput,
} from './dto/family.dto';

type FamilyWithMembers = Awaited<ReturnType<FamiliesService['findOne']>>;

function toFamilyModel(family: FamilyWithMembers): FamilyModel {
  return {
    id: family.id,
    name: family.name,
    createdAt: family.createdAt,
    members: family.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      displayName: m.user.displayName,
      email: m.user.email,
      role: m.role,
      spendingLimit: m.spendingLimit ? Number(m.spendingLimit) : undefined,
      joinedAt: m.joinedAt,
    })),
  };
}

@Resolver(() => FamilyModel)
@UseGuards(JwtAuthGuard)
export class FamiliesResolver {
  constructor(private readonly families: FamiliesService) {}

  @Query(() => [FamilyModel])
  myFamilies(@CurrentUser() user: { userId: string }) {
    return this.families.findForUser(user.userId).then((list) => list.map(toFamilyModel));
  }

  @Query(() => FamilyModel)
  family(@Args('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.families.findOne(id, user.userId).then(toFamilyModel);
  }

  @Mutation(() => FamilyModel)
  createFamily(@Args('input') input: CreateFamilyInput, @CurrentUser() user: { userId: string }) {
    return this.families.createFamily(user.userId, input.name).then(toFamilyModel);
  }

  @Mutation(() => FamilyModel)
  async addFamilyMember(
    @Args('input') input: AddFamilyMemberInput,
    @CurrentUser() user: { userId: string },
  ) {
    await this.families.addMember(
      input.familyId,
      user.userId,
      input.email,
      input.displayName,
      input.role,
      input.spendingLimit,
    );
    return this.families.findOne(input.familyId, user.userId).then(toFamilyModel);
  }

  @Mutation(() => FamilyModel)
  async updateFamilyMemberRole(
    @Args('input') input: UpdateFamilyMemberRoleInput,
    @CurrentUser() user: { userId: string },
  ) {
    const updated = await this.families.updateMemberRole(
      input.memberId,
      user.userId,
      input.role,
      input.spendingLimit,
    );
    return this.families.findOne(updated.familyId, user.userId).then(toFamilyModel);
  }
}

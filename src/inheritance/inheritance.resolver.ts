import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InheritanceService } from './inheritance.service';
import { InheritanceVaultModel } from './models/inheritance.model';
import { CreateInheritanceVaultInput } from './dto/inheritance.dto';

@Resolver(() => InheritanceVaultModel)
@UseGuards(JwtAuthGuard)
export class InheritanceResolver {
  constructor(private readonly inheritance: InheritanceService) {}

  @Query(() => InheritanceVaultModel, { nullable: true })
  inheritanceVault(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.inheritance.getVault(treasuryId, user.userId);
  }

  @Mutation(() => InheritanceVaultModel)
  createInheritanceVault(
    @Args('input') input: CreateInheritanceVaultInput,
    @CurrentUser() user: { userId: string },
  ) {
    return this.inheritance.createVault(
      input.treasuryId,
      user.userId,
      input.timeLockAt,
      input.deadManSwitchDays,
      input.guardianApprovalsRequired,
      input.beneficiaries,
      input.legalNotes,
    );
  }

  @Mutation(() => InheritanceVaultModel)
  sendInheritanceHeartbeat(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.inheritance.heartbeat(treasuryId, user.userId);
  }

  @Mutation(() => InheritanceVaultModel)
  approveInheritanceClaim(
    @Args('treasuryId') treasuryId: string,
    @Args('beneficiaryId') beneficiaryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.inheritance.approveClaim(treasuryId, user.userId, beneficiaryId);
  }
}

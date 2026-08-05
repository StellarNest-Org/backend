import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TreasuryService } from './treasury.service';
import { TreasuryDashboardModel, TreasuryModel } from './models/treasury.model';
import { CreateTreasuryInput, RecordOnChainTreasuryInput } from './dto/treasury.dto';

function toModel(t: Awaited<ReturnType<TreasuryService['createTreasury']>>): TreasuryModel {
  return {
    id: t.id,
    familyId: t.familyId,
    contractTreasuryId: t.contractTreasuryId?.toString(),
    contractAddress: t.contractAddress ?? undefined,
    name: t.name,
    assetCode: t.assetCode,
    approvalThreshold: Number(t.approvalThreshold),
    requiredApprovals: t.requiredApprovals,
    frozen: t.frozen,
    createdAt: t.createdAt,
  };
}

@Resolver(() => TreasuryModel)
@UseGuards(JwtAuthGuard)
export class TreasuryResolver {
  constructor(private readonly treasury: TreasuryService) {}

  @Query(() => TreasuryModel, { nullable: true })
  async treasuryByFamily(
    @Args('familyId') familyId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const t = await this.treasury.getByFamily(familyId, user.userId);
    return t ? toModel(t) : null;
  }

  @Query(() => TreasuryDashboardModel)
  treasuryDashboard(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.treasury.dashboard(treasuryId, user.userId);
  }

  @Mutation(() => TreasuryModel)
  async createTreasury(
    @Args('input') input: CreateTreasuryInput,
    @CurrentUser() user: { userId: string },
  ) {
    const t = await this.treasury.createTreasury(
      user.userId,
      input.familyId,
      input.name,
      input.assetCode,
      input.approvalThreshold,
      input.requiredApprovals,
    );
    return toModel(t);
  }

  @Mutation(() => TreasuryModel)
  async recordOnChainTreasury(
    @Args('input') input: RecordOnChainTreasuryInput,
    @CurrentUser() user: { userId: string },
  ) {
    const t = await this.treasury.recordOnChain(
      user.userId,
      input.treasuryId,
      input.contractTreasuryId,
      input.contractAddress,
    );
    return toModel(t);
  }

  @Mutation(() => TreasuryModel)
  async setTreasuryFrozen(
    @Args('treasuryId') treasuryId: string,
    @Args('frozen') frozen: boolean,
    @CurrentUser() user: { userId: string },
  ) {
    const t = await this.treasury.setFrozen(user.userId, treasuryId, frozen);
    return toModel(t);
  }
}

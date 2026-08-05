import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RulesService } from './rules.service';
import { TreasuryService } from '../treasury/treasury.service';
import { AutomationModel, WithdrawalRequestModel } from './models/rules.model';
import {
  CreateAutomationInput,
  RequestWithdrawalInput,
  SetApprovalRuleInput,
} from './dto/rules.dto';

function toWithdrawalModel(w: {
  id: string;
  treasuryId: string;
  requestedByUserId: string;
  toAddress: string;
  amount: any;
  reason: string | null;
  status: any;
  createdAt: Date;
  approvals: unknown[];
}): WithdrawalRequestModel {
  return {
    id: w.id,
    treasuryId: w.treasuryId,
    requestedByUserId: w.requestedByUserId,
    toAddress: w.toAddress,
    amount: Number(w.amount),
    reason: w.reason ?? undefined,
    status: w.status,
    approvalCount: w.approvals.length,
    createdAt: w.createdAt,
  };
}

function toAutomationModel(a: {
  id: string;
  treasuryId: string;
  type: any;
  description: string;
  amount: any;
  intervalDays: number | null;
  nextRunAt: Date | null;
  active: boolean;
}): AutomationModel {
  return {
    id: a.id,
    treasuryId: a.treasuryId,
    type: a.type,
    description: a.description,
    amount: a.amount ? Number(a.amount) : undefined,
    intervalDays: a.intervalDays ?? undefined,
    nextRunAt: a.nextRunAt ?? undefined,
    active: a.active,
  };
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class RulesResolver {
  constructor(
    private readonly rules: RulesService,
    private readonly treasury: TreasuryService,
  ) {}

  @Query(() => [WithdrawalRequestModel])
  async withdrawalRequests(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const list = await this.rules.listWithdrawals(treasuryId, user.userId);
    return list.map(toWithdrawalModel);
  }

  @Mutation(() => WithdrawalRequestModel)
  async requestWithdrawal(
    @Args('input') input: RequestWithdrawalInput,
    @CurrentUser() user: { userId: string },
  ) {
    const w = await this.rules.requestWithdrawal(
      input.treasuryId,
      user.userId,
      input.toAddress,
      input.amount,
      input.reason,
    );
    return toWithdrawalModel(w);
  }

  @Mutation(() => WithdrawalRequestModel)
  async approveWithdrawal(
    @Args('withdrawalId') withdrawalId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const w = await this.rules.approveWithdrawal(withdrawalId, user.userId);
    return toWithdrawalModel(w);
  }

  @Mutation(() => Boolean)
  async setApprovalRule(
    @Args('input') input: SetApprovalRuleInput,
    @CurrentUser() user: { userId: string },
  ) {
    await this.treasury.setApprovalRule(
      user.userId,
      input.treasuryId,
      input.approvalThreshold,
      input.requiredApprovals,
    );
    return true;
  }

  @Query(() => [AutomationModel])
  async automations(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const list = await this.rules.listAutomations(treasuryId, user.userId);
    return list.map(toAutomationModel);
  }

  @Mutation(() => AutomationModel)
  async createAutomation(
    @Args('input') input: CreateAutomationInput,
    @CurrentUser() user: { userId: string },
  ) {
    const automation = await this.rules.createAutomation(
      input.treasuryId,
      user.userId,
      input.type,
      input.description,
      input.amount,
      input.intervalDays,
    );
    return toAutomationModel(automation);
  }

  @Mutation(() => AutomationModel)
  async toggleAutomation(
    @Args('automationId') automationId: string,
    @Args('active') active: boolean,
    @CurrentUser() user: { userId: string },
  ) {
    const automation = await this.rules.toggleAutomation(automationId, user.userId, active);
    return toAutomationModel(automation);
  }
}

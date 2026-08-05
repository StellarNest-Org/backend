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


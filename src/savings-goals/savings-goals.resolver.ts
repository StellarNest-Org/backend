import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SavingsGoalsService } from './savings-goals.service';
import { SavingsGoalModel } from './models/savings-goal.model';
import { ContributeToGoalInput, CreateSavingsGoalInput } from './dto/savings-goal.dto';

function toModel(g: {
  id: string;
  treasuryId: string;
  name: string;
  category: any;
  targetAmount: any;
  currentAmount: any;
  createdAt: Date;
}): SavingsGoalModel {
  const target = Number(g.targetAmount);
  const current = Number(g.currentAmount);
  return {
    id: g.id,
    treasuryId: g.treasuryId,
    name: g.name,
    category: g.category,
    targetAmount: target,
    currentAmount: current,
    progress: target > 0 ? Math.min(1, current / target) : 0,
    createdAt: g.createdAt,
  };
}

@Resolver(() => SavingsGoalModel)
@UseGuards(JwtAuthGuard)
export class SavingsGoalsResolver {
  constructor(private readonly goals: SavingsGoalsService) {}

  @Query(() => [SavingsGoalModel])
  async savingsGoals(
    @Args('treasuryId') treasuryId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const list = await this.goals.list(treasuryId, user.userId);
    return list.map(toModel);
  }

  @Mutation(() => SavingsGoalModel)
  async createSavingsGoal(
    @Args('input') input: CreateSavingsGoalInput,
    @CurrentUser() user: { userId: string },
  ) {
    const goal = await this.goals.create(
      input.treasuryId,
      user.userId,
      input.name,
      input.category,
      input.targetAmount,
    );
    return toModel(goal);
  }

  @Mutation(() => SavingsGoalModel)
  async contributeToGoal(
    @Args('input') input: ContributeToGoalInput,
    @CurrentUser() user: { userId: string },
  ) {
    const goal = await this.goals.recordContribution(input.goalId, user.userId, input.amount);
    return toModel(goal);
  }
}

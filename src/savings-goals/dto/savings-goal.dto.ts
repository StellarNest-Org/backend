import { Field, Float, InputType } from '@nestjs/graphql';
import { GoalCategory } from '@prisma/client';
import { IsEnum, IsPositive } from 'class-validator';

@InputType()
export class CreateSavingsGoalInput {
  @Field()
  treasuryId: string;

  @Field()
  name: string;

  @Field(() => GoalCategory)
  @IsEnum(GoalCategory)
  category: GoalCategory;

  @Field(() => Float)
  @IsPositive()
  targetAmount: number;
}

@InputType()
export class ContributeToGoalInput {
  @Field()
  goalId: string;

  @Field(() => Float)
  @IsPositive()
  amount: number;
}

import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GoalCategory } from '@prisma/client';

registerEnumType(GoalCategory, { name: 'GoalCategory' });

@ObjectType()
export class SavingsGoalModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field()
  name: string;

  @Field(() => GoalCategory)
  category: GoalCategory;

  @Field(() => Float)
  targetAmount: number;

  @Field(() => Float)
  currentAmount: number;

  @Field(() => Float)
  progress: number;

  @Field()
  createdAt: Date;
}

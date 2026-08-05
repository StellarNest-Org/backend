import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AutomationType, WithdrawalStatus } from '@prisma/client';

registerEnumType(WithdrawalStatus, { name: 'WithdrawalStatus' });
registerEnumType(AutomationType, { name: 'AutomationType' });

@ObjectType()
export class WithdrawalRequestModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field()
  requestedByUserId: string;

  @Field()
  toAddress: string;

  @Field(() => Float)
  amount: number;

  @Field({ nullable: true })
  reason?: string;

  @Field(() => WithdrawalStatus)
  status: WithdrawalStatus;

  @Field(() => Int)
  approvalCount: number;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class AutomationModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field(() => AutomationType)
  type: AutomationType;

  @Field()
  description: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field(() => Int, { nullable: true })
  intervalDays?: number;

  @Field({ nullable: true })
  nextRunAt?: Date;

  @Field()
  active: boolean;
}

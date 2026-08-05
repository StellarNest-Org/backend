import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { AutomationType } from '@prisma/client';
import { IsEnum, IsOptional, IsPositive, Min } from 'class-validator';

@InputType()
export class RequestWithdrawalInput {
  @Field()
  treasuryId: string;

  @Field()
  toAddress: string;

  @Field(() => Float)
  @IsPositive()
  amount: number;

  @Field({ nullable: true })
  @IsOptional()
  reason?: string;
}

@InputType()
export class SetApprovalRuleInput {
  @Field()
  treasuryId: string;

  @Field(() => Float)
  @IsPositive()
  approvalThreshold: number;

  @Field(() => Int)
  @Min(1)
  requiredApprovals: number;
}

@InputType()
export class CreateAutomationInput {
  @Field()
  treasuryId: string;

  @Field(() => AutomationType)
  @IsEnum(AutomationType)
  type: AutomationType;

  @Field()
  description: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  amount?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  intervalDays?: number;
}

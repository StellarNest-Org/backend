import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';

@InputType()
export class BeneficiaryInput {
  @Field()
  name: string;

  @Field()
  stellarAddress: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  allocationBps: number;
}

@InputType()
export class CreateInheritanceVaultInput {
  @Field()
  treasuryId: string;

  @Field()
  timeLockAt: Date;

  @Field(() => Int)
  @Min(1)
  deadManSwitchDays: number;

  @Field(() => Int)
  @Min(1)
  guardianApprovalsRequired: number;

  @Field({ nullable: true })
  @IsOptional()
  legalNotes?: string;

  @Field(() => [BeneficiaryInput])
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BeneficiaryInput)
  beneficiaries: BeneficiaryInput[];
}

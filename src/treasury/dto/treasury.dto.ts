import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { AssetCode } from '@prisma/client';
import { IsEnum, IsPositive, Min } from 'class-validator';

@InputType()
export class CreateTreasuryInput {
  @Field()
  familyId: string;

  @Field()
  name: string;

  @Field(() => AssetCode)
  @IsEnum(AssetCode)
  assetCode: AssetCode;

  @Field(() => Float)
  @IsPositive()
  approvalThreshold: number;

  @Field(() => Int)
  @Min(1)
  requiredApprovals: number;
}

@InputType()
export class RecordOnChainTreasuryInput {
  @Field()
  treasuryId: string;

  @Field()
  contractTreasuryId: string;

  @Field()
  contractAddress: string;
}

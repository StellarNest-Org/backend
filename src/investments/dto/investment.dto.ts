import { Field, Float, InputType } from '@nestjs/graphql';
import { AssetCode, InvestmentCategory } from '@prisma/client';
import { IsEnum, IsPositive } from 'class-validator';

@InputType()
export class AddInvestmentHoldingInput {
  @Field()
  treasuryId: string;

  @Field(() => AssetCode)
  @IsEnum(AssetCode)
  assetCode: AssetCode;

  @Field(() => InvestmentCategory)
  @IsEnum(InvestmentCategory)
  category: InvestmentCategory;

  @Field(() => Float)
  @IsPositive()
  quantity: number;

  @Field(() => Float)
  @IsPositive()
  costBasis: number;

  @Field(() => Float)
  @IsPositive()
  currentValue: number;
}

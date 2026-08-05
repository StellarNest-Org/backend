import { Field, Float, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AssetCode, InvestmentCategory } from '@prisma/client';

registerEnumType(InvestmentCategory, { name: 'InvestmentCategory' });

@ObjectType()
export class InvestmentHoldingModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field(() => AssetCode)
  assetCode: AssetCode;

  @Field(() => InvestmentCategory)
  category: InvestmentCategory;

  @Field(() => Float)
  quantity: number;

  @Field(() => Float)
  costBasis: number;

  @Field(() => Float)
  currentValue: number;

  @Field(() => Float)
  profitLoss: number;

  @Field(() => Float)
  profitLossPercent: number;
}

@ObjectType()
export class PortfolioSummaryModel {
  @Field(() => Float)
  totalValue: number;

  @Field(() => Float)
  totalCostBasis: number;

  @Field(() => Float)
  totalProfitLoss: number;

  @Field(() => Float)
  totalProfitLossPercent: number;

  @Field(() => [InvestmentHoldingModel])
  holdings: InvestmentHoldingModel[];
}

import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AssetCode } from '@prisma/client';

registerEnumType(AssetCode, { name: 'AssetCode' });

@ObjectType()
export class TreasuryModel {
  @Field(() => ID)
  id: string;

  @Field()
  familyId: string;

  @Field({ nullable: true })
  contractTreasuryId?: string;

  @Field({ nullable: true })
  contractAddress?: string;

  @Field()
  name: string;

  @Field(() => AssetCode)
  assetCode: AssetCode;

  @Field(() => Float)
  approvalThreshold: number;

  @Field(() => Int)
  requiredApprovals: number;

  @Field()
  frozen: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class TreasuryDashboardModel {
  @Field(() => Float)
  totalBalance: number;

  @Field(() => Float)
  totalSavings: number;

  @Field(() => Float)
  billsDueThisMonth: number;

  @Field(() => Float)
  investmentsValue: number;

  @Field(() => Float)
  monthlySpending: number;

  @Field(() => Int)
  upcomingTransfers: number;

  @Field()
  inheritanceStatus: string;

  @Field(() => Int)
  pendingApprovals: number;
}

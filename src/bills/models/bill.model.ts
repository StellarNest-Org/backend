import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BillCategory, BillStatus } from '@prisma/client';

registerEnumType(BillCategory, { name: 'BillCategory' });
registerEnumType(BillStatus, { name: 'BillStatus' });

@ObjectType()
export class BillModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field()
  name: string;

  @Field(() => BillCategory)
  category: BillCategory;

  @Field()
  payeeName: string;

  @Field()
  payeeAddress: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Int)
  intervalDays: number;

  @Field()
  nextDueAt: Date;

  @Field(() => BillStatus)
  status: BillStatus;

  @Field()
  active: boolean;
}

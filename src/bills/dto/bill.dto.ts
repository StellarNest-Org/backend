import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { BillCategory } from '@prisma/client';
import { IsEnum, IsPositive, Min } from 'class-validator';

@InputType()
export class CreateBillInput {
  @Field()
  treasuryId: string;

  @Field()
  name: string;

  @Field(() => BillCategory)
  @IsEnum(BillCategory)
  category: BillCategory;

  @Field()
  payeeName: string;

  @Field()
  payeeAddress: string;

  @Field(() => Float)
  @IsPositive()
  amount: number;

  @Field(() => Int)
  @Min(1)
  intervalDays: number;
}

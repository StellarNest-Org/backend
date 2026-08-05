import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { BillsService } from './bills.service';
import { BillModel } from './models/bill.model';
import { CreateBillInput } from './dto/bill.dto';

function toModel(b: {
  id: string;
  treasuryId: string;
  name: string;
  category: any;
  payeeName: string;
  payeeAddress: string;
  amount: any;
  intervalDays: number;
  nextDueAt: Date;
  status: any;
  active: boolean;
}): BillModel {
  return { ...b, amount: Number(b.amount) };
}

@Resolver(() => BillModel)
@UseGuards(JwtAuthGuard)
export class BillsResolver {
  constructor(private readonly billsService: BillsService) {}

  @Query(() => [BillModel])
  async bills(@Args('treasuryId') treasuryId: string, @CurrentUser() user: { userId: string }) {
    const list = await this.billsService.list(treasuryId, user.userId);
    return list.map(toModel);
  }

  @Mutation(() => BillModel)
  async createBill(@Args('input') input: CreateBillInput, @CurrentUser() user: { userId: string }) {
    const bill = await this.billsService.create(
      input.treasuryId,
      user.userId,
      input.name,
      input.category,
      input.payeeName,
      input.payeeAddress,
      input.amount,
      input.intervalDays,
    );
    return toModel(bill);
  }

  @Mutation(() => BillModel)
  async cancelBill(@Args('billId') billId: string, @CurrentUser() user: { userId: string }) {
    const bill = await this.billsService.cancel(billId, user.userId);
    return toModel(bill);
  }
}

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvestmentsService } from './investments.service';
import { InvestmentHoldingModel, PortfolioSummaryModel } from './models/investment.model';
import { AddInvestmentHoldingInput } from './dto/investment.dto';

@Resolver(() => PortfolioSummaryModel)
@UseGuards(JwtAuthGuard)
export class InvestmentsResolver {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Query(() => PortfolioSummaryModel)
  portfolio(@Args('treasuryId') treasuryId: string, @CurrentUser() user: { userId: string }) {
    return this.investmentsService.portfolio(treasuryId, user.userId);
  }

  @Mutation(() => InvestmentHoldingModel)
  addInvestmentHolding(
    @Args('input') input: AddInvestmentHoldingInput,
    @CurrentUser() user: { userId: string },
  ) {
    return this.investmentsService.addHolding(
      input.treasuryId,
      user.userId,
      input.assetCode,
      input.category,
      input.quantity,
      input.costBasis,
      input.currentValue,
    );
  }
}

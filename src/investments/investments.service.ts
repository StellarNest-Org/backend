import { Injectable, NotFoundException } from '@nestjs/common';
import { AssetCode, InvestmentCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FamiliesService } from '../families/families.service';

function withPnl(h: {
  id: string;
  treasuryId: string;
  assetCode: AssetCode;
  category: InvestmentCategory;
  quantity: any;
  costBasis: any;
  currentValue: any;
}) {
  const costBasis = Number(h.costBasis);
  const currentValue = Number(h.currentValue);
  const profitLoss = currentValue - costBasis;
  return {
    ...h,
    quantity: Number(h.quantity),
    costBasis,
    currentValue,
    profitLoss,
    profitLossPercent: costBasis > 0 ? (profitLoss / costBasis) * 100 : 0,
  };
}

@Injectable()
export class InvestmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly families: FamiliesService,
  ) {}

  async portfolio(treasuryId: string, userId: string) {
    const treasury = await this.prisma.treasury.findUnique({ where: { id: treasuryId } });
    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }
    await this.families.requireMembership(treasury.familyId, userId);

    const holdings = await this.prisma.investmentHolding.findMany({ where: { treasuryId } });
    const enriched = holdings.map(withPnl);
    const totalValue = enriched.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCostBasis = enriched.reduce((sum, h) => sum + h.costBasis, 0);
    const totalProfitLoss = totalValue - totalCostBasis;

    return {
      totalValue,
      totalCostBasis,
      totalProfitLoss,
      totalProfitLossPercent: totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0,
      holdings: enriched,
    };
  }

  async addHolding(
    treasuryId: string,
    userId: string,
    assetCode: AssetCode,
    category: InvestmentCategory,
    quantity: number,
    costBasis: number,
    currentValue: number,
  ) {
    const treasury = await this.prisma.treasury.findUnique({ where: { id: treasuryId } });
    if (!treasury) {
      throw new NotFoundException('Treasury not found');
    }
    await this.families.assertAdmin(treasury.familyId, userId);
    const holding = await this.prisma.investmentHolding.create({
      data: { treasuryId, assetCode, category, quantity, costBasis, currentValue },
    });
    return withPnl(holding);
  }
}

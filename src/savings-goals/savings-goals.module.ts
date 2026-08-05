import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { SavingsGoalsService } from './savings-goals.service';
import { SavingsGoalsResolver } from './savings-goals.resolver';

@Module({
  imports: [FamiliesModule],
  providers: [SavingsGoalsService, SavingsGoalsResolver],
})
export class SavingsGoalsModule {}

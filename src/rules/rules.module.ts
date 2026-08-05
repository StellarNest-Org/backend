import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { TreasuryModule } from '../treasury/treasury.module';
import { RulesService } from './rules.service';
import { RulesResolver } from './rules.resolver';

@Module({
  imports: [FamiliesModule, TreasuryModule],
  providers: [RulesService, RulesResolver],
})
export class RulesModule {}

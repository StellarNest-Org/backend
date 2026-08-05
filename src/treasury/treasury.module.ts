import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { TreasuryService } from './treasury.service';
import { TreasuryResolver } from './treasury.resolver';

@Module({
  imports: [FamiliesModule],
  providers: [TreasuryService, TreasuryResolver],
  exports: [TreasuryService],
})
export class TreasuryModule {}

import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { InvestmentsService } from './investments.service';
import { InvestmentsResolver } from './investments.resolver';

@Module({
  imports: [FamiliesModule],
  providers: [InvestmentsService, InvestmentsResolver],
})
export class InvestmentsModule {}

import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { BillsService } from './bills.service';
import { BillsResolver } from './bills.resolver';

@Module({
  imports: [FamiliesModule],
  providers: [BillsService, BillsResolver],
})
export class BillsModule {}

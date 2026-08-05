import { Module } from '@nestjs/common';
import { FamiliesService } from './families.service';
import { FamiliesResolver } from './families.resolver';

@Module({
  providers: [FamiliesService, FamiliesResolver],
  exports: [FamiliesService],
})
export class FamiliesModule {}

import { Module } from '@nestjs/common';
import { FamiliesModule } from '../families/families.module';
import { InheritanceService } from './inheritance.service';
import { InheritanceResolver } from './inheritance.resolver';

@Module({
  imports: [FamiliesModule],
  providers: [InheritanceService, InheritanceResolver],
})
export class InheritanceModule {}

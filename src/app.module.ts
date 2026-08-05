import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FamiliesModule } from './families/families.module';
import { TreasuryModule } from './treasury/treasury.module';
import { RulesModule } from './rules/rules.module';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';
import { BillsModule } from './bills/bills.module';
import { InvestmentsModule } from './investments/investments.module';
import { InheritanceModule } from './inheritance/inheritance.module';
import { StellarModule } from './stellar/stellar.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    PrismaModule,
    AuthModule,
    FamiliesModule,
    TreasuryModule,
    RulesModule,
    SavingsGoalsModule,
    BillsModule,
    InvestmentsModule,
    InheritanceModule,
    StellarModule,
  ],
})
export class AppModule {}

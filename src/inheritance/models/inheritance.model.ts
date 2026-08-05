import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BeneficiaryModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  stellarAddress: string;

  @Field(() => Int)
  allocationBps: number;

  @Field()
  guardianApproved: boolean;
}

@ObjectType()
export class InheritanceVaultModel {
  @Field(() => ID)
  id: string;

  @Field()
  treasuryId: string;

  @Field()
  timeLockAt: Date;

  @Field(() => Int)
  deadManSwitchDays: number;

  @Field()
  lastHeartbeatAt: Date;

  @Field(() => Int)
  guardianApprovalsRequired: number;

  @Field({ nullable: true })
  legalNotes?: string;

  @Field()
  claimed: boolean;

  @Field(() => [BeneficiaryModel])
  beneficiaries: BeneficiaryModel[];
}

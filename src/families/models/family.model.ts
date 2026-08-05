import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { FamilyRole } from '@prisma/client';

registerEnumType(FamilyRole, { name: 'FamilyRole' });

@ObjectType()
export class FamilyMemberModel {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  displayName: string;

  @Field()
  email: string;

  @Field(() => FamilyRole)
  role: FamilyRole;

  @Field({ nullable: true })
  spendingLimit?: number;

  @Field()
  joinedAt: Date;
}

@ObjectType()
export class FamilyModel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => [FamilyMemberModel])
  members: FamilyMemberModel[];

  @Field()
  createdAt: Date;
}

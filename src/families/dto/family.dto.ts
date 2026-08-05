import { Field, Float, InputType } from '@nestjs/graphql';
import { FamilyRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsPositive } from 'class-validator';

@InputType()
export class CreateFamilyInput {
  @Field()
  name: string;
}

@InputType()
export class AddFamilyMemberInput {
  @Field()
  familyId: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  displayName: string;

  @Field(() => FamilyRole)
  @IsEnum(FamilyRole)
  role: FamilyRole;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsPositive()
  spendingLimit?: number;
}

@InputType()
export class UpdateFamilyMemberRoleInput {
  @Field()
  memberId: string;

  @Field(() => FamilyRole)
  @IsEnum(FamilyRole)
  role: FamilyRole;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  spendingLimit?: number;
}

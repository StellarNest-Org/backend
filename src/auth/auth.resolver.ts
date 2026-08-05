import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload, SignInInput, SignUpInput } from './dto/auth.dto';

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}

  @Mutation(() => AuthPayload)
  signUp(@Args('input') input: SignUpInput) {
    return this.auth.signUp(input.email, input.password, input.displayName);
  }

  @Mutation(() => AuthPayload)
  signIn(@Args('input') input: SignInInput) {
    return this.auth.signIn(input.email, input.password);
  }
}

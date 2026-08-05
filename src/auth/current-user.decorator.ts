import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const gqlContext = GqlExecutionContext.create(context);
  const req = gqlContext.getContext().req ?? context.switchToHttp().getRequest();
  return req.user;
});

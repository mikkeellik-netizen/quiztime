import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): { id: string } =>
    ctx.switchToHttp().getRequest().user,
);

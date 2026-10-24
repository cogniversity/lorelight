import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  /** User's database ID — present in JWT payload as `sub` */
  sub: string;
  /** Alias of sub; populated by JwtStrategy.validate() for backward compatibility */
  id?: string;
  email: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Param decorator that extracts the authenticated user (or a property of it)
 * from the request object populated by JwtStrategy.
 *
 * Usage:
 *   @CurrentUser() user: JwtPayload
 *   @CurrentUser('sub') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload = request.user;
    return data ? user?.[data] : user;
  },
);

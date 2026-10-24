import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the Bearer JWT on every request.
 * Expects a PassportJS JWT strategy registered as 'jwt' in AuthModule.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

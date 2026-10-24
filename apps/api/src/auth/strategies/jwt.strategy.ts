import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Passport JWT strategy — validates the Bearer access token.
 * Verifies the user still exists and is active.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtAccessSecret') || 'changeme',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, isActive: true, isAdmin: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Attach to request.user; downstream code uses CurrentUser() decorator.
    // Include both `id` and `sub` so existing guards (id) and new code (sub) both work.
    return { id: user.id, sub: user.id, email: user.email, isAdmin: user.isAdmin };
  }
}

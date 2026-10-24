import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../common/current-user.decorator';
import { CurrentUserDto } from './dto/current-user.dto';

const REFRESH_TOKEN_SEPARATOR = '.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Token helpers ──────────────────────────────────────────────────────────

  private signAccessToken(sub: string, email: string): string {
    const payload: JwtPayload = { sub, email };
    return this.jwt.sign(payload);
  }

  /**
   * Generates a refresh token, stores its argon2 hash in the DB.
   * Returns the raw cookie value: `${recordId}.${rawToken}`
   */
  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = await argon2.hash(rawToken);

    const expiresInMs =
      this.parseDuration(
        this.config.get<string>('app.jwtRefreshExpires') ?? '7d',
      );

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return `${record.id}${REFRESH_TOKEN_SEPARATOR}${rawToken}`;
  }

  /**
   * Parse a duration string like '7d', '15m', '1h' into milliseconds.
   */
  private parseDuration(value: string): number {
    const unit = value.slice(-1);
    const amount = parseInt(value.slice(0, -1), 10);
    const map: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return (map[unit] ?? 86_400_000) * amount;
  }

  // ── Auth flows ─────────────────────────────────────────────────────────────

  /** Called by LocalStrategy to verify credentials */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, isActive: true },
    });

    if (!user || !user.isActive) return null;

    const valid = await argon2.verify(user.password, password);
    if (!valid) return null;

    return { id: user.id, email: user.email };
  }

  /** POST /auth/login — returns { accessToken } + sets refresh cookie */
  async login(userId: string, email: string) {
    const [accessToken, refreshCookie] = await Promise.all([
      this.signAccessToken(userId, email),
      this.createRefreshToken(userId),
    ]);
    return { accessToken, refreshCookie };
  }

  /**
   * POST /auth/refresh — rotates the refresh token.
   * Cookie format: `${recordId}.${rawToken}`
   */
  async refreshTokens(cookieValue: string) {
    const separatorIdx = cookieValue.indexOf(REFRESH_TOKEN_SEPARATOR);
    if (separatorIdx === -1) {
      throw new UnauthorizedException('Malformed refresh token');
    }

    const recordId = cookieValue.slice(0, separatorIdx);
    const rawToken = cookieValue.slice(separatorIdx + 1);

    const record = await this.prisma.refreshToken.findUnique({
      where: { id: recordId },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (
      !record ||
      record.revokedAt ||
      record.expiresAt < new Date() ||
      !record.user.isActive
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const valid = await argon2.verify(record.tokenHash, rawToken);
    if (!valid) {
      // Possible token reuse — revoke immediately
      await this.prisma.refreshToken.update({
        where: { id: recordId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token is invalid');
    }

    // Revoke old token and issue new pair (rotation)
    await this.prisma.refreshToken.update({
      where: { id: recordId },
      data: { revokedAt: new Date() },
    });

    const [accessToken, refreshCookie] = await Promise.all([
      this.signAccessToken(record.user.id, record.user.email),
      this.createRefreshToken(record.user.id),
    ]);

    return { accessToken, refreshCookie };
  }

  /** POST /auth/logout — revokes the refresh token from the cookie */
  async logout(cookieValue: string) {
    const separatorIdx = cookieValue.indexOf(REFRESH_TOKEN_SEPARATOR);
    if (separatorIdx === -1) return; // no-op for malformed token

    const recordId = cookieValue.slice(0, separatorIdx);

    await this.prisma.refreshToken
      .update({
        where: { id: recordId },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // Ignore — token may not exist
      });
  }

  /** GET /auth/me — returns the current user's public profile */
  async getMe(userId: string): Promise<CurrentUserDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
    return user;
  }

  /** PUT /auth/me/password — changes the current user's password */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { password: true },
    });

    const valid = await argon2.verify(user.password, currentPassword);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashed = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

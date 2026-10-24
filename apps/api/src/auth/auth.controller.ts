import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUserDto } from './dto/current-user.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /api/auth/login ─────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ summary: 'Login with email and password' })
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    // LoginDto is validated by ValidationPipe; LocalStrategy provides req.user
    @Body() _dto: LoginDto,
  ): Promise<{ accessToken: string }> {
    const user = req.user as { id: string; email: string };
    const { accessToken, refreshCookie } = await this.authService.login(
      user.id,
      user.email,
    );

    res.cookie(REFRESH_COOKIE, refreshCookie, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  // ── POST /api/auth/refresh ───────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Rotate refresh token and return new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const cookieValue: string | undefined = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (!cookieValue) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { accessToken, refreshCookie } =
      await this.authService.refreshTokens(cookieValue);

    res.cookie(REFRESH_COOKIE, refreshCookie, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  // ── POST /api/auth/logout ────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookieValue: string | undefined = (req.cookies as Record<string, string>)[REFRESH_COOKIE];
    if (cookieValue) {
      await this.authService.logout(cookieValue);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  }

  // ── GET /api/auth/me ─────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getMe(@CurrentUser('sub') userId: string): Promise<CurrentUserDto> {
    return this.authService.getMe(userId);
  }

  // ── PUT /api/auth/me/password ─────────────────────────────────────────────

  @Put('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password (requires current password)' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}

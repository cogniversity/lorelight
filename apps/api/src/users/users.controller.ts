import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/** Throws 403 if the requesting user is not an admin */
function requireAdmin(user: JwtPayload & { isAdmin?: boolean }) {
  if (!user.isAdmin) {
    throw new ForbiddenException('Admin access required');
  }
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── GET /api/users ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '[ADMIN] List all users' })
  async findAll(@CurrentUser() user: JwtPayload & { isAdmin?: boolean }) {
    requireAdmin(user);
    return this.usersService.findAll();
  }

  // ── POST /api/users ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: '[ADMIN] Create a new user' })
  async create(
    @CurrentUser() user: JwtPayload & { isAdmin?: boolean },
    @Body() dto: CreateUserDto,
  ) {
    requireAdmin(user);
    return this.usersService.create(dto);
  }

  // ── GET /api/users/:id ────────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: '[ADMIN] Get a user by ID' })
  async findOne(
    @CurrentUser() user: JwtPayload & { isAdmin?: boolean },
    @Param('id') id: string,
  ) {
    requireAdmin(user);
    return this.usersService.findById(id);
  }

  // ── PUT /api/users/:id ────────────────────────────────────────────────────

  @Put(':id')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: '[ADMIN] Update a user' })
  async update(
    @CurrentUser() user: JwtPayload & { isAdmin?: boolean },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    requireAdmin(user);
    return this.usersService.update(id, dto);
  }

  // ── DELETE /api/users/:id ─────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiOperation({ summary: '[ADMIN] Soft-disable a user (sets isActive=false)' })
  async remove(
    @CurrentUser() user: JwtPayload & { isAdmin?: boolean },
    @Param('id') id: string,
  ) {
    requireAdmin(user);
    await this.usersService.setActive(id, false);
  }
}

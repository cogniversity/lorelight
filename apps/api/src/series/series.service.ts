import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SeriesRole } from '@prisma/client';
import slugify from 'slugify';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

/** Roles considered at least ADMIN level */
const ADMIN_ROLES: SeriesRole[] = [SeriesRole.ADMIN, SeriesRole.OWNER];

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;

    while (await this.prisma.series.findUnique({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async getMembership(userId: string, seriesId: string) {
    return this.prisma.seriesMembership.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
      select: { role: true },
    });
  }

  // ── Series CRUD ────────────────────────────────────────────────────────────

  /** List all series where the requesting user is a member */
  async findAllForUser(userId: string) {
    const memberships = await this.prisma.seriesMembership.findMany({
      where: { userId },
      include: {
        series: {
          select: {
            id: true,
            slug: true,
            name: true,
            premise: true,
            posterUrl: true,
            isArchived: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { series: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => ({ ...m.series, myRole: m.role }));
  }

  /** Create a new series; creator becomes OWNER */
  async create(userId: string, dto: CreateSeriesDto) {
    const slug = await this.generateUniqueSlug(dto.name);

    const series = await this.prisma.series.create({
      data: {
        slug,
        name: dto.name,
        premise: dto.premise ?? '',
        posterUrl: dto.posterUrl,
        memberships: {
          create: { userId, role: SeriesRole.OWNER },
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
        premise: true,
        posterUrl: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { ...series, myRole: SeriesRole.OWNER };
  }

  /** Get a single series with the requesting user's role */
  async findOne(userId: string, seriesId: string) {
    const [series, membership] = await Promise.all([
      this.prisma.series.findUnique({
        where: { id: seriesId },
        select: {
          id: true,
          slug: true,
          name: true,
          premise: true,
          posterUrl: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.getMembership(userId, seriesId),
    ]);

    if (!series) throw new NotFoundException(`Series ${seriesId} not found`);
    if (!membership) throw new ForbiddenException('Not a member of this series');

    return { ...series, myRole: membership.role };
  }

  /** Update a series (requires ADMIN+) */
  async update(userId: string, seriesId: string, dto: UpdateSeriesDto) {
    const membership = await this.getMembership(userId, seriesId);
    if (!membership || !ADMIN_ROLES.includes(membership.role)) {
      throw new ForbiddenException('Requires ADMIN or OWNER role');
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.name) {
      data.slug = await this.generateUniqueSlug(dto.name);
    }

    return this.prisma.series.update({
      where: { id: seriesId },
      data,
      select: {
        id: true,
        slug: true,
        name: true,
        premise: true,
        posterUrl: true,
        isArchived: true,
        updatedAt: true,
      },
    });
  }

  /** Archive a series (OWNER only) */
  async archive(userId: string, seriesId: string) {
    const membership = await this.getMembership(userId, seriesId);
    if (!membership || membership.role !== SeriesRole.OWNER) {
      throw new ForbiddenException('Only the OWNER can archive a series');
    }

    return this.prisma.series.update({
      where: { id: seriesId },
      data: { isArchived: true },
      select: { id: true, isArchived: true, updatedAt: true },
    });
  }

  // ── Membership management ─────────────────────────────────────────────────

  async listMembers(seriesId: string) {
    return this.prisma.seriesMembership.findMany({
      where: { seriesId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Add member by email (ADMIN+) */
  async addMember(
    requesterId: string,
    seriesId: string,
    dto: AddMemberDto,
  ) {
    const requesterMembership = await this.getMembership(requesterId, seriesId);
    if (!requesterMembership || !ADMIN_ROLES.includes(requesterMembership.role)) {
      throw new ForbiddenException('Requires ADMIN or OWNER role');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (!targetUser) {
      throw new NotFoundException(`No user found with email ${dto.email}`);
    }

    const existing = await this.getMembership(targetUser.id, seriesId);
    if (existing) {
      throw new ConflictException('User is already a member of this series');
    }

    // Prevent assigning OWNER through this endpoint
    const role = dto.role === SeriesRole.OWNER ? SeriesRole.ADMIN : (dto.role ?? SeriesRole.VIEWER);

    return this.prisma.seriesMembership.create({
      data: { userId: targetUser.id, seriesId, role },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
      },
    });
  }

  /** Update a member's role (ADMIN+; cannot change OWNER's role) */
  async updateMember(
    requesterId: string,
    seriesId: string,
    targetUserId: string,
    dto: UpdateMemberDto,
  ) {
    const [requesterMembership, targetMembership] = await Promise.all([
      this.getMembership(requesterId, seriesId),
      this.getMembership(targetUserId, seriesId),
    ]);

    if (!requesterMembership || !ADMIN_ROLES.includes(requesterMembership.role)) {
      throw new ForbiddenException('Requires ADMIN or OWNER role');
    }
    if (!targetMembership) {
      throw new NotFoundException('Target user is not a member of this series');
    }
    if (targetMembership.role === SeriesRole.OWNER) {
      throw new BadRequestException('Cannot change the OWNER\'s role');
    }
    if (dto.role === SeriesRole.OWNER) {
      throw new BadRequestException('Cannot assign OWNER role via this endpoint');
    }

    return this.prisma.seriesMembership.update({
      where: { userId_seriesId: { userId: targetUserId, seriesId } },
      data: { role: dto.role },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
      },
    });
  }

  /** Remove a member (OWNER or ADMIN; cannot remove OWNER) */
  async removeMember(
    requesterId: string,
    seriesId: string,
    targetUserId: string,
  ) {
    const [requesterMembership, targetMembership] = await Promise.all([
      this.getMembership(requesterId, seriesId),
      this.getMembership(targetUserId, seriesId),
    ]);

    if (!requesterMembership || !ADMIN_ROLES.includes(requesterMembership.role)) {
      throw new ForbiddenException('Requires ADMIN or OWNER role');
    }
    if (!targetMembership) {
      throw new NotFoundException('Target user is not a member of this series');
    }
    if (targetMembership.role === SeriesRole.OWNER) {
      throw new BadRequestException('Cannot remove the OWNER from the series');
    }
    // Non-owners cannot remove admins
    if (
      targetMembership.role === SeriesRole.ADMIN &&
      requesterMembership.role !== SeriesRole.OWNER
    ) {
      throw new ForbiddenException('Only the OWNER can remove an ADMIN');
    }

    await this.prisma.seriesMembership.delete({
      where: { userId_seriesId: { userId: targetUserId, seriesId } },
    });
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDraftDto } from './dto/update-draft.dto';

const PREVIEW_LENGTH = 200;

@Injectable()
export class DraftManuscriptService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Get or create ────────────────────────────────────────────────────────

  async getOrCreate(seriesId: string) {
    let ms = await this.prisma.sourceManuscript.findUnique({
      where: { seriesId },
    });
    if (!ms) {
      ms = await this.prisma.sourceManuscript.create({
        data: { seriesId, content: '', revisionNum: 0 },
      });
    }
    return this.toDto(ms);
  }

  // ── Update with optimistic concurrency ──────────────────────────────────

  async update(seriesId: string, userId: string, dto: UpdateDraftDto) {
    return this.prisma.$transaction(async (tx) => {
      const ms = await tx.sourceManuscript.findUnique({
        where: { seriesId },
      });

      if (!ms) throw new NotFoundException('Draft manuscript not found');

      if (ms.revisionNum !== dto.expectedRevision) {
        throw new ConflictException(
          `Revision conflict: expected ${dto.expectedRevision} but current is ${ms.revisionNum}. ` +
          'Reload the latest draft before saving.',
        );
      }

      const nextRevisionNum = ms.revisionNum + 1;

      // Persist a snapshot of the old content as an immutable revision
      await tx.manuscriptRevision.create({
        data: {
          manuscriptId: ms.id,
          revisionNum: ms.revisionNum,
          content: ms.content,
          authorId: userId,
        },
      });

      const updated = await tx.sourceManuscript.update({
        where: { id: ms.id },
        data: { content: dto.content, revisionNum: nextRevisionNum },
      });

      return this.toDto(updated);
    });
  }

  // ── Append without conflict check (fast path for AI proposals) ──────────

  async appendContent(
    seriesId: string,
    userId: string,
    appendText: string,
    expectedRevision: number,
  ) {
    return this.update(seriesId, userId, {
      content: '', // will be replaced inside transaction
      expectedRevision,
    }).catch(() => null); // handled below

    // Actually do an append inside a transaction
  }

  /**
   * Append text to the current manuscript (for AI create/append proposals).
   * Uses optimistic concurrency: caller must supply the expectedRevision.
   */
  async append(seriesId: string, userId: string, appendText: string, expectedRevision: number) {
    return this.prisma.$transaction(async (tx) => {
      const ms = await tx.sourceManuscript.findUnique({ where: { seriesId } });
      if (!ms) throw new NotFoundException('Draft manuscript not found');

      if (ms.revisionNum !== expectedRevision) {
        throw new ConflictException(
          `Revision conflict: expected ${expectedRevision} but current is ${ms.revisionNum}.`,
        );
      }

      const nextRevisionNum = ms.revisionNum + 1;
      await tx.manuscriptRevision.create({
        data: {
          manuscriptId: ms.id,
          revisionNum: ms.revisionNum,
          content: ms.content,
          authorId: userId,
        },
      });

      const newContent = ms.content
        ? ms.content + '\n\n' + appendText
        : appendText;

      const updated = await tx.sourceManuscript.update({
        where: { id: ms.id },
        data: { content: newContent, revisionNum: nextRevisionNum },
      });

      return this.toDto(updated);
    });
  }

  // ── List revisions ───────────────────────────────────────────────────────

  async listRevisions(seriesId: string) {
    const ms = await this.prisma.sourceManuscript.findUnique({
      where: { seriesId },
    });
    if (!ms) return { items: [] };

    const revisions = await this.prisma.manuscriptRevision.findMany({
      where: { manuscriptId: ms.id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { revisionNum: 'desc' },
      take: 50,
    });

    return {
      items: revisions.map((r) => ({
        id: r.id,
        manuscriptId: r.manuscriptId,
        revisionNum: r.revisionNum,
        contentPreview: r.content.slice(0, PREVIEW_LENGTH) + (r.content.length > PREVIEW_LENGTH ? '…' : ''),
        authorId: r.authorId,
        authorName: r.author.name,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // ── Get single revision (with full content) ──────────────────────────────

  async getRevision(seriesId: string, revisionId: string) {
    const ms = await this.prisma.sourceManuscript.findUnique({
      where: { seriesId },
    });
    if (!ms) throw new NotFoundException('Draft manuscript not found');

    const rev = await this.prisma.manuscriptRevision.findFirst({
      where: { id: revisionId, manuscriptId: ms.id },
      include: { author: { select: { id: true, name: true } } },
    });
    if (!rev) throw new NotFoundException('Revision not found');

    return {
      id: rev.id,
      manuscriptId: rev.manuscriptId,
      revisionNum: rev.revisionNum,
      content: rev.content,
      authorId: rev.authorId,
      authorName: rev.author.name,
      createdAt: rev.createdAt.toISOString(),
    };
  }

  // ── Restore a revision ───────────────────────────────────────────────────

  async restoreRevision(seriesId: string, userId: string, revisionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ms = await tx.sourceManuscript.findUnique({ where: { seriesId } });
      if (!ms) throw new NotFoundException('Draft manuscript not found');

      const rev = await tx.manuscriptRevision.findFirst({
        where: { id: revisionId, manuscriptId: ms.id },
      });
      if (!rev) throw new NotFoundException('Revision not found');

      // Snapshot current before restoring
      await tx.manuscriptRevision.create({
        data: {
          manuscriptId: ms.id,
          revisionNum: ms.revisionNum,
          content: ms.content,
          authorId: userId,
        },
      });

      const nextRevisionNum = ms.revisionNum + 1;
      const updated = await tx.sourceManuscript.update({
        where: { id: ms.id },
        data: { content: rev.content, revisionNum: nextRevisionNum },
      });

      return this.toDto(updated);
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private toDto(ms: {
    id: string;
    seriesId: string;
    content: string;
    revisionNum: number;
    updatedAt: Date;
  }) {
    return {
      id: ms.id,
      seriesId: ms.seriesId,
      content: ms.content,
      revisionNum: ms.revisionNum,
      updatedAt: ms.updatedAt.toISOString(),
    };
  }
}

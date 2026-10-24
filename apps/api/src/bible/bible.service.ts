import { Injectable, NotFoundException } from '@nestjs/common';
import { BibleEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBibleEntryDto } from './dto/upsert-bible-entry.dto';

@Injectable()
export class BibleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Return all bible entries for a series, ordered by position. */
  async listEntries(seriesId: string) {
    return this.prisma.bibleEntry.findMany({
      where: { seriesId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Upsert a bible entry by (seriesId, type).
   * Creates the entry if it doesn't exist; updates it otherwise.
   */
  async upsertEntry(
    seriesId: string,
    type: BibleEntryType,
    dto: UpsertBibleEntryDto,
  ) {
    // Determine position for a new entry (max existing + 1).
    const nextPosition = async () => {
      const agg = await this.prisma.bibleEntry.aggregate({
        where: { seriesId },
        _max: { position: true },
      });
      return (agg._max.position ?? -1) + 1;
    };

    return this.prisma.bibleEntry.upsert({
      where: { seriesId_type: { seriesId, type } },
      create: {
        seriesId,
        type,
        title: dto.title,
        content: dto.content ?? '',
        position: dto.position ?? (await nextPosition()),
      },
      update: {
        title: dto.title,
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  /** Delete a bible entry by type. Throws 404 if absent. */
  async deleteEntry(seriesId: string, type: BibleEntryType) {
    const entry = await this.prisma.bibleEntry.findUnique({
      where: { seriesId_type: { seriesId, type } },
    });
    if (!entry) {
      throw new NotFoundException(`Bible entry of type '${type}' not found`);
    }
    return this.prisma.bibleEntry.delete({
      where: { seriesId_type: { seriesId, type } },
    });
  }
}

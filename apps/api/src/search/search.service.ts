import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type SearchResultKind =
  | 'CHARACTER'
  | 'LOCATION'
  | 'ARTIFACT'
  | 'ORGANIZATION'
  | 'TIMELINE_EVENT'
  | 'EPISODE'
  | 'SCENE'
  | 'CLIP'
  | 'BIBLE_ENTRY'
  | 'ASSET';

export interface SearchResultDto {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  highlight?: string;
}

const HIGHLIGHT_LEN = 160;

function excerpt(text: string | null | undefined, query: string): string | undefined {
  if (!text) return undefined;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, HIGHLIGHT_LEN);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + HIGHLIGHT_LEN);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    seriesId: string,
    q: string,
    limit = 10,
  ): Promise<{ results: SearchResultDto[]; total: number; query: string }> {
    const contains = { contains: q, mode: 'insensitive' as const };
    const results: SearchResultDto[] = [];

    // Prisma parallel search across all entity types
    const [entities, episodes, scenes, clips, bibleEntries, assets] =
      await Promise.all([
        // WorldEntity
        this.prisma.worldEntity.findMany({
          where: {
            seriesId,
            OR: [
              { displayName: contains },
              { subtitle: contains },
              { description: contains },
            ],
          },
          take: limit,
          select: {
            id: true,
            type: true,
            displayName: true,
            subtitle: true,
            description: true,
          },
        }),

        // Episode (via season → series)
        this.prisma.episode.findMany({
          where: {
            season: { seriesId },
            OR: [{ title: contains }, { synopsis: contains }],
          },
          take: limit,
          select: {
            id: true,
            title: true,
            synopsis: true,
            number: true,
            season: { select: { number: true } },
          },
        }),

        // Scene (via episode → season → series)
        this.prisma.scene.findMany({
          where: {
            episode: { season: { seriesId } },
            OR: [{ title: contains }, { summary: contains }],
          },
          take: limit,
          select: {
            id: true,
            title: true,
            summary: true,
            number: true,
            episode: { select: { title: true } },
          },
        }),

        // Clip (via scene → episode → season → series)
        this.prisma.clip.findMany({
          where: {
            scene: { episode: { season: { seriesId } } },
            OR: [{ title: contains }, { storyBeat: contains }],
          },
          take: limit,
          select: {
            id: true,
            title: true,
            storyBeat: true,
            number: true,
            scene: { select: { title: true } },
          },
        }),

        // BibleEntry
        this.prisma.bibleEntry.findMany({
          where: {
            seriesId,
            OR: [{ title: contains }, { content: contains }],
          },
          take: limit,
          select: { id: true, title: true, type: true, content: true },
        }),

        // Asset
        this.prisma.asset.findMany({
          where: {
            seriesId,
            title: contains,
          },
          take: limit,
          select: { id: true, title: true, type: true, filename: true },
        }),
      ]);

    // Map WorldEntities
    for (const e of entities) {
      results.push({
        id: e.id,
        kind: e.type as SearchResultKind,
        title: e.displayName,
        subtitle: e.subtitle ?? '',
        highlight: excerpt(e.description, q),
      });
    }

    // Map Episodes
    for (const ep of episodes) {
      results.push({
        id: ep.id,
        kind: 'EPISODE',
        title: ep.title,
        subtitle: `Season ${ep.season.number}, Episode ${ep.number}`,
        highlight: excerpt(ep.synopsis, q),
      });
    }

    // Map Scenes
    for (const sc of scenes) {
      results.push({
        id: sc.id,
        kind: 'SCENE',
        title: sc.title,
        subtitle: `Scene ${sc.number} — ${sc.episode.title}`,
        highlight: excerpt(sc.summary, q),
      });
    }

    // Map Clips
    for (const cl of clips) {
      results.push({
        id: cl.id,
        kind: 'CLIP',
        title: cl.title,
        subtitle: `Clip ${cl.number} — ${cl.scene.title}`,
        highlight: excerpt(cl.storyBeat, q),
      });
    }

    // Map BibleEntries
    for (const be of bibleEntries) {
      results.push({
        id: be.id,
        kind: 'BIBLE_ENTRY',
        title: be.title,
        subtitle: be.type,
        highlight: excerpt(be.content, q),
      });
    }

    // Map Assets
    for (const a of assets) {
      results.push({
        id: a.id,
        kind: 'ASSET',
        title: a.title,
        subtitle: `${a.type} — ${a.filename}`,
      });
    }

    // Trim to requested limit
    const trimmed = results.slice(0, limit);
    return { results: trimmed, total: trimmed.length, query: q };
  }
}

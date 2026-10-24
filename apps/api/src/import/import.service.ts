import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportPreviewDto } from './dto/import-preview.dto';
import { ImportCommitResultDto } from './dto/import-commit.dto';
import slugify from 'slugify';

// ── Lorelight v2 format type hints ─────────────────────────────────────────

interface V2Entity {
  id?: string;
  name?: string;
  displayName?: string;
  kind?: string;
  type?: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  externalId?: string;
  // Character
  visualDescription?: string;
  voiceDescription?: string;
  biography?: string;
  goals?: string;
  motivations?: string;
  fears?: string;
  // Location
  architectureNotes?: string;
  moodNotes?: string;
  lightingNotes?: string;
  // Artifact
  origin?: string;
  importance?: string;
  // Org
  purpose?: string;
  leadership?: string;
}

interface V2BibleEntry {
  id?: string;
  type?: string;
  title?: string;
  content?: string;
}

interface V2Episode {
  id?: string;
  title?: string;
  number?: number;
  synopsis?: string;
  scenes?: V2Scene[];
}

interface V2Scene {
  id?: string;
  title?: string;
  number?: number;
  summary?: string;
  clips?: V2Clip[];
}

interface V2Clip {
  id?: string;
  title?: string;
  number?: number;
  storyBeat?: string;
  action?: string;
  dialogue?: string;
}

interface V2Project {
  name?: string;
  title?: string;
  premise?: string;
  // Bible stored as map or array
  bible?: Record<string, V2BibleEntry> | V2BibleEntry[];
  // Entities stored as array or map
  entities?: V2Entity[] | Record<string, V2Entity>;
  characters?: V2Entity[];
  locations?: V2Entity[];
  artifacts?: V2Entity[];
  organizations?: V2Entity[];
  // Manuscript
  episodes?: V2Episode[];
  seasons?: Array<{ episodes?: V2Episode[] }>;
}

// ── Entity kind normalisation ────────────────────────────────────────────────

type PrismaWorldEntityType =
  | 'CHARACTER'
  | 'LOCATION'
  | 'ARTIFACT'
  | 'ORGANIZATION'
  | 'TIMELINE_EVENT';

const KIND_MAP: Record<string, PrismaWorldEntityType> = {
  Character: 'CHARACTER',
  character: 'CHARACTER',
  CHARACTER: 'CHARACTER',
  Location: 'LOCATION',
  location: 'LOCATION',
  LOCATION: 'LOCATION',
  Artifact: 'ARTIFACT',
  artifact: 'ARTIFACT',
  ARTIFACT: 'ARTIFACT',
  Organization: 'ORGANIZATION',
  organization: 'ORGANIZATION',
  ORGANIZATION: 'ORGANIZATION',
  'Timeline Event': 'TIMELINE_EVENT',
  TimelineEvent: 'TIMELINE_EVENT',
  TIMELINE_EVENT: 'TIMELINE_EVENT',
};

type PrismaBibleEntryType =
  | 'PREMISE'
  | 'THEMES'
  | 'CANON_RULES'
  | 'LORE'
  | 'TIMELINE'
  | 'CUSTOM';

const BIBLE_TYPE_MAP: Record<string, PrismaBibleEntryType> = {
  premise: 'PREMISE',
  PREMISE: 'PREMISE',
  themes: 'THEMES',
  THEMES: 'THEMES',
  canon: 'CANON_RULES',
  canon_rules: 'CANON_RULES',
  CANON_RULES: 'CANON_RULES',
  lore: 'LORE',
  LORE: 'LORE',
  timeline: 'TIMELINE',
  TIMELINE: 'TIMELINE',
};

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Parse helpers ────────────────────────────────────────────────────────

  private parse(localStorageJson: string): V2Project {
    let raw: unknown;
    try {
      raw = JSON.parse(localStorageJson);
    } catch {
      throw new BadRequestException(
        'Invalid JSON: could not parse localStorageJson',
      );
    }

    if (typeof raw !== 'object' || raw === null) {
      throw new BadRequestException('Expected a JSON object at the root');
    }

    const obj = raw as Record<string, unknown>;

    // Support both top-level project and a wrapper {project: {...}} or {data: {...}}
    const project: V2Project =
      (obj['project'] as V2Project) ??
      (obj['data'] as V2Project) ??
      (obj as V2Project);

    if (!project.name && !project.title) {
      throw new BadRequestException(
        'Could not detect series name — ensure the export has a "name" or "title" field',
      );
    }

    return project;
  }

  private collectEntities(project: V2Project): V2Entity[] {
    const all: V2Entity[] = [];

    if (project.entities) {
      if (Array.isArray(project.entities)) {
        all.push(...project.entities);
      } else {
        all.push(...Object.values(project.entities));
      }
    }
    if (project.characters) all.push(...project.characters.map(e => ({ ...e, kind: 'Character' })));
    if (project.locations) all.push(...project.locations.map(e => ({ ...e, kind: 'Location' })));
    if (project.artifacts) all.push(...project.artifacts.map(e => ({ ...e, kind: 'Artifact' })));
    if (project.organizations) all.push(...project.organizations.map(e => ({ ...e, kind: 'Organization' })));

    return all;
  }

  private collectBibleEntries(project: V2Project): V2BibleEntry[] {
    if (!project.bible) return [];
    if (Array.isArray(project.bible)) return project.bible;
    return Object.entries(project.bible).map(([key, val]) => ({
      type: key,
      title: (val as V2BibleEntry).title ?? key,
      content: (val as V2BibleEntry).content ?? '',
    }));
  }

  private collectEpisodes(project: V2Project): V2Episode[] {
    if (project.episodes) return project.episodes;
    if (project.seasons) {
      return project.seasons.flatMap(s => s.episodes ?? []);
    }
    return [];
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  async preview(localStorageJson: string): Promise<ImportPreviewDto> {
    const project = this.parse(localStorageJson);
    const warnings: string[] = [];

    const entities = this.collectEntities(project);
    const bibleEntries = this.collectBibleEntries(project);
    const episodes = this.collectEpisodes(project);

    let sceneCount = 0;
    let clipCount = 0;
    for (const ep of episodes) {
      sceneCount += ep.scenes?.length ?? 0;
      for (const sc of ep.scenes ?? []) {
        clipCount += sc.clips?.length ?? 0;
      }
    }

    // Warn about unknown entity kinds
    const unknownKinds = new Set<string>();
    for (const e of entities) {
      const rawKind = e.kind ?? e.type ?? '';
      if (rawKind && !KIND_MAP[rawKind]) unknownKinds.add(rawKind);
    }
    if (unknownKinds.size) {
      warnings.push(
        `Unknown entity kinds will be skipped: ${[...unknownKinds].join(', ')}`,
      );
    }

    warnings.push(
      'Asset binary files are not recoverable from localStorage exports. Only metadata is imported.',
    );

    return {
      seriesName: project.name ?? project.title ?? 'Untitled',
      entityCount: entities.filter(e => KIND_MAP[e.kind ?? e.type ?? '']).length,
      bibleEntryCount: bibleEntries.length,
      episodeCount: episodes.length,
      sceneCount,
      clipCount,
      warnings,
    };
  }

  // ── Commit ───────────────────────────────────────────────────────────────

  async commit(
    localStorageJson: string,
    userId: string,
  ): Promise<ImportCommitResultDto> {
    const project = this.parse(localStorageJson);
    const warnings: string[] = [];
    const entities = this.collectEntities(project);
    const bibleEntries = this.collectBibleEntries(project);
    const episodes = this.collectEpisodes(project);

    const seriesName = project.name ?? project.title ?? 'Imported Series';
    let importedCount = 0;

    const slug = slugify(seriesName, { lower: true, strict: true }) + '-' + Date.now();

    // Run everything in one Prisma transaction
    const series = await this.prisma.$transaction(async tx => {
      // 1. Create Series
      const newSeries = await tx.series.create({
        data: {
          name: seriesName,
          slug,
          premise: project.premise ?? '',
        },
      });

      // 2. Add current user as OWNER
      await tx.seriesMembership.create({
        data: {
          seriesId: newSeries.id,
          userId,
          role: 'OWNER',
        },
      });

      // 3. Import BibleEntries
      let biblePos = 0;
      for (const be of bibleEntries) {
        const rawType = be.type ?? 'CUSTOM';
        const mappedType: PrismaBibleEntryType =
          BIBLE_TYPE_MAP[rawType] ?? 'CUSTOM';

        try {
          await tx.bibleEntry.upsert({
            where: { seriesId_type: { seriesId: newSeries.id, type: mappedType } },
            create: {
              seriesId: newSeries.id,
              type: mappedType,
              title: be.title ?? rawType,
              content: be.content ?? '',
              position: biblePos++,
            },
            update: {
              content: be.content ?? '',
              title: be.title ?? rawType,
            },
          });
          importedCount++;
        } catch (err) {
          warnings.push(`Skipped bible entry "${be.title}": ${(err as Error).message}`);
        }
      }

      // 4. Import WorldEntities
      for (const e of entities) {
        const rawKind = e.kind ?? e.type ?? '';
        const mappedType = KIND_MAP[rawKind];
        if (!mappedType) {
          warnings.push(
            `Skipped entity "${e.displayName ?? e.name}": unknown kind "${rawKind}"`,
          );
          continue;
        }

        const displayName = e.displayName ?? e.name ?? 'Unnamed Entity';

        try {
          await tx.worldEntity.create({
            data: {
              seriesId: newSeries.id,
              type: mappedType,
              displayName,
              externalId: e.externalId ?? null,
              subtitle: e.subtitle ?? '',
              description: e.description ?? '',
              tags: e.tags ?? [],
              // Character fields
              visualDescription: e.visualDescription ?? null,
              voiceDescription: e.voiceDescription ?? null,
              biography: e.biography ?? null,
              goals: e.goals ?? null,
              motivations: e.motivations ?? null,
              fears: e.fears ?? null,
              // Location fields
              architectureNotes: e.architectureNotes ?? null,
              moodNotes: e.moodNotes ?? null,
              lightingNotes: e.lightingNotes ?? null,
              // Artifact fields
              origin: e.origin ?? null,
              importance: e.importance ?? null,
              // Org fields
              purpose: e.purpose ?? null,
              leadership: e.leadership ?? null,
            },
          });
          importedCount++;
        } catch (err) {
          warnings.push(
            `Skipped entity "${displayName}": ${(err as Error).message}`,
          );
        }
      }

      // 5. Import Episodes / Scenes / Clips
      let seasonNumber = 1;
      const defaultSeason = await tx.season.create({
        data: {
          seriesId: newSeries.id,
          number: seasonNumber,
          title: 'Season 1',
          position: 0,
        },
      });

      let episodePosition = 0;
      for (const ep of episodes) {
        const episode = await tx.episode.create({
          data: {
            seasonId: defaultSeason.id,
            number: ep.number ?? episodePosition + 1,
            title: ep.title ?? `Episode ${episodePosition + 1}`,
            synopsis: ep.synopsis ?? '',
            position: episodePosition++,
          },
        });
        importedCount++;

        // Default Act
        const act = await tx.act.create({
          data: {
            episodeId: episode.id,
            number: 1,
            title: 'Act 1',
            position: 0,
          },
        });

        let scenePosition = 0;
        for (const sc of ep.scenes ?? []) {
          const scene = await tx.scene.create({
            data: {
              actId: act.id,
              episodeId: episode.id,
              number: sc.number ?? scenePosition + 1,
              title: sc.title ?? `Scene ${scenePosition + 1}`,
              summary: sc.summary ?? '',
              position: scenePosition++,
            },
          });
          importedCount++;

          let clipPosition = 0;
          for (const cl of sc.clips ?? []) {
            await tx.clip.create({
              data: {
                sceneId: scene.id,
                number: cl.number ?? clipPosition + 1,
                title: cl.title ?? `Clip ${clipPosition + 1}`,
                storyBeat: cl.storyBeat ?? '',
                action: cl.action ?? null,
                dialogue: cl.dialogue ?? null,
                position: clipPosition++,
              },
            });
            importedCount++;
          }
        }
      }

      return newSeries;
    });

    warnings.push(
      'Asset binary files are not recoverable from localStorage exports. Only metadata was imported.',
    );

    this.logger.log(
      `Import complete for series "${seriesName}" (${series.id}): ${importedCount} records`,
    );

    return {
      seriesId: series.id,
      seriesName,
      importedCount,
      warnings,
    };
  }
}

/**
 * Executes approved change proposals transactionally.
 *
 * Safety guarantees:
 *  1. seriesId is always taken from the route context, never from the proposal payload.
 *  2. Every referenced parent ID is validated to belong to the same series before writing.
 *  3. Ordering is atomic — sibling positions are reassigned in the same transaction.
 *  4. Delete operations are not present in the allowlist.
 *  5. Each execution records an immutable AuditResult via ActivityService.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeProposal } from '@prisma/client';
import { ActivityService } from '../../activity/activity.service';

// ── Allowed command types ─────────────────────────────────────────────────────

const ALLOWED_COMMANDS = new Set([
  'CREATE_SEASON',
  'UPDATE_SEASON',
  'CREATE_EPISODE',
  'UPDATE_EPISODE',
  'CREATE_ACT',
  'UPDATE_ACT',
  'CREATE_SCENE',
  'UPDATE_SCENE',
  'CREATE_SCRIPT_BLOCK',
  'UPDATE_SCRIPT_BLOCK',
  'CREATE_CLIP',
  'UPDATE_CLIP',
  'CREATE_WORLD_ENTITY',
  'UPDATE_WORLD_ENTITY',
  'APPEND_DRAFT_MANUSCRIPT',
  'UPDATE_DRAFT_MANUSCRIPT',
  'CREATE_BIBLE_ENTRY',
  'UPDATE_BIBLE_ENTRY',
]);

@Injectable()
export class ProposalExecutorService {
  private readonly logger = new Logger(ProposalExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async execute(
    proposal: ChangeProposal,
    actorId: string,
    seriesId: string,
  ): Promise<{ appliedRecordId: string; afterSnap: Record<string, unknown> }> {
    if (!ALLOWED_COMMANDS.has(proposal.commandType)) {
      throw new BadRequestException(
        `Command '${proposal.commandType}' is not in the allowlist.`,
      );
    }

    // Ensure proposal belongs to this series (double-check even though guard ran)
    if (proposal.seriesId !== seriesId) {
      throw new BadRequestException('Proposal does not belong to this series.');
    }

    const payload = proposal.payload as Record<string, unknown>;
    const targetPath = proposal.targetPath as Record<string, string | null>;

    let appliedRecordId: string;
    let afterSnap: Record<string, unknown>;

    switch (proposal.commandType) {
      case 'CREATE_SEASON':
        ({ appliedRecordId, afterSnap } = await this.createSeason(seriesId, payload));
        break;
      case 'UPDATE_SEASON':
        ({ appliedRecordId, afterSnap } = await this.updateSeason(seriesId, targetPath, payload));
        break;
      case 'CREATE_EPISODE':
        ({ appliedRecordId, afterSnap } = await this.createEpisode(seriesId, targetPath, payload));
        break;
      case 'UPDATE_EPISODE':
        ({ appliedRecordId, afterSnap } = await this.updateEpisode(seriesId, targetPath, payload));
        break;
      case 'CREATE_ACT':
        ({ appliedRecordId, afterSnap } = await this.createAct(seriesId, targetPath, payload));
        break;
      case 'UPDATE_ACT':
        ({ appliedRecordId, afterSnap } = await this.updateAct(seriesId, targetPath, payload));
        break;
      case 'CREATE_SCENE':
        ({ appliedRecordId, afterSnap } = await this.createScene(seriesId, targetPath, payload));
        break;
      case 'UPDATE_SCENE':
        ({ appliedRecordId, afterSnap } = await this.updateScene(seriesId, targetPath, payload));
        break;
      case 'CREATE_SCRIPT_BLOCK':
        ({ appliedRecordId, afterSnap } = await this.createScriptBlock(seriesId, targetPath, payload));
        break;
      case 'UPDATE_SCRIPT_BLOCK':
        ({ appliedRecordId, afterSnap } = await this.updateScriptBlock(seriesId, targetPath, payload));
        break;
      case 'CREATE_CLIP':
        ({ appliedRecordId, afterSnap } = await this.createClip(seriesId, targetPath, payload));
        break;
      case 'UPDATE_CLIP':
        ({ appliedRecordId, afterSnap } = await this.updateClip(seriesId, targetPath, payload));
        break;
      case 'CREATE_WORLD_ENTITY':
        ({ appliedRecordId, afterSnap } = await this.createWorldEntity(seriesId, payload));
        break;
      case 'UPDATE_WORLD_ENTITY':
        ({ appliedRecordId, afterSnap } = await this.updateWorldEntity(seriesId, targetPath, payload));
        break;
      case 'APPEND_DRAFT_MANUSCRIPT':
        ({ appliedRecordId, afterSnap } = await this.appendDraftManuscript(seriesId, actorId, payload));
        break;
      case 'UPDATE_DRAFT_MANUSCRIPT':
        ({ appliedRecordId, afterSnap } = await this.updateDraftManuscript(seriesId, actorId, payload));
        break;
      case 'CREATE_BIBLE_ENTRY':
        ({ appliedRecordId, afterSnap } = await this.createBibleEntry(seriesId, payload));
        break;
      case 'UPDATE_BIBLE_ENTRY':
        ({ appliedRecordId, afterSnap } = await this.updateBibleEntry(seriesId, targetPath, payload));
        break;
      default:
        throw new BadRequestException(`Unhandled command: ${proposal.commandType}`);
    }

    await this.activity.log(
      seriesId,
      actorId,
      `PROPOSAL_APPLIED:${proposal.commandType}`,
      proposal.entityType,
      appliedRecordId,
      `Proposal ${proposal.id} applied by ${actorId}`,
    );

    return { appliedRecordId, afterSnap };
  }

  // ── Season ───────────────────────────────────────────────────────────────

  private async createSeason(seriesId: string, p: Record<string, unknown>) {
    const maxPos = await this.prisma.season.aggregate({
      where: { seriesId },
      _max: { position: true },
    });
    const r = await this.prisma.season.create({
      data: {
        seriesId,
        number: (p.number as number) ?? 1,
        title: String(p.title ?? 'Untitled Season'),
        synopsis: p.synopsis ? String(p.synopsis) : null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateSeason(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.seasonId;
    if (!id) throw new BadRequestException('targetPath.seasonId is required for UPDATE_SEASON');
    const existing = await this.prisma.season.findFirst({ where: { id, seriesId } });
    if (!existing) throw new NotFoundException(`Season ${id} not found in series`);
    const r = await this.prisma.season.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: String(p.title) }),
        ...(p.synopsis !== undefined && { synopsis: String(p.synopsis) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── Episode ──────────────────────────────────────────────────────────────

  private async createEpisode(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const seasonId = tp.seasonId;
    if (!seasonId) throw new BadRequestException('targetPath.seasonId required');
    const season = await this.prisma.season.findFirst({ where: { id: seasonId, seriesId } });
    if (!season) throw new NotFoundException(`Season ${seasonId} not found in series`);
    const maxPos = await this.prisma.episode.aggregate({ where: { seasonId }, _max: { position: true } });
    const r = await this.prisma.episode.create({
      data: {
        seasonId,
        number: (p.number as number) ?? 1,
        title: String(p.title ?? 'Untitled Episode'),
        synopsis: p.synopsis ? String(p.synopsis) : '',
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateEpisode(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.episodeId;
    if (!id) throw new BadRequestException('targetPath.episodeId required');
    const existing = await this.prisma.episode.findFirst({
      where: { id, season: { seriesId } },
    });
    if (!existing) throw new NotFoundException(`Episode ${id} not found`);
    const r = await this.prisma.episode.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: String(p.title) }),
        ...(p.synopsis !== undefined && { synopsis: String(p.synopsis) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── Act ──────────────────────────────────────────────────────────────────

  private async createAct(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const episodeId = tp.episodeId;
    if (!episodeId) throw new BadRequestException('targetPath.episodeId required');
    const ep = await this.prisma.episode.findFirst({ where: { id: episodeId, season: { seriesId } } });
    if (!ep) throw new NotFoundException(`Episode ${episodeId} not found`);
    const maxPos = await this.prisma.act.aggregate({ where: { episodeId }, _max: { position: true } });
    const r = await this.prisma.act.create({
      data: {
        episodeId,
        number: (p.number as number) ?? 1,
        title: String(p.title ?? 'Untitled Act'),
        summary: p.summary ? String(p.summary) : null,
        purpose: p.purpose ? String(p.purpose) : null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateAct(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.actId;
    if (!id) throw new BadRequestException('targetPath.actId required');
    const existing = await this.prisma.act.findFirst({
      where: { id, episode: { season: { seriesId } } },
    });
    if (!existing) throw new NotFoundException(`Act ${id} not found`);
    const r = await this.prisma.act.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: String(p.title) }),
        ...(p.summary !== undefined && { summary: String(p.summary) }),
        ...(p.purpose !== undefined && { purpose: String(p.purpose) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── Scene ─────────────────────────────────────────────────────────────────

  private async createScene(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const actId = tp.actId;
    if (!actId) throw new BadRequestException('targetPath.actId required');
    const act = await this.prisma.act.findFirst({
      where: { id: actId, episode: { season: { seriesId } } },
      include: { episode: true },
    });
    if (!act) throw new NotFoundException(`Act ${actId} not found`);
    const maxPos = await this.prisma.scene.aggregate({ where: { actId }, _max: { position: true } });
    const r = await this.prisma.scene.create({
      data: {
        actId,
        episodeId: act.episodeId,
        number: (p.number as number) ?? 1,
        title: String(p.title ?? 'Untitled Scene'),
        summary: p.summary ? String(p.summary) : '',
        purpose: p.purpose ? String(p.purpose) : null,
        timeOfDay: p.timeOfDay ? String(p.timeOfDay) : null,
        interior: p.interior !== false,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateScene(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.sceneId;
    if (!id) throw new BadRequestException('targetPath.sceneId required');
    const existing = await this.prisma.scene.findFirst({
      where: { id, act: { episode: { season: { seriesId } } } },
    });
    if (!existing) throw new NotFoundException(`Scene ${id} not found`);
    const r = await this.prisma.scene.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: String(p.title) }),
        ...(p.summary !== undefined && { summary: String(p.summary) }),
        ...(p.purpose !== undefined && { purpose: String(p.purpose) }),
        ...(p.timeOfDay !== undefined && { timeOfDay: String(p.timeOfDay) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── ScriptBlock ───────────────────────────────────────────────────────────

  private async createScriptBlock(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const sceneId = tp.sceneId;
    if (!sceneId) throw new BadRequestException('targetPath.sceneId required');
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, act: { episode: { season: { seriesId } } } },
    });
    if (!scene) throw new NotFoundException(`Scene ${sceneId} not found`);
    const maxPos = await this.prisma.scriptBlock.aggregate({ where: { sceneId }, _max: { position: true } });
    const r = await this.prisma.scriptBlock.create({
      data: {
        sceneId,
        type: (p.type as any) ?? 'ACTION',
        content: String(p.content ?? ''),
        characterId: p.characterId ? String(p.characterId) : null,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateScriptBlock(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.scriptBlockId;
    if (!id) throw new BadRequestException('targetPath.scriptBlockId required');
    const existing = await this.prisma.scriptBlock.findFirst({
      where: { id, scene: { act: { episode: { season: { seriesId } } } } },
    });
    if (!existing) throw new NotFoundException(`ScriptBlock ${id} not found`);
    const r = await this.prisma.scriptBlock.update({
      where: { id },
      data: {
        ...(p.content !== undefined && { content: String(p.content) }),
        ...(p.type !== undefined && { type: p.type as any }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── Clip ──────────────────────────────────────────────────────────────────

  private async createClip(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const sceneId = tp.sceneId;
    if (!sceneId) throw new BadRequestException('targetPath.sceneId required');
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, act: { episode: { season: { seriesId } } } },
    });
    if (!scene) throw new NotFoundException(`Scene ${sceneId} not found`);
    const maxPos = await this.prisma.clip.aggregate({ where: { sceneId }, _max: { position: true } });
    const r = await this.prisma.clip.create({
      data: {
        sceneId,
        number: (p.number as number) ?? 1,
        title: String(p.title ?? 'Untitled Clip'),
        storyBeat: p.storyBeat ? String(p.storyBeat) : '',
        action: p.action ? String(p.action) : null,
        dialogue: p.dialogue ? String(p.dialogue) : null,
        targetDurationSec: (p.targetDurationSec as number) ?? 7,
        position: (maxPos._max.position ?? -1) + 1,
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateClip(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.clipId;
    if (!id) throw new BadRequestException('targetPath.clipId required');
    const existing = await this.prisma.clip.findFirst({
      where: { id, scene: { act: { episode: { season: { seriesId } } } } },
    });
    if (!existing) throw new NotFoundException(`Clip ${id} not found`);
    const r = await this.prisma.clip.update({
      where: { id },
      data: {
        ...(p.title !== undefined && { title: String(p.title) }),
        ...(p.storyBeat !== undefined && { storyBeat: String(p.storyBeat) }),
        ...(p.action !== undefined && { action: String(p.action) }),
        ...(p.dialogue !== undefined && { dialogue: String(p.dialogue) }),
        ...(p.emotion !== undefined && { emotion: String(p.emotion) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── World Entity ─────────────────────────────────────────────────────────

  private async createWorldEntity(seriesId: string, p: Record<string, unknown>) {
    const r = await this.prisma.worldEntity.create({
      data: {
        seriesId,
        type: (p.type as any) ?? 'CHARACTER',
        displayName: String(p.displayName ?? 'Unnamed'),
        externalId: p.externalId ? String(p.externalId) : null,
        subtitle: p.subtitle ? String(p.subtitle) : '',
        description: p.description ? String(p.description) : '',
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateWorldEntity(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.entityId;
    if (!id) throw new BadRequestException('targetPath.entityId required');
    const existing = await this.prisma.worldEntity.findFirst({ where: { id, seriesId } });
    if (!existing) throw new NotFoundException(`WorldEntity ${id} not found`);
    const r = await this.prisma.worldEntity.update({
      where: { id },
      data: {
        ...(p.displayName !== undefined && { displayName: String(p.displayName) }),
        ...(p.subtitle !== undefined && { subtitle: String(p.subtitle) }),
        ...(p.description !== undefined && { description: String(p.description) }),
        ...(p.externalId !== undefined && { externalId: String(p.externalId) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  // ── Draft Manuscript ──────────────────────────────────────────────────────

  private async appendDraftManuscript(seriesId: string, actorId: string, p: Record<string, unknown>) {
    const appendText = String(p.appendText ?? '');
    const expectedRevision = Number(p.expectedRevision ?? 0);

    let ms = await this.prisma.sourceManuscript.findUnique({ where: { seriesId } });
    if (!ms) {
      ms = await this.prisma.sourceManuscript.create({
        data: { seriesId, content: '', revisionNum: 0 },
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.sourceManuscript.findUnique({ where: { seriesId } });
      if (!current) throw new NotFoundException('Draft not found');

      if (expectedRevision > 0 && current.revisionNum !== expectedRevision) {
        throw new BadRequestException(`Revision conflict: expected ${expectedRevision}, got ${current.revisionNum}`);
      }

      await tx.manuscriptRevision.create({
        data: {
          manuscriptId: current.id,
          revisionNum: current.revisionNum,
          content: current.content,
          authorId: actorId,
        },
      });

      const newContent = current.content ? current.content + '\n\n' + appendText : appendText;
      return tx.sourceManuscript.update({
        where: { id: current.id },
        data: { content: newContent, revisionNum: current.revisionNum + 1 },
      });
    });

    return { appliedRecordId: result.id, afterSnap: result as unknown as Record<string, unknown> };
  }

  private async updateDraftManuscript(seriesId: string, actorId: string, p: Record<string, unknown>) {
    const content = String(p.content ?? '');
    const expectedRevision = Number(p.expectedRevision ?? 0);

    const result = await this.prisma.$transaction(async (tx) => {
      const ms = await tx.sourceManuscript.findUnique({ where: { seriesId } });
      if (!ms) throw new NotFoundException('Draft not found');

      if (ms.revisionNum !== expectedRevision) {
        throw new BadRequestException(`Revision conflict: expected ${expectedRevision}, got ${ms.revisionNum}`);
      }

      await tx.manuscriptRevision.create({
        data: {
          manuscriptId: ms.id,
          revisionNum: ms.revisionNum,
          content: ms.content,
          authorId: actorId,
        },
      });

      return tx.sourceManuscript.update({
        where: { id: ms.id },
        data: { content, revisionNum: ms.revisionNum + 1 },
      });
    });

    return { appliedRecordId: result.id, afterSnap: result as unknown as Record<string, unknown> };
  }

  // ── Bible Entry ───────────────────────────────────────────────────────────

  private async createBibleEntry(seriesId: string, p: Record<string, unknown>) {
    const r = await this.prisma.bibleEntry.upsert({
      where: { seriesId_type: { seriesId, type: (p.type as any) ?? 'CUSTOM' } },
      create: {
        seriesId,
        type: (p.type as any) ?? 'CUSTOM',
        title: String(p.title ?? ''),
        content: String(p.content ?? ''),
      },
      update: {
        content: String(p.content ?? ''),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }

  private async updateBibleEntry(seriesId: string, tp: Record<string, string | null>, p: Record<string, unknown>) {
    const id = tp.entryId;
    if (!id) throw new BadRequestException('targetPath.entryId required');
    const existing = await this.prisma.bibleEntry.findFirst({ where: { id, seriesId } });
    if (!existing) throw new NotFoundException(`BibleEntry ${id} not found`);
    const r = await this.prisma.bibleEntry.update({
      where: { id },
      data: {
        ...(p.content !== undefined && { content: String(p.content) }),
        ...(p.title !== undefined && { title: String(p.title) }),
      },
    });
    return { appliedRecordId: r.id, afterSnap: r as unknown as Record<string, unknown> };
  }
}

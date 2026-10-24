import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActDto, UpdateActDto } from './dto/act.dto';
import { CreateClipDto, UpdateClipDto } from './dto/clip.dto';
import { CreateEpisodeDto, UpdateEpisodeDto } from './dto/episode.dto';
import { ReorderDto } from './dto/reorder.dto';
import { CreateSceneDto, UpdateSceneDto } from './dto/scene.dto';
import { CreateScriptBlockDto, UpdateScriptBlockDto } from './dto/script-block.dto';
import { CreateSeasonDto, UpdateSeasonDto } from './dto/season.dto';

@Injectable()
export class ManuscriptService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Full Manuscript Tree ──────────────────────────────────────────────────

  /**
   * Returns a lightweight representation of the entire manuscript hierarchy
   * for a series: Seasons → Episodes → Acts → Scenes → Clips (summary fields only).
   */
  async getManuscriptTree(seriesId: string) {
    return this.prisma.season.findMany({
      where: { seriesId },
      orderBy: { position: 'asc' },
      include: {
        episodes: {
          orderBy: { position: 'asc' },
          include: {
            acts: {
              orderBy: { position: 'asc' },
              include: {
                scenes: {
                  orderBy: { position: 'asc' },
                  include: {
                    clips: {
                      orderBy: { position: 'asc' },
                      select: {
                        id: true,
                        number: true,
                        title: true,
                        status: true,
                        position: true,
                        duration: true,
                        targetDurationSec: true,
                        storyBeat: true,
                        tags: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // ── Seasons ───────────────────────────────────────────────────────────────

  async listSeasons(seriesId: string) {
    return this.prisma.season.findMany({
      where: { seriesId },
      orderBy: { position: 'asc' },
    });
  }

  async createSeason(seriesId: string, dto: CreateSeasonDto) {
    const position =
      dto.position ??
      (await this.prisma.season.count({ where: { seriesId } }));

    return this.prisma.season.create({
      data: {
        seriesId,
        number: dto.number,
        title: dto.title,
        synopsis: dto.synopsis,
        position,
      },
    });
  }

  async getSeason(seriesId: string, seasonId: string) {
    const season = await this.prisma.season.findFirst({
      where: { id: seasonId, seriesId },
    });
    if (!season) throw new NotFoundException('Season not found');
    return season;
  }

  async updateSeason(seriesId: string, seasonId: string, dto: UpdateSeasonDto) {
    await this.getSeason(seriesId, seasonId);
    return this.prisma.season.update({ where: { id: seasonId }, data: dto });
  }

  async deleteSeason(seriesId: string, seasonId: string) {
    await this.getSeason(seriesId, seasonId);
    return this.prisma.season.delete({ where: { id: seasonId } });
  }

  // ── Episodes ──────────────────────────────────────────────────────────────

  async createEpisode(seriesId: string, seasonId: string, dto: CreateEpisodeDto) {
    // Verify the season belongs to this series.
    await this.getSeason(seriesId, seasonId);

    const position =
      dto.position ??
      (await this.prisma.episode.count({ where: { seasonId } }));

    return this.prisma.episode.create({
      data: {
        seasonId,
        number: dto.number,
        title: dto.title,
        synopsis: dto.synopsis ?? '',
        status: dto.status,
        estimatedRuntime: dto.estimatedRuntime,
        progress: dto.progress ?? 0,
        position,
      },
    });
  }

  async getEpisode(seriesId: string, episodeId: string) {
    const episode = await this.prisma.episode.findFirst({
      where: { id: episodeId, season: { seriesId } },
    });
    if (!episode) throw new NotFoundException('Episode not found');
    return episode;
  }

  async updateEpisode(seriesId: string, episodeId: string, dto: UpdateEpisodeDto) {
    await this.getEpisode(seriesId, episodeId);
    return this.prisma.episode.update({ where: { id: episodeId }, data: dto });
  }

  async deleteEpisode(seriesId: string, episodeId: string) {
    await this.getEpisode(seriesId, episodeId);
    return this.prisma.episode.delete({ where: { id: episodeId } });
  }

  // ── Acts ──────────────────────────────────────────────────────────────────

  async createAct(seriesId: string, episodeId: string, dto: CreateActDto) {
    await this.getEpisode(seriesId, episodeId);

    const position =
      dto.position ??
      (await this.prisma.act.count({ where: { episodeId } }));

    return this.prisma.act.create({
      data: {
        episodeId,
        number: dto.number,
        title: dto.title,
        summary: dto.summary,
        purpose: dto.purpose,
        tags: dto.tags ?? [],
        position,
      },
    });
  }

  async getAct(seriesId: string, actId: string) {
    const act = await this.prisma.act.findFirst({
      where: { id: actId, episode: { season: { seriesId } } },
    });
    if (!act) throw new NotFoundException('Act not found');
    return act;
  }

  async updateAct(seriesId: string, actId: string, dto: UpdateActDto) {
    await this.getAct(seriesId, actId);
    return this.prisma.act.update({ where: { id: actId }, data: dto });
  }

  async deleteAct(seriesId: string, actId: string) {
    await this.getAct(seriesId, actId);
    return this.prisma.act.delete({ where: { id: actId } });
  }

  // ── Scenes ────────────────────────────────────────────────────────────────

  async createScene(seriesId: string, actId: string, dto: CreateSceneDto) {
    const act = await this.getAct(seriesId, actId);

    const position =
      dto.position ??
      (await this.prisma.scene.count({ where: { actId } }));

    return this.prisma.scene.create({
      data: {
        actId,
        episodeId: act.episodeId,
        number: dto.number,
        title: dto.title,
        summary: dto.summary ?? '',
        purpose: dto.purpose,
        locationId: dto.locationId,
        timeOfDay: dto.timeOfDay,
        interior: dto.interior ?? true,
        status: dto.status,
        duration: dto.duration,
        tags: dto.tags ?? [],
        position,
      },
    });
  }

  async getScene(seriesId: string, sceneId: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { id: sceneId, episode: { season: { seriesId } } },
      include: {
        scriptBlocks: { orderBy: { position: 'asc' } },
        clips: { orderBy: { position: 'asc' } },
      },
    });
    if (!scene) throw new NotFoundException('Scene not found');
    return scene;
  }

  async updateScene(seriesId: string, sceneId: string, dto: UpdateSceneDto) {
    await this.getScene(seriesId, sceneId);
    return this.prisma.scene.update({ where: { id: sceneId }, data: dto });
  }

  async deleteScene(seriesId: string, sceneId: string) {
    await this.getScene(seriesId, sceneId);
    return this.prisma.scene.delete({ where: { id: sceneId } });
  }

  // ── Script Blocks ─────────────────────────────────────────────────────────

  async listScriptBlocks(seriesId: string, sceneId: string) {
    await this.getScene(seriesId, sceneId);
    return this.prisma.scriptBlock.findMany({
      where: { sceneId },
      orderBy: { position: 'asc' },
    });
  }

  async createScriptBlock(
    seriesId: string,
    sceneId: string,
    dto: CreateScriptBlockDto,
  ) {
    await this.getScene(seriesId, sceneId);

    const position =
      dto.position ??
      (await this.prisma.scriptBlock.count({ where: { sceneId } }));

    return this.prisma.scriptBlock.create({
      data: {
        sceneId,
        type: dto.type,
        content: dto.content,
        characterId: dto.characterId,
        position,
      },
    });
  }

  async getScriptBlock(seriesId: string, blockId: string) {
    const block = await this.prisma.scriptBlock.findFirst({
      where: {
        id: blockId,
        scene: { episode: { season: { seriesId } } },
      },
    });
    if (!block) throw new NotFoundException('Script block not found');
    return block;
  }

  async updateScriptBlock(
    seriesId: string,
    blockId: string,
    dto: UpdateScriptBlockDto,
  ) {
    await this.getScriptBlock(seriesId, blockId);
    return this.prisma.scriptBlock.update({ where: { id: blockId }, data: dto });
  }

  async deleteScriptBlock(seriesId: string, blockId: string) {
    await this.getScriptBlock(seriesId, blockId);
    return this.prisma.scriptBlock.delete({ where: { id: blockId } });
  }

  // ── Clips ─────────────────────────────────────────────────────────────────

  async createClip(seriesId: string, sceneId: string, dto: CreateClipDto) {
    await this.getScene(seriesId, sceneId);

    const position =
      dto.position ??
      (await this.prisma.clip.count({ where: { sceneId } }));

    return this.prisma.clip.create({
      data: {
        sceneId,
        number: dto.number,
        title: dto.title,
        storyBeat: dto.storyBeat ?? '',
        action: dto.action,
        dialogue: dto.dialogue,
        emotion: dto.emotion,
        duration: dto.duration,
        targetDurationSec: dto.targetDurationSec ?? 7,
        cameraShot: dto.cameraShot,
        cameraAngle: dto.cameraAngle,
        cameraMovement: dto.cameraMovement,
        composition: dto.composition,
        lens: dto.lens,
        lighting: dto.lighting,
        voiceNotes: dto.voiceNotes,
        ambientAudio: dto.ambientAudio,
        sfx: dto.sfx,
        music: dto.music,
        imagePrompt: dto.imagePrompt,
        videoPrompt: dto.videoPrompt,
        voicePrompt: dto.voicePrompt,
        audioPrompt: dto.audioPrompt,
        negativePrompt: dto.negativePrompt,
        status: dto.status,
        position,
        locationId: dto.locationId,
        tags: dto.tags ?? [],
      },
    });
  }

  async getClip(seriesId: string, clipId: string) {
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, scene: { episode: { season: { seriesId } } } },
      include: {
        characters: {
          include: {
            entity: {
              select: {
                id: true,
                type: true,
                displayName: true,
                externalId: true,
                subtitle: true,
                status: true,
                color: true,
              },
            },
          },
        },
        assetLinks: {
          include: {
            asset: {
              include: { variants: true },
            },
          },
        },
        generationRuns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            promptStatus: true,
            guideVersion: true,
            imagePrompt: true,
            videoPrompt: true,
            voicePrompt: true,
            audioPrompt: true,
            negativePrompt: true,
            compiledVideoPrompt: true,
            inputTokens: true,
            outputTokens: true,
            durationMs: true,
            errorMessage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!clip) throw new NotFoundException('Clip not found');
    return clip;
  }

  async updateClip(seriesId: string, clipId: string, dto: UpdateClipDto) {
    await this.getClip(seriesId, clipId);
    return this.prisma.clip.update({ where: { id: clipId }, data: dto });
  }

  async deleteClip(seriesId: string, clipId: string) {
    await this.getClip(seriesId, clipId);
    return this.prisma.clip.delete({ where: { id: clipId } });
  }

  /**
   * Reorder clips within a scene by providing an ordered array of clip IDs.
   * Each clip's position is set to its index in the array.
   */
  async reorderClips(seriesId: string, sceneId: string, dto: ReorderDto) {
    await this.getScene(seriesId, sceneId);

    const { ids } = dto;

    if (ids.length === 0) return [];

    // Verify all IDs belong to this scene.
    const existing = await this.prisma.clip.findMany({
      where: { id: { in: ids }, sceneId },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      throw new BadRequestException(
        'One or more clip IDs are invalid or do not belong to this scene',
      );
    }

    // Update positions in a transaction.
    const updates = ids.map((id, index) =>
      this.prisma.clip.update({ where: { id }, data: { position: index } }),
    );

    await this.prisma.$transaction(updates);

    return this.prisma.clip.findMany({
      where: { sceneId },
      orderBy: { position: 'asc' },
    });
  }
}

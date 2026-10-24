import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from './adapters/llm-factory.service';
import { GeneratePromptsDto } from './dto/generate-prompts.dto';
import { AcceptPromptsDto } from './dto/accept-prompts.dto';

// ── JSON schema for the structured prompt output ──────────────────────────────

const PROMPT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    imagePrompt: { type: 'string', description: 'Reference image generation prompt' },
    videoPrompt: { type: 'string', description: 'Cinematic video generation prompt' },
    voicePrompt: { type: 'string', description: 'Voice-over / dialogue direction' },
    audioPrompt: { type: 'string', description: 'Ambient audio, SFX, and music direction' },
    negativePrompt: { type: 'string', description: 'Elements and qualities to avoid' },
  },
  required: ['videoPrompt'],
};

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private guideContent: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly factory: LlmFactoryService,
  ) {
    this.guideContent = this.loadGuide();
  }

  // ── Load Video Prompt Guide ───────────────────────────────────────────────

  private loadGuide(): string {
    const candidates = [
      path.join(process.cwd(), 'docs', 'VIDEO_PROMPT_GUIDE.md'),
      path.join(process.cwd(), '..', '..', 'docs', 'VIDEO_PROMPT_GUIDE.md'),
      path.join(__dirname, '../../../../docs/VIDEO_PROMPT_GUIDE.md'),
      path.join(__dirname, '../../../docs/VIDEO_PROMPT_GUIDE.md'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        this.logger.log(`Loaded VIDEO_PROMPT_GUIDE from ${p}`);
        return fs.readFileSync(p, 'utf-8');
      }
    }

    this.logger.warn(
      'VIDEO_PROMPT_GUIDE.md not found; using built-in fallback system prompt',
    );
    return `You are an expert cinematic AI prompt engineer for a story production platform called Lorelight.
Your task is to generate high-quality production prompts for video, image, voice, and audio generation.
Always output valid JSON matching the requested schema.
Use vivid, cinematic language. Be specific about camera work, lighting, mood, and pacing.`;
  }

  // ── Generate Prompts ──────────────────────────────────────────────────────

  async generatePrompts(
    seriesId: string,
    clipId: string,
    userId: string,
    dto: GeneratePromptsDto,
  ) {
    // 1. Load clip with full context
    const clip = await this.prisma.clip.findFirst({
      where: { id: clipId, scene: { episode: { season: { seriesId } } } },
      include: {
        scene: {
          include: {
            act: true,
            episode: {
              include: { season: { include: { series: true } } },
            },
          },
        },
        characters: {
          include: {
            entity: {
              select: {
                id: true,
                displayName: true,
                externalId: true,
                type: true,
                description: true,
                subtitle: true,
                age: true,
                ethnicity: true,
                skinTone: true,
                visualDescription: true,
                facialFeatures: true,
                visualSilhouetteDress: true,
                voiceProfile: true,
                voiceDescription: true,
                costumeDescription: true,
                mannerisms: true,
                profilePhotoAssetId: true,
                imagePrompt: true,
                versions: {
                  orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
        assetLinks: {
          include: {
            asset: { select: { id: true, title: true, type: true } },
          },
        },
      },
    });

    if (!clip) throw new NotFoundException('Clip not found');

    const scene = clip.scene;
    const episode = scene.episode;
    const series = episode.season.series;

    // 2. Resolve provider config
    let providerConfig = dto.providerConfigId
      ? await this.prisma.llmProviderConfig.findFirst({
          where: { id: dto.providerConfigId, seriesId },
        })
      : await this.prisma.llmProviderConfig.findFirst({
          where: { seriesId, isDefault: true, isActive: true },
        });

    if (!providerConfig) {
      // Restrict fallback to this series or explicitly global (seriesId: null) configs only.
      providerConfig = await this.prisma.llmProviderConfig.findFirst({
        where: { isActive: true, OR: [{ seriesId }, { seriesId: null }] },
        orderBy: [{ seriesId: 'desc' }, { createdAt: 'asc' }],
      });
    }

    if (!providerConfig) {
      throw new BadRequestException(
        'No active LLM provider config found. Configure one via /api/series/:seriesId/providers',
      );
    }

    // 3. Build entity map for display-name → externalId substitution
    const entityMap: Map<string, string | null> = new Map();
    const storyOrder = await this.buildStoryOrder(seriesId);
    const sceneOrder = storyOrder.get(`SCENE:${scene.id}`) ?? 0;
    for (const ce of clip.characters) {
      const version = this.resolveCharacterVersion(
        ce.entity.versions ?? [],
        storyOrder,
        sceneOrder,
      );
      (ce.entity as typeof ce.entity & { effectiveVersion?: any }).effectiveVersion =
        version;
      entityMap.set(
        ce.entity.displayName,
        version?.externalId ?? ce.entity.externalId ?? null,
      );
    }

    // 4. Build user prompt with clip context
    const userPrompt = this.buildUserPrompt(clip, scene, episode, series, entityMap);

    // 5. Create a RUNNING GenerationRun record
    const inputSnapshot = {
      clipId: clip.id,
      sceneId: scene.id,
      episodeId: episode.id,
      seriesId,
      entityCount: clip.characters.length,
      assetCount: clip.assetLinks.length,
    };

    const run = await this.prisma.generationRun.create({
      data: {
        seriesId,
        clipId,
        userId,
        configId: providerConfig.id,
        status: 'RUNNING',
        guideVersion: 'v1.0',
        inputSnapshot,
      },
    });

    const startMs = Date.now();

    try {
      // 6. Call LLM adapter
      const adapter = this.factory.build(providerConfig);
      let result = await adapter.generateStructured(
        this.guideContent,
        userPrompt,
        PROMPT_OUTPUT_SCHEMA,
      );

      // 7. Validate — one repair attempt if videoPrompt is missing
      if (!result.parsed?.videoPrompt) {
        this.logger.warn(
          `Run ${run.id}: initial response missing videoPrompt, attempting repair`,
        );
        const repairPrompt = `${userPrompt}\n\nYour previous response was missing the required 'videoPrompt' field. Please respond with a complete JSON object containing all required fields.`;
        result = await adapter.generateStructured(
          this.guideContent,
          repairPrompt,
          PROMPT_OUTPUT_SCHEMA,
        );
        if (!result.parsed?.videoPrompt) {
          throw new Error('LLM failed to produce a valid videoPrompt after repair attempt');
        }
      }

      const p = result.parsed as Record<string, string | undefined>;

      // 8. Compile videoPrompt: replace [displayName] tokens with externalId
      const compiledVideoPrompt = this.compilePrompt(
        p.videoPrompt ?? '',
        entityMap,
      );

      // 9. Save completed run
      const completed = await this.prisma.generationRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          rawResponse: result.raw,
          imagePrompt: p.imagePrompt ?? null,
          videoPrompt: p.videoPrompt ?? null,
          voicePrompt: p.voicePrompt ?? null,
          audioPrompt: p.audioPrompt ?? null,
          negativePrompt: p.negativePrompt ?? null,
          compiledVideoPrompt,
          promptStatus: 'DRAFT',
          inputTokens: result.inputTokens ?? null,
          outputTokens: result.outputTokens ?? null,
          durationMs: Date.now() - startMs,
        },
        include: { config: true },
      });

      return this.toRunDto(completed);
    } catch (err: any) {
      await this.prisma.generationRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          errorMessage: err?.message ?? String(err),
          durationMs: Date.now() - startMs,
        },
      });
      throw new InternalServerErrorException(
        `LLM generation failed: ${err?.message ?? String(err)}`,
      );
    }
  }

  // ── List Runs ─────────────────────────────────────────────────────────────

  async listRuns(seriesId: string, clipId: string) {
    const items = await this.prisma.generationRun.findMany({
      where: { clipId, seriesId },
      orderBy: { createdAt: 'desc' },
      include: { config: true },
    });
    return { items: items.map(r => this.toRunDto(r)), total: items.length };
  }

  // ── Accept Prompts ────────────────────────────────────────────────────────

  async acceptPrompts(
    seriesId: string,
    clipId: string,
    dto: AcceptPromptsDto,
  ) {
    const run = await this.prisma.generationRun.findFirst({
      where: { id: dto.runId, clipId, seriesId },
    });
    if (!run) throw new NotFoundException('GenerationRun not found');
    if (run.status !== 'COMPLETED') {
      throw new BadRequestException('Only COMPLETED runs can be accepted');
    }

    // Use overrides from dto, or fall back to run fields
    const imagePrompt = dto.imagePrompt ?? run.imagePrompt ?? undefined;
    const videoPrompt = dto.videoPrompt ?? run.videoPrompt ?? undefined;
    const voicePrompt = dto.voicePrompt ?? run.voicePrompt ?? undefined;
    const audioPrompt = dto.audioPrompt ?? run.audioPrompt ?? undefined;
    const negativePrompt = dto.negativePrompt ?? run.negativePrompt ?? undefined;

    // Persist onto Clip
    await this.prisma.clip.update({
      where: { id: clipId },
      data: {
        imagePrompt: imagePrompt ?? null,
        videoPrompt: videoPrompt ?? null,
        voicePrompt: voicePrompt ?? null,
        audioPrompt: audioPrompt ?? null,
        negativePrompt: negativePrompt ?? null,
        status: 'READY',
      },
    });

    // Mark run as ACCEPTED
    const updated = await this.prisma.generationRun.update({
      where: { id: run.id },
      data: { promptStatus: 'ACCEPTED' },
      include: { config: true },
    });

    return this.toRunDto(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildUserPrompt(
    clip: any,
    scene: any,
    episode: any,
    series: any,
    entityMap: Map<string, string | null>,
  ): string {
    const entities = [...entityMap.keys()];

    const entitySection = entities.length
      ? entities
          .map(name => {
            const e = clip.characters.find((c: any) => c.entity.displayName === name)?.entity;
            if (!e) return `- ${name}`;
            const v = e.effectiveVersion;
            const parts = [name, e.type, e.subtitle].filter(Boolean).join(' | ');
            const details = [
              v ? `Story version: ${v.name}` : null,
              v?.description ?? e.visualDescription ?? e.description,
              `Age: ${v?.age ?? e.age ?? 20}`,
              (v?.ethnicity ?? e.ethnicity)
                ? `Ethnicity: ${v?.ethnicity ?? e.ethnicity}`
                : null,
              `Skin tone: ${v?.skinTone ?? e.skinTone ?? 'Fitzpatrick Type II Pinkish-ivory skin'}`,
              (v?.facialFeatures ?? e.facialFeatures)
                ? `Facial features: ${v?.facialFeatures ?? e.facialFeatures}`
                : null,
              (v?.visualSilhouetteDress ?? e.visualSilhouetteDress)
                ? `Visual silhouette & dress: ${v?.visualSilhouetteDress ?? e.visualSilhouetteDress}`
                : null,
              (v?.costumeDescription ?? e.costumeDescription)
                ? `Costume: ${v?.costumeDescription ?? e.costumeDescription}`
                : null,
              (v?.voiceProfile ?? e.voiceProfile)
                ? `Voice profile: ${v?.voiceProfile ?? e.voiceProfile}`
                : null,
              v?.generatedPrompt
                ? `Canonical version prompt: ${v.generatedPrompt}`
                : e.imagePrompt
                  ? `Canonical base prompt: ${e.imagePrompt}`
                  : null,
            ].filter(Boolean);
            return `- ${parts}${details.length ? `\n  ${details.join('\n  ')}` : ''}`;
          })
          .join('\n')
      : 'None specified';

    const assetSection = clip.assetLinks.length
      ? clip.assetLinks.map((al: any) => `- ${al.asset.title} (${al.asset.type})`).join('\n')
      : 'None';

    return `Generate cinematic production prompts for the following clip.

═══ SERIES ═══
Title: ${series.name}
Premise: ${series.premise || 'Not specified'}

═══ EPISODE ═══
${episode.number ? `Episode ${episode.number}: ` : ''}${episode.title}
${episode.synopsis ? `Synopsis: ${episode.synopsis}` : ''}

═══ SCENE ═══
${scene.number ? `Scene ${scene.number}: ` : ''}${scene.title}
${scene.summary ? `Summary: ${scene.summary}` : ''}
${scene.timeOfDay ? `Time of Day: ${scene.timeOfDay}` : ''}
Interior: ${scene.interior ? 'Yes' : 'No'}

═══ CLIP ═══
Title: ${clip.title}
Story Beat: ${clip.storyBeat || 'Not specified'}
${clip.action ? `Action: ${clip.action}` : ''}
${clip.dialogue ? `Dialogue: ${clip.dialogue}` : ''}
${clip.emotion ? `Emotion/Tone: ${clip.emotion}` : ''}
Target Duration: ${clip.targetDurationSec}s

Camera Shot: ${clip.cameraShot || 'Not specified'}
Camera Angle: ${clip.cameraAngle || 'Not specified'}
Camera Movement: ${clip.cameraMovement || 'Not specified'}
Composition: ${clip.composition || 'Not specified'}
Lens: ${clip.lens || 'Not specified'}
Lighting: ${clip.lighting || 'Not specified'}

Voice Notes: ${clip.voiceNotes || 'None'}
Ambient Audio: ${clip.ambientAudio || 'None'}
SFX: ${clip.sfx || 'None'}
Music: ${clip.music || 'None'}

═══ ENTITIES IN CLIP ═══
${entitySection}
(Use entity names in [brackets] within your prompts, e.g. [${entities[0] ?? 'CharacterName'}])

═══ LINKED ASSETS ═══
${assetSection}

═══ OUTPUT FORMAT ═══
Return a JSON object with EXACTLY these fields:
{
  "imagePrompt": "...",
  "videoPrompt": "...",
  "voicePrompt": "...",
  "audioPrompt": "...",
  "negativePrompt": "..."
}`;
  }

  /**
   * Replaces [displayName] tokens in a prompt with the entity's externalId.
   * If externalId is null, the displayName is left as-is.
   */
  private async buildStoryOrder(seriesId: string) {
    const seasons = await this.prisma.season.findMany({
      where: { seriesId },
      orderBy: [{ position: 'asc' }, { number: 'asc' }],
      include: {
        episodes: {
          orderBy: [{ position: 'asc' }, { number: 'asc' }],
          include: {
            acts: {
              orderBy: [{ position: 'asc' }, { number: 'asc' }],
              include: {
                scenes: {
                  orderBy: [{ position: 'asc' }, { number: 'asc' }],
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    const order = new Map<string, number>();
    let index = 1;
    for (const season of seasons) {
      order.set(`SEASON:${season.id}`, index++);
      for (const episode of season.episodes) {
        order.set(`EPISODE:${episode.id}`, index++);
        for (const act of episode.acts) {
          order.set(`ACT:${act.id}`, index++);
          for (const scene of act.scenes) {
            order.set(`SCENE:${scene.id}`, index++);
            order.set(`END:SCENE:${scene.id}`, index - 1);
          }
          order.set(`END:ACT:${act.id}`, index - 1);
        }
        order.set(`END:EPISODE:${episode.id}`, index - 1);
      }
      order.set(`END:SEASON:${season.id}`, index - 1);
    }
    return order;
  }

  private resolveCharacterVersion(
    versions: any[],
    order: Map<string, number>,
    targetOrder: number,
  ) {
    return versions
      .map(version => ({
        version,
        start:
          version.startType === 'SERIES'
            ? 0
            : order.get(`${version.startType}:${version.startId}`) ??
              Number.POSITIVE_INFINITY,
        end: !version.endType
          ? Number.POSITIVE_INFINITY
          : version.endType === 'SERIES'
            ? Number.POSITIVE_INFINITY
            : order.get(`END:${version.endType}:${version.endId}`) ?? -1,
      }))
      .filter(item => item.start <= targetOrder && targetOrder <= item.end)
      .sort(
        (a, b) =>
          b.start - a.start || b.version.position - a.version.position,
      )[0]?.version;
  }

  private compilePrompt(
    prompt: string,
    entityMap: Map<string, string | null>,
  ): string {
    let compiled = prompt;
    for (const [displayName, externalId] of entityMap.entries()) {
      if (externalId) {
        compiled = compiled.replaceAll(`[${displayName}]`, externalId);
      }
    }
    return compiled;
  }

  private toRunDto(run: any) {
    return {
      runId: run.id,
      clipId: run.clipId,
      status: run.status,
      imagePrompt: run.imagePrompt ?? undefined,
      videoPrompt: run.videoPrompt ?? undefined,
      voicePrompt: run.voicePrompt ?? undefined,
      audioPrompt: run.audioPrompt ?? undefined,
      negativePrompt: run.negativePrompt ?? undefined,
      compiledVideoPrompt: run.compiledVideoPrompt ?? undefined,
      provider: run.config?.provider,
      model: run.config?.model,
      inputTokens: run.inputTokens ?? undefined,
      outputTokens: run.outputTokens ?? undefined,
      durationMs: run.durationMs ?? undefined,
      promptStatus: run.promptStatus,
      errorMessage: run.errorMessage ?? undefined,
      createdAt: run.createdAt.toISOString(),
    };
  }
}

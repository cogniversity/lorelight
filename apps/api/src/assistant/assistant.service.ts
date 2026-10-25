import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmFactoryService } from '../generation/adapters/llm-factory.service';
import { ActivityService } from '../activity/activity.service';
import { ProposalExecutorService } from './handlers/proposal-executor.service';
import { SendMessageDto } from './dto/send-message.dto';

// ── LLM output schema ────────────────────────────────────────────────────────

const ASSISTANT_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'Conversational response to the user' },
    proposals: {
      type: 'array',
      description: 'Typed content proposals (create or update only — no deletes)',
      items: {
        type: 'object',
        required: ['commandType', 'entityType', 'targetPath', 'payload', 'humanReadable'],
        properties: {
          commandType: { type: 'string' },
          entityType: { type: 'string' },
          targetPath: { type: 'object' },
          payload: { type: 'object' },
          humanReadable: { type: 'string', description: 'One sentence describing what this will create/update' },
        },
      },
    },
  },
  required: ['message'],
};

const SYSTEM_PROMPT = `You are Lorelight Assistant, an expert story development AI embedded in the Lorelight Story Production OS.

Your purpose is to help the writer build and develop their story series by:
- Suggesting scenes, characters, dialogue, world-building elements
- Drafting script blocks, episode synopses, act outlines
- Proposing structured edits to existing content

CRITICAL SAFETY RULES:
1. You CANNOT delete anything. If the user asks you to delete something, explain that deletions require manual action.
2. You MUST emit proposals as structured JSON. Never modify content in your text response — only in the proposals array.
3. Every proposal must reference the correct parent IDs from the context provided.
4. Use ONLY the following commandTypes: CREATE_SEASON, UPDATE_SEASON, CREATE_EPISODE, UPDATE_EPISODE, CREATE_ACT, UPDATE_ACT, CREATE_SCENE, UPDATE_SCENE, CREATE_SCRIPT_BLOCK, UPDATE_SCRIPT_BLOCK, CREATE_CLIP, UPDATE_CLIP, CREATE_WORLD_ENTITY, UPDATE_WORLD_ENTITY, APPEND_DRAFT_MANUSCRIPT, UPDATE_DRAFT_MANUSCRIPT, CREATE_BIBLE_ENTRY, UPDATE_BIBLE_ENTRY.
5. Set targetPath to an object with the exact parent IDs (e.g. {"actId": "...", "seasonId": "...", "episodeId": "..."}).
6. The humanReadable field must be a single clear sentence summarising the proposal for the user to review.

OUTPUT FORMAT:
Always respond with valid JSON:
{
  "message": "Your conversational response here",
  "proposals": [
    {
      "commandType": "CREATE_SCENE",
      "entityType": "scene",
      "targetPath": {"actId": "act-id", "episodeId": "ep-id", "seasonId": "season-id"},
      "payload": {"number": 1, "title": "The Meeting", "summary": "..."},
      "humanReadable": "Create scene 'The Meeting' in Act I of Episode 1"
    }
  ]
}`;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llmFactory: LlmFactoryService,
    private readonly activity: ActivityService,
    private readonly executor: ProposalExecutorService,
  ) {}

  // ── Thread management ────────────────────────────────────────────────────

  async getOrCreateThread(seriesId: string, userId: string) {
    let thread = await this.prisma.chatThread.findFirst({
      where: { seriesId, userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (!thread) {
      thread = await this.prisma.chatThread.create({
        data: { seriesId, userId, title: 'New conversation' },
      });
    }

    return this.toThreadDto(thread);
  }

  async listThreads(seriesId: string, userId: string) {
    const threads = await this.prisma.chatThread.findMany({
      where: { seriesId, userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return threads.map((t) => this.toThreadDto(t));
  }

  async getMessages(seriesId: string, threadId: string) {
    const thread = await this.findThreadOrFail(seriesId, threadId);
    const messages = await this.prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      include: {
        proposals: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => this.toMessageDto(m));
  }

  // ── Send a message ────────────────────────────────────────────────────────

  async sendMessage(
    seriesId: string,
    userId: string,
    threadId: string,
    dto: SendMessageDto,
  ) {
    const thread = await this.findThreadOrFail(seriesId, threadId);

    // 1. Persist user message
    const userMsg = await this.prisma.chatMessage.create({
      data: { threadId: thread.id, seriesId, role: 'USER', content: dto.content },
    });

    // 2. Build context
    const context = await this.buildContext(seriesId, dto.routeContext);

    // 3. Retrieve conversation history (last 10 messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { threadId: thread.id, id: { not: userMsg.id } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    history.reverse();

    // 4. Compose prompt
    const conversationPart = history
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const fullUserPrompt = `${context}\n\n---\nCONVERSATION HISTORY:\n${conversationPart || '(new conversation)'}\n\nUSER: ${dto.content}`;

    // 5. Get provider config (series-scoped or global)
    const providerConfig = await this.prisma.llmProviderConfig.findFirst({
      where: {
        isActive: true,
        OR: [{ seriesId }, { seriesId: null }],
      },
      orderBy: [{ seriesId: 'desc' }, { createdAt: 'asc' }],
    });

    let assistantContent = 'I understand your request.';
    let rawProposals: any[] = [];

    if (providerConfig) {
      try {
        const adapter = this.llmFactory.build(providerConfig);
        const result = await adapter.generateStructured(
          SYSTEM_PROMPT,
          fullUserPrompt,
          ASSISTANT_OUTPUT_SCHEMA,
        );

        const parsed = result.parsed as { message?: string; proposals?: any[] };
        assistantContent = parsed?.message ?? assistantContent;
        rawProposals = parsed?.proposals ?? [];
      } catch (err: any) {
        this.logger.warn(`LLM call failed: ${err?.message}`);
        assistantContent = `I'm sorry, I encountered an issue contacting the LLM provider. Please check your provider configuration. (${err?.message ?? 'Unknown error'})`;
      }
    } else {
      assistantContent =
        'No LLM provider is configured for this series. Please add one in Settings → LLM Providers to enable AI assistance.';
    }

    // 6. Persist assistant message
    const assistantMsg = await this.prisma.chatMessage.create({
      data: { threadId: thread.id, seriesId, role: 'ASSISTANT', content: assistantContent },
    });

    // 7. Persist proposals (if any)
    const proposals = await Promise.all(
      rawProposals.map((p: any) =>
        this.prisma.changeProposal.create({
          data: {
            seriesId,
            threadId: thread.id,
            messageId: assistantMsg.id,
            actorId: userId,
            commandType: String(p.commandType ?? ''),
            entityType: String(p.entityType ?? ''),
            targetPath: p.targetPath ?? {},
            payload: p.payload ?? {},
            humanReadable: String(p.humanReadable ?? ''),
            providerConfigId: providerConfig?.id ?? null,
            promptSnapshot: dto.content.slice(0, 500),
          },
        }),
      ),
    );

    // 8. Update thread title from first user message
    if (!thread.title || thread.title === 'New conversation') {
      await this.prisma.chatThread.update({
        where: { id: thread.id },
        data: { title: dto.content.slice(0, 60) },
      });
    }

    await this.prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    await this.activity.log(
      seriesId, userId, 'ASSISTANT_MESSAGE', 'thread', thread.id,
      `Assistant message sent; ${proposals.length} proposal(s)`,
    );

    return {
      message: this.toMessageDto({ ...assistantMsg, proposals }),
      proposals: proposals.map((p) => this.toProposalDto(p)),
    };
  }

  // ── Approve a proposal ────────────────────────────────────────────────────

  async approveProposal(seriesId: string, userId: string, proposalId: string) {
    const proposal = await this.prisma.changeProposal.findFirst({
      where: { id: proposalId, seriesId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== 'PENDING') {
      throw new ConflictException(`Proposal is already '${proposal.status}' and cannot be approved.`);
    }

    // Mark APPROVED (reserving the slot, preventing double-approval race)
    await this.prisma.changeProposal.update({
      where: { id: proposalId },
      data: { status: 'APPROVED' },
    });

    try {
      const { appliedRecordId, afterSnap } = await this.executor.execute(
        proposal, userId, seriesId,
      );

      const updated = await this.prisma.changeProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPLIED',
          appliedRecordId,
          afterSnap: afterSnap as any,
        },
      });

      return {
        proposal: this.toProposalDto(updated),
        appliedRecordId,
      };
    } catch (err: any) {
      // Roll back to FAILED so the user can see the error
      const updated = await this.prisma.changeProposal.update({
        where: { id: proposalId },
        data: {
          status: 'FAILED',
          validationErrors: err?.message ?? String(err),
        },
      });
      throw new BadRequestException(
        `Proposal execution failed: ${err?.message ?? String(err)}`,
      );
    }
  }

  // ── Reject a proposal ─────────────────────────────────────────────────────

  async rejectProposal(seriesId: string, proposalId: string) {
    const proposal = await this.prisma.changeProposal.findFirst({
      where: { id: proposalId, seriesId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.status !== 'PENDING') {
      throw new ConflictException(`Proposal is already '${proposal.status}'.`);
    }

    const updated = await this.prisma.changeProposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
    });

    return { proposal: this.toProposalDto(updated) };
  }

  // ── New thread ────────────────────────────────────────────────────────────

  async newThread(seriesId: string, userId: string) {
    const thread = await this.prisma.chatThread.create({
      data: { seriesId, userId, title: 'New conversation' },
    });
    return this.toThreadDto(thread);
  }

  // ── Context builder ───────────────────────────────────────────────────────

  private async buildContext(
    seriesId: string,
    routeContext?: SendMessageDto['routeContext'],
  ): Promise<string> {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new NotFoundException('Series not found');

    const lines: string[] = [
      `=== SERIES CONTEXT ===`,
      `Series: ${series.name}`,
      `Premise: ${series.premise || 'Not set'}`,
    ];

    // World entities (brief)
    const entities = await this.prisma.worldEntity.findMany({
      where: { seriesId },
      select: { type: true, displayName: true, externalId: true, status: true },
      take: 30,
    });
    if (entities.length) {
      lines.push('\nWORLD ENTITIES:');
      for (const e of entities) {
        lines.push(`  [${e.type}] ${e.displayName}${e.externalId ? ` (${e.externalId})` : ''}`);
      }
    }

    // Story structure (lightweight)
    const seasons = await this.prisma.season.findMany({
      where: { seriesId },
      include: {
        episodes: {
          include: {
            acts: {
              include: {
                scenes: { select: { id: true, number: true, title: true }, orderBy: { position: 'asc' } },
              },
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
      take: 4,
    });

    if (seasons.length) {
      lines.push('\nSTORY STRUCTURE (use these IDs in targetPath):');
      for (const s of seasons) {
        lines.push(`  Season ${s.number}: ${s.title} [seasonId: ${s.id}]`);
        for (const ep of s.episodes) {
          lines.push(`    Episode ${ep.number}: ${ep.title} [episodeId: ${ep.id}]`);
          for (const act of ep.acts) {
            lines.push(`      Act ${act.number}: ${act.title} [actId: ${act.id}]`);
            for (const sc of act.scenes) {
              lines.push(`        Scene ${sc.number}: ${sc.title} [sceneId: ${sc.id}]`);
            }
          }
        }
      }
    }

    // Draft manuscript snippet
    const draft = await this.prisma.sourceManuscript.findUnique({ where: { seriesId } });
    if (draft?.content) {
      lines.push('\nDRAFT MANUSCRIPT (first 1000 chars):');
      lines.push(draft.content.slice(0, 1000));
      lines.push(`[revisionNum: ${draft.revisionNum}]`);
    }

    // Route-specific context
    if (routeContext?.sceneId) {
      const scene = await this.prisma.scene.findFirst({
        where: { id: routeContext.sceneId, act: { episode: { season: { seriesId } } } },
        include: {
          scriptBlocks: { orderBy: { position: 'asc' }, take: 20 },
          clips: { orderBy: { position: 'asc' }, take: 10 },
        },
      });
      if (scene) {
        lines.push(`\nCURRENT PAGE CONTEXT — Scene: ${scene.title}`);
        lines.push(`Script blocks: ${scene.scriptBlocks.length}, Clips: ${scene.clips.length}`);
      }
    } else if (routeContext?.episodeId) {
      const ep = await this.prisma.episode.findFirst({
        where: { id: routeContext.episodeId, season: { seriesId } },
      });
      if (ep) lines.push(`\nCURRENT PAGE CONTEXT — Episode: ${ep.title}`);
    }

    return lines.join('\n');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async findThreadOrFail(seriesId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, seriesId },
    });
    if (!thread) throw new NotFoundException('Chat thread not found');
    return thread;
  }

  private toThreadDto(t: any) {
    return {
      id: t.id,
      seriesId: t.seriesId,
      userId: t.userId,
      title: t.title,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private toMessageDto(m: any) {
    return {
      id: m.id,
      threadId: m.threadId,
      seriesId: m.seriesId,
      role: m.role,
      content: m.content,
      proposals: (m.proposals ?? []).map((p: any) => this.toProposalDto(p)),
      createdAt: m.createdAt.toISOString(),
    };
  }

  private toProposalDto(p: any) {
    return {
      id: p.id,
      seriesId: p.seriesId,
      threadId: p.threadId,
      messageId: p.messageId,
      status: p.status,
      commandType: p.commandType,
      entityType: p.entityType,
      targetPath: p.targetPath ?? {},
      payload: p.payload ?? {},
      beforeSnap: p.beforeSnap ?? null,
      afterSnap: p.afterSnap ?? null,
      validationErrors: p.validationErrors ?? null,
      appliedRecordId: p.appliedRecordId ?? null,
      humanReadable: p.humanReadable ?? '',
      createdAt: p.createdAt.toISOString(),
    };
  }
}

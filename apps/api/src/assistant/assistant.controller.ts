import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SeriesRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SeriesMemberGuard } from '../common/guards/series-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AssistantService } from './assistant.service';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeriesMemberGuard)
@Controller('series/:seriesId/assistant')
export class AssistantController {
  constructor(private readonly svc: AssistantService) {}

  // ── Thread management ────────────────────────────────────────────────────

  @Get('thread')
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'Get or create the active chat thread for this user + series' })
  @ApiParam({ name: 'seriesId' })
  getOrCreateThread(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.getOrCreateThread(seriesId, userId);
  }

  @Post('thread/new')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new chat thread (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  newThread(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.newThread(seriesId, userId);
  }

  @Get('threads')
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'List all threads for this user + series' })
  @ApiParam({ name: 'seriesId' })
  listThreads(
    @Param('seriesId') seriesId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.listThreads(seriesId, userId);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get('threads/:threadId/messages')
  @Roles(SeriesRole.VIEWER)
  @ApiOperation({ summary: 'Get all messages in a thread (VIEWER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'threadId' })
  getMessages(
    @Param('seriesId') seriesId: string,
    @Param('threadId') threadId: string,
  ) {
    return this.svc.getMessages(seriesId, threadId);
  }

  @Post('threads/:threadId/messages')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message to the assistant (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'threadId' })
  sendMessage(
    @Param('seriesId') seriesId: string,
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendMessage(seriesId, userId, threadId, dto);
  }

  // ── Proposal actions ──────────────────────────────────────────────────────

  @Post('proposals/:proposalId/approve')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve and apply a proposal (WRITER+). Re-validates series ancestry and executes in a transaction.',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'proposalId' })
  approveProposal(
    @Param('seriesId') seriesId: string,
    @Param('proposalId') proposalId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.approveProposal(seriesId, userId, proposalId);
  }

  @Post('proposals/:proposalId/reject')
  @Roles(SeriesRole.WRITER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending proposal (WRITER+)' })
  @ApiParam({ name: 'seriesId' })
  @ApiParam({ name: 'proposalId' })
  rejectProposal(
    @Param('seriesId') seriesId: string,
    @Param('proposalId') proposalId: string,
  ) {
    return this.svc.rejectProposal(seriesId, proposalId);
  }
}

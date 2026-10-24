import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SeriesMemberGuard } from '../common/guards/series-member.guard';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SeriesMemberGuard)
@Controller('series/:seriesId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary:
      'Full-text search across world entities, episodes, scenes, clips, bible entries and assets',
  })
  @ApiParam({ name: 'seriesId' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (1-50, default 10)' })
  search(
    @Param('seriesId') seriesId: string,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.search(seriesId, query.q, query.limit);
  }
}

import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingsService } from '../listings/listings.service';
import { RecommendationQueryDto, SaveSearchDto } from './dto/saved-search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get('suggestions')
  suggestions(@Query('q') q?: string) {
    return this.listingsService.searchSuggestions(q ?? '');
  }

  @Get('popular')
  popular() {
    return this.listingsService.popularSearches();
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved')
  saved(@CurrentUser() user: User) {
    return this.listingsService.listSavedSearches(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('saved')
  save(@CurrentUser() user: User, @Body() dto: SaveSearchDto) {
    return this.listingsService.saveSearch(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('saved/:id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.listingsService.removeSavedSearch(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommended')
  recommended(@CurrentUser() user: User, @Query() query: RecommendationQueryDto) {
    return this.listingsService.recommendedSearchFeed(user, query);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ListingsService } from '../listings/listings.service';

@Controller('search')
export class SearchController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get('suggestions')
  suggestions(@Query('q') q?: string) {
    return this.listingsService.searchSuggestions(q ?? '');
  }
}


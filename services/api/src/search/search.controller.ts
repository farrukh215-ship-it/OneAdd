import { Controller, Get, ParseIntPipe, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { SearchService } from "./search.service";

@ApiTags("search")
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("suggestions")
  suggestions(
    @Req() request: Request,
    @Query("q") query = "",
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.searchService.getSuggestions(request, query, limit);
  }
}

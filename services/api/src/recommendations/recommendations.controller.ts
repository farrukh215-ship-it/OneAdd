import { Controller, Get, ParseIntPipe, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RecommendationsService } from "./recommendations.service";

@ApiTags("recommendations")
@Controller("recommendations")
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get("feed")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  feed(
    @Req() request: Request,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.recommendationsService.getFeed(String(request.user?.sub), limit);
  }
}

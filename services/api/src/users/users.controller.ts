import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TrustScoreService } from "../trust-score/trust-score.service";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly trustScoreService: TrustScoreService,
    private readonly usersService: UsersService
  ) {}

  @Get(":id/trust-score")
  async getTrustScore(@Param("id") userId: string) {
    const trustScore = await this.trustScoreService.getTrustScore(userId);
    if (!trustScore) {
      throw new NotFoundException("Trust score not found for this user.");
    }
    return trustScore;
  }

  @Get("me/saved")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getSaved(
    @Req() request: Request,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.usersService.getSavedListings(String(request.user?.sub), limit);
  }

  @Post("me/saved/:listingId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  saveListing(@Req() request: Request, @Param("listingId") listingId: string) {
    return this.usersService.saveListing(String(request.user?.sub), listingId);
  }

  @Delete("me/saved/:listingId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unsaveListing(@Req() request: Request, @Param("listingId") listingId: string) {
    return this.usersService.unsaveListing(String(request.user?.sub), listingId);
  }

  @Get("me/recent")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getRecent(
    @Req() request: Request,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.usersService.getRecentlyViewedListings(String(request.user?.sub), limit);
  }

  @Post("me/recent/:listingId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markRecent(@Req() request: Request, @Param("listingId") listingId: string) {
    return this.usersService.markRecentlyViewed(String(request.user?.sub), listingId);
  }
}

import {
  Body,
  Controller,
  Get,
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
import { CreateListingDto } from "./dto/create-listing.dto";
import { ListingsService } from "./listings.service";

@ApiTags("listings")
@Controller("listings")
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get("feed")
  feed(@Query("limit", new ParseIntPipe({ optional: true })) limit?: number) {
    return this.listingsService.getFeed(limit);
  }

  @Get("search")
  search(
    @Query("q") query: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.listingsService.search(query ?? "", limit);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myListings(@Req() request: Request) {
    return this.listingsService.getMyListings(String(request.user?.sub));
  }

  @Get(":id")
  detail(@Param("id") listingId: string) {
    return this.listingsService.getListingById(listingId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(@Req() request: Request, @Body() dto: CreateListingDto) {
    return this.listingsService.createListing(String(request.user?.sub), dto);
  }

  @Post(":id/activate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  activate(@Req() request: Request, @Param("id") listingId: string) {
    return this.listingsService.activateListing(
      String(request.user?.sub),
      listingId
    );
  }

  @Post(":id/mark-sold")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markSold(@Req() request: Request, @Param("id") listingId: string) {
    return this.listingsService.markListingSold(String(request.user?.sub), listingId);
  }

  @Post(":id/deactivate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deactivate(@Req() request: Request, @Param("id") listingId: string) {
    return this.listingsService.deactivateListing(
      String(request.user?.sub),
      listingId
    );
  }
}

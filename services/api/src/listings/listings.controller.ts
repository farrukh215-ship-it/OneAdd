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

  @Get("categories")
  categories() {
    return this.listingsService.getCategoryCatalog();
  }

  @Get("search")
  search(
    @Query("q") query: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("category") category?: string,
    @Query("city") city?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("negotiable") negotiable?: string
  ) {
    const parsedMinPrice =
      typeof minPrice === "string" && minPrice.length > 0
        ? Number(minPrice)
        : undefined;
    const parsedMaxPrice =
      typeof maxPrice === "string" && maxPrice.length > 0
        ? Number(maxPrice)
        : undefined;

    return this.listingsService.search(query ?? "", limit, {
      category,
      city,
      minPrice:
        typeof parsedMinPrice === "number" && Number.isFinite(parsedMinPrice)
          ? parsedMinPrice
          : undefined,
      maxPrice:
        typeof parsedMaxPrice === "number" && Number.isFinite(parsedMaxPrice)
          ? parsedMaxPrice
          : undefined,
      isNegotiable:
        negotiable === "true" ? true : negotiable === "false" ? false : undefined
    });
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

  @Get(":id/offers")
  offers(
    @Param("id") listingId: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.listingsService.getListingOffers(listingId, limit ?? 20);
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

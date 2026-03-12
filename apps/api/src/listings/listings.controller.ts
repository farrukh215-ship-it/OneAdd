import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingFilterDto } from './dto/listing-filter.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateListingMessageDto } from './dto/create-listing-message.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.id, dto);
  }

  @Get()
  findAll(@Query() filter: ListingFilterDto) {
    return this.listingsService.findAll(filter);
  }

  @Get('featured')
  featured() {
    return this.listingsService.featured();
  }

  @Get('by-category/:slug')
  byCategory(@Param('slug') slug: string, @Query() filter: ListingFilterDto) {
    return this.listingsService.byCategory(slug, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  mine(@CurrentUser() user: User, @Query() filter: ListingFilterDto) {
    return this.listingsService.mine(user, filter);
  }

  @UseGuards(JwtAuthGuard)
  @Get('saved')
  saved(@CurrentUser() user: User) {
    return this.listingsService.saved(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/contact')
  contact(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.contact(id, user);
  }

  @Get(':id/chat')
  publicChat(@Param('id') id: string) {
    return this.listingsService.getPublicThread(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/chat/messages')
  postPublicMessage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateListingMessageDto,
  ) {
    return this.listingsService.postMessage(id, user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/offers')
  postOffer(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateOfferDto,
  ) {
    return this.listingsService.placeOffer(id, user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.updateListing(id, user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.remove(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/save')
  save(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.save(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/save')
  unsave(@Param('id') id: string, @CurrentUser() user: User) {
    return this.listingsService.unsave(id, user);
  }
}

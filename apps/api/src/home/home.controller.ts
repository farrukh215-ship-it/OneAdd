import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HomeInsightsQueryDto } from './dto/home-insights.dto';
import { TrackNewsClickDto } from './dto/track-news-click.dto';
import { UpdateHomeWidgetsDto } from './dto/update-home-widgets.dto';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('insights')
  getInsights(@Query() query: HomeInsightsQueryDto, @CurrentUser() user?: User) {
    return this.homeService.getInsights(query, user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('news-click')
  trackNewsClick(@Body() dto: TrackNewsClickDto, @CurrentUser() user?: User) {
    return this.homeService.trackNewsClick(dto, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/widgets')
  adminWidgetSettings(@CurrentUser() user: User) {
    return this.homeService.getAdminWidgetSettings(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/widgets')
  updateWidgetSettings(@CurrentUser() user: User, @Body() dto: UpdateHomeWidgetsDto) {
    return this.homeService.updateWidgetSettings(user, dto);
  }
}

import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("seller/overview")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sellerOverview(@Req() request: Request) {
    return this.analyticsService.getSellerOverview(String(request.user?.sub));
  }

  @Get("forecast/categories")
  categoryForecast() {
    return this.analyticsService.getCategoryForecast();
  }
}

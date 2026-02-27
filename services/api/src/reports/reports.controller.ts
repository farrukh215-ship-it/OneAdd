import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { AdminUserActionDto } from "./dto/admin-user-action.dto";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportActionDto } from "./dto/report-action.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RateLimit({ max: 12, windowSeconds: 60 })
  createReport(@Req() request: Request, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(String(request.user?.sub), dto);
  }

  @Get("queue")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  getQueue() {
    return this.reportsService.getReportsQueue();
  }

  @Patch(":id/action")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  applyAction(
    @Req() request: Request,
    @Param("id") reportId: string,
    @Body() dto: ReportActionDto
  ) {
    return this.reportsService.applyReportAction(
      String(request.user?.sub),
      reportId,
      dto.status
    );
  }

  @Patch("users/:id/suspend")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  suspendUser(
    @Req() request: Request,
    @Param("id") userId: string,
    @Body() dto: AdminUserActionDto
  ) {
    return this.reportsService.suspendUser(
      String(request.user?.sub),
      userId,
      dto.enabled
    );
  }

  @Patch("users/:id/shadow-ban")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  shadowBanUser(
    @Req() request: Request,
    @Param("id") userId: string,
    @Body() dto: AdminUserActionDto
  ) {
    return this.reportsService.shadowBanUser(
      String(request.user?.sub),
      userId,
      dto.enabled
    );
  }

  @Patch("listings/:id/deactivate")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  deactivateListing(
    @Req() request: Request,
    @Param("id") listingId: string
  ) {
    return this.reportsService.deactivateListingByAdmin(
      String(request.user?.sub),
      listingId
    );
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { AdminService } from "../admin/admin.service";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ToggleFeatureFlagDto } from "./dto/toggle-feature-flag.dto";
import { FEATURE_FLAG_KEYS, FeatureFlagKey } from "./feature-flag.keys";
import { FeatureFlagService } from "./feature-flag.service";

@ApiTags("admin-feature-flags")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/feature-flags")
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly adminService: AdminService
  ) {}

  @Get()
  getAll() {
    return this.featureFlagService.getAllFlags();
  }

  @Patch(":key")
  async toggle(
    @Req() request: Request,
    @Param("key") key: string,
    @Body() dto: ToggleFeatureFlagDto
  ) {
    const normalizedKey = key.trim().toUpperCase();
    if (!FEATURE_FLAG_KEYS.includes(normalizedKey as FeatureFlagKey)) {
      throw new BadRequestException("Unsupported feature flag key.");
    }

    const updated = await this.featureFlagService.setFlag(
      normalizedKey as FeatureFlagKey,
      dto.enabled
    );
    await this.adminService.createFeatureFlagAuditLog(
      String(request.user?.sub),
      normalizedKey,
      dto.enabled
    );
    return updated;
  }
}

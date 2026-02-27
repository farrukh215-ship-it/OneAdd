import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ListingStatus } from "@prisma/client";
import { Request } from "express";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { UpsertCategoryDto } from "./dto/upsert-category.dto";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("categories")
  getCategories() {
    return this.adminService.getCategories();
  }

  @Post("categories")
  createCategory(@Req() request: Request, @Body() dto: UpsertCategoryDto) {
    return this.adminService.createCategory(String(request.user?.sub), dto);
  }

  @Patch("categories/:id")
  updateCategory(
    @Req() request: Request,
    @Param("id") categoryId: string,
    @Body() dto: UpsertCategoryDto
  ) {
    return this.adminService.updateCategory(
      String(request.user?.sub),
      categoryId,
      dto
    );
  }

  @Get("listings")
  getListings(@Query("status") status?: ListingStatus) {
    return this.adminService.getListings(status);
  }

  @Get("users")
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get("audit-logs")
  getAuditLogs(
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ) {
    return this.adminService.getAuditLogs(limit);
  }
}

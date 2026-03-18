import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminInspectionDecisionDto } from './dto/admin-inspection-decision.dto';
import { BookInspectionDto } from './dto/book-inspection.dto';
import { InspectionQueueDto } from './dto/inspection-queue.dto';
import { ManageWorkshopDto } from './dto/manage-workshop.dto';
import { PoliceVerifyDto } from './dto/police-verify.dto';
import { RequestInspectionDto } from './dto/request-inspection.dto';
import { SubmitInspectionReportDto } from './dto/submit-inspection-report.dto';
import { WorkshopVerifyDto } from './dto/workshop-verify.dto';
import { InspectionsService } from './inspections.service';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get('workshops')
  workshops(@Query('city') city?: string) {
    return this.inspectionsService.listWorkshops(city);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/workshops')
  adminWorkshops(@CurrentUser() user: User) {
    return this.inspectionsService.adminListWorkshops(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/workshops')
  createWorkshop(@CurrentUser() user: User, @Body() dto: ManageWorkshopDto) {
    return this.inspectionsService.adminCreateWorkshop(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/workshops/:id')
  updateWorkshop(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: ManageWorkshopDto,
  ) {
    return this.inspectionsService.adminUpdateWorkshop(id, user, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('listing/:listingId/summary')
  summaryByListing(@Param('listingId') listingId: string, @CurrentUser() user?: User) {
    return this.inspectionsService.getInspectionByListing(listingId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('request')
  request(@CurrentUser() user: User, @Body() dto: RequestInspectionDto) {
    return this.inspectionsService.requestInspection(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.inspectionsService.getInspection(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/book')
  book(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: BookInspectionDto) {
    return this.inspectionsService.bookInspection(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.WORKSHOP_MANAGER)
  @Post(':id/workshop-verify')
  workshopVerify(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: WorkshopVerifyDto,
  ) {
    return this.inspectionsService.workshopVerify(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.POLICE_OFFICER)
  @Post(':id/police-verify')
  policeVerify(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: PoliceVerifyDto,
  ) {
    return this.inspectionsService.policeVerify(id, user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  submitReport(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SubmitInspectionReportDto,
  ) {
    return this.inspectionsService.submitReport(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/queue')
  queue(@CurrentUser() user: User, @Query() query: InspectionQueueDto) {
    return this.inspectionsService.adminQueue(user, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/admin-approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AdminInspectionDecisionDto,
  ) {
    return this.inspectionsService.adminApprove(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post(':id/admin-reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AdminInspectionDecisionDto,
  ) {
    return this.inspectionsService.adminReject(id, user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/expire-stale')
  expireStale() {
    return this.inspectionsService.expireStaleRequests();
  }
}

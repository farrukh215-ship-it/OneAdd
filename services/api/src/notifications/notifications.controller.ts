import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("device-tokens")
  registerDeviceToken(@Req() request: Request, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(
      String(request.user?.sub),
      dto.token,
      dto.platform
    );
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { SignMediaUrlDto } from "./dto/sign-media-url.dto";
import { VerifyMediaUrlDto } from "./dto/verify-media-url.dto";
import { MediaService } from "./media.service";

@ApiTags("media")
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("sign-url")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @RateLimit({ max: 20, windowSeconds: 60 })
  signUrl(@Body() dto: SignMediaUrlDto) {
    return this.mediaService.signUploadUrl(dto);
  }

  @Get("verify")
  verify(@Query() query: VerifyMediaUrlDto) {
    return this.mediaService.verifySignedUrl(query);
  }
}

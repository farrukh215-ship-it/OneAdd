import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { SignMediaUrlDto } from "./dto/sign-media-url.dto";
import { UploadMediaFileDto } from "./dto/upload-media-file.dto";
import { VerifyMediaUrlDto } from "./dto/verify-media-url.dto";
import { MediaService } from "./media.service";

type UploadedMediaFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

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

  @Post("upload")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 50 * 1024 * 1024 }
    })
  )
  uploadFile(
    @UploadedFile() file: UploadedMediaFile | undefined,
    @Body() body: UploadMediaFileDto & { durationSec?: string }
  ) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }

    const durationSec =
      typeof body.durationSec === "string"
        ? Number.parseInt(body.durationSec, 10)
        : body.durationSec;

    return this.mediaService.uploadMediaFile(file, {
      mediaType: body.mediaType,
      durationSec: Number.isFinite(durationSec as number) ? durationSec : undefined
    });
  }

  @Get("files/:filename")
  async getUploadedFile(
    @Param("filename") filename: string,
    @Res() response: Response,
    @Query("download", new ParseIntPipe({ optional: true })) download?: number
  ) {
    const file = await this.mediaService.getUploadedFile(filename);
    if (download === 1) {
      response.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    }
    response.setHeader("Content-Type", file.mimeType);
    response.sendFile(file.absolutePath);
  }
}

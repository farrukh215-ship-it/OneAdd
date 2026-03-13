import {
  Body,
  Controller,
  Get,
  Header,
  Query,
  Res,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresignUploadDto, UploadKind } from './dto/presign-upload.dto';
import { UploadsService } from './uploads.service';

type UploadedBinaryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('r2/presign')
  presign(@CurrentUser() user: User, @Body() dto: PresignUploadDto) {
    return this.uploadsService.createPresignedUploads(user.id, dto.files);
  }

  @Get('file')
  @Header('Cross-Origin-Resource-Policy', 'same-origin')
  async getFile(@Query('key') key: string, @Res() res: Response) {
    const asset = await this.uploadsService.getPublicAsset(key);
    res.setHeader('Content-Type', asset.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', asset.cacheControl || 'public, max-age=86400');
    if (typeof asset.contentLength === 'number') {
      res.setHeader('Content-Length', String(asset.contentLength));
    }
    res.send(asset.body);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 45 * 1024 * 1024,
      },
    }),
  )
  @Post('proxy')
  uploadProxy(
    @CurrentUser() user: User,
    @UploadedFile() file: UploadedBinaryFile,
    @Body('kind') kind?: UploadKind,
  ) {
    return this.uploadsService.uploadFile(user.id, file, kind);
  }
}

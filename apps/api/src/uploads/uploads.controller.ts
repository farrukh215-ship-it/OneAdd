import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
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

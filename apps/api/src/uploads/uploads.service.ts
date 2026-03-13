import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignUploadFileDto, UploadKind } from './dto/presign-upload.dto';

type UploadedBinaryFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type PresignedUpload = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  kind: UploadKind;
  mimeType: string;
};

@Injectable()
export class UploadsService {
  private readonly bucket = process.env.CLOUDFLARE_R2_BUCKET ?? '';
  private readonly endpoint = process.env.CLOUDFLARE_R2_ENDPOINT ?? '';
  private readonly accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY ?? '';
  private readonly secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_KEY ?? '';
  private readonly publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? '';
  private readonly client: S3Client | null;

  constructor() {
    if (!this.bucket || !this.endpoint || !this.accessKeyId || !this.secretAccessKey) {
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  async createPresignedUploads(userId: string, files: PresignUploadFileDto[]) {
    this.ensureConfigured();
    this.validateBatch(files);

    const uploads: PresignedUpload[] = [];
    for (const file of files) {
      const key = this.buildKey(userId, file);
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const uploadUrl = await getSignedUrl(this.client!, command, { expiresIn: 15 * 60 });
      uploads.push({
        key,
        uploadUrl,
        publicUrl: this.toPublicUrl(key),
        kind: file.kind,
        mimeType: file.mimeType,
      });
    }

    return { files: uploads };
  }

  async uploadFile(userId: string, file: UploadedBinaryFile, kind?: UploadKind) {
    this.ensureConfigured();

    if (!file) {
      throw new BadRequestException('File upload missing.');
    }

    const resolvedKind = this.resolveKind(file, kind);
    const uploadFile: PresignUploadFileDto = {
      filename: file.originalname || `${resolvedKind}-${Date.now()}`,
      mimeType: file.mimetype || (resolvedKind === UploadKind.IMAGE ? 'image/jpeg' : 'video/mp4'),
      size: file.size,
      kind: resolvedKind,
    };

    if (resolvedKind === UploadKind.IMAGE) {
      this.validateImage(uploadFile);
    } else {
      this.validateVideo(uploadFile);
    }

    const key = this.buildKey(userId, uploadFile);
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: uploadFile.mimeType,
        CacheControl:
          resolvedKind === UploadKind.IMAGE
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=86400',
      }),
    );

    return {
      key,
      kind: resolvedKind,
      mimeType: uploadFile.mimeType,
      publicUrl: this.toPublicUrl(key),
    };
  }

  private ensureConfigured() {
    if (this.client) return;
    throw new InternalServerErrorException(
      'Media upload service temporarily unavailable. Please try again.',
    );
  }

  private validateBatch(files: PresignUploadFileDto[]) {
    const images = files.filter((file) => file.kind === UploadKind.IMAGE);
    const videos = files.filter((file) => file.kind === UploadKind.VIDEO);

    if (images.length > 6) {
      throw new BadRequestException('Maximum 6 images allowed.');
    }
    if (videos.length > 1) {
      throw new BadRequestException('Only 1 video allowed.');
    }

    for (const file of files) {
      if (file.kind === UploadKind.IMAGE) {
        this.validateImage(file);
      } else {
        this.validateVideo(file);
      }
    }
  }

  private validateImage(file: PresignUploadFileDto) {
    const allowed = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    if (!allowed.has(file.mimeType.toLowerCase())) {
      throw new BadRequestException('Unsupported image format.');
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new BadRequestException('Image size is too large (max 12MB).');
    }
  }

  private validateVideo(file: PresignUploadFileDto) {
    const allowed = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
    if (!allowed.has(file.mimeType.toLowerCase())) {
      throw new BadRequestException('Unsupported video format.');
    }
    if (file.size > 40 * 1024 * 1024) {
      throw new BadRequestException('Video size is too large (max 40MB).');
    }
  }

  private resolveKind(file: UploadedBinaryFile, kind?: UploadKind) {
    if (kind === UploadKind.IMAGE || kind === UploadKind.VIDEO) {
      return kind;
    }
    if (file.mimetype?.startsWith('image/')) {
      return UploadKind.IMAGE;
    }
    if (file.mimetype?.startsWith('video/')) {
      return UploadKind.VIDEO;
    }
    throw new BadRequestException('Unsupported upload type.');
  }

  private buildKey(userId: string, file: PresignUploadFileDto) {
    const safeName = file.filename
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .toLowerCase()
      .slice(-80);
    const extension = safeName.includes('.') ? safeName.split('.').pop() : undefined;
    const ext = extension ? `.${extension}` : file.kind === UploadKind.IMAGE ? '.jpg' : '.mp4';
    const folder = file.kind === UploadKind.IMAGE ? 'images' : 'videos';
    return `uploads/${userId}/${folder}/${Date.now()}-${randomUUID()}${ext}`;
  }

  private toPublicUrl(key: string) {
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
    }

    const normalized = this.endpoint.replace(/\/+$/, '');
    return `${normalized}/${this.bucket}/${encodedKey}`;
  }
}

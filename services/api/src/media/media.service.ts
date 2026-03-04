import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { basename, extname, resolve } from "path";
import { FileValidationService } from "./file-validation.service";

type UploadedMediaFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileValidationService: FileValidationService
  ) {}

  signUploadUrl(payload: {
    path: string;
    mediaType: "IMAGE" | "VIDEO";
    mimeType: string;
    sizeBytes: number;
    durationSec?: number;
  }) {
    this.fileValidationService.validate(payload);

    const expiresIn = this.configService.get<number>(
      "MEDIA_SIGNING_EXPIRES_SECONDS",
      600
    );
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = this.sign(payload.path, expires);
    const baseUrl = this.configService.get<string>(
      "MEDIA_PUBLIC_BASE_URL",
      "https://cdn.example.com"
    );

    return {
      uploadUrl: `${baseUrl}/${payload.path}?expires=${expires}&signature=${signature}`,
      expires
    };
  }

  async uploadMediaFile(
    file: UploadedMediaFile,
    payload: { mediaType: "IMAGE" | "VIDEO"; durationSec?: number }
  ) {
    if (!file?.buffer || !file.originalname) {
      throw new BadRequestException("Invalid uploaded file.");
    }

    this.fileValidationService.validate({
      mediaType: payload.mediaType,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      durationSec: payload.durationSec
    });

    const uploadsDir = this.getUploadsDir();
    await mkdir(uploadsDir, { recursive: true });

    const extension = extname(file.originalname || "").toLowerCase();
    const fallbackExt = payload.mediaType === "VIDEO" ? ".mp4" : ".jpg";
    const safeExt = extension && extension.length <= 6 ? extension : fallbackExt;
    const fileName = `${Date.now()}-${randomUUID()}${safeExt}`;
    const absolutePath = resolve(uploadsDir, fileName);

    await writeFile(absolutePath, file.buffer);

    const baseUrl = this.configService
      .get<string>("MEDIA_PUBLIC_BASE_URL", "https://www.teragharmeraghar.com")
      .replace(/\/$/, "");

    return {
      mediaType: payload.mediaType,
      durationSec: payload.durationSec ?? null,
      url: `${baseUrl}/api/media/files/${fileName}`,
      filename: fileName
    };
  }

  async getUploadedFile(filename: string) {
    const safeName = basename(filename);
    if (!safeName || safeName !== filename) {
      throw new BadRequestException("Invalid filename.");
    }

    const absolutePath = resolve(this.getUploadsDir(), safeName);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException("Media file not found.");
    }

    const extension = extname(safeName).toLowerCase();
    const mimeType = this.mimeFromExtension(extension);

    return {
      filename: safeName,
      absolutePath,
      mimeType
    };
  }

  verifySignedUrl(payload: { path: string; expires: number; signature: string }) {
    if (payload.expires < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: "expired" as const };
    }

    const expected = this.sign(payload.path, payload.expires);
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(payload.signature, "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { valid: false, reason: "invalid_signature" as const };
    }

    const valid = timingSafeEqual(expectedBuffer, receivedBuffer);
    return { valid, reason: valid ? null : ("invalid_signature" as const) };
  }

  private sign(path: string, expires: number) {
    const secret = this.configService.getOrThrow<string>("MEDIA_SIGNING_SECRET");
    return createHmac("sha256", secret).update(`${path}:${expires}`).digest("hex");
  }

  private getUploadsDir() {
    return resolve(process.cwd(), "..", "..", "uploads");
  }

  private mimeFromExtension(extension: string) {
    switch (extension) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      case ".webm":
        return "video/webm";
      case ".mov":
        return "video/quicktime";
      default:
        return "video/mp4";
    }
  }
}

import { Injectable, UnprocessableEntityException } from "@nestjs/common";

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

@Injectable()
export class FileValidationService {
  validate(params: {
    mediaType: "IMAGE" | "VIDEO";
    mimeType: string;
    sizeBytes: number;
    durationSec?: number;
  }) {
    const { mediaType, mimeType, sizeBytes, durationSec } = params;

    if (mediaType === "IMAGE") {
      if (!IMAGE_MIME_TYPES.has(mimeType)) {
        throw new UnprocessableEntityException("Invalid image MIME type.");
      }
      if (sizeBytes > 10 * 1024 * 1024) {
        throw new UnprocessableEntityException("Image size exceeds 10MB.");
      }
      return;
    }

    if (!VIDEO_MIME_TYPES.has(mimeType)) {
      throw new UnprocessableEntityException("Invalid video MIME type.");
    }
    if (sizeBytes > 50 * 1024 * 1024) {
      throw new UnprocessableEntityException("Video size exceeds 50MB.");
    }
    if ((durationSec ?? 0) > 30) {
      throw new UnprocessableEntityException(
        "Video duration must be 30 seconds or less."
      );
    }
  }
}

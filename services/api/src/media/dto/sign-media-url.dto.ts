import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min
} from "class-validator";

export class SignMediaUrlDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9/_\-.]+$/)
  path: string;

  @IsString()
  @IsIn(["IMAGE", "VIDEO"])
  mediaType: "IMAGE" | "VIDEO";

  @IsString()
  @IsIn([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ])
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  durationSec?: number;
}

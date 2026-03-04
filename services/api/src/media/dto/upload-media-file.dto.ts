import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export class UploadMediaFileDto {
  @IsIn(["IMAGE", "VIDEO"])
  mediaType: "IMAGE" | "VIDEO";

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  durationSec?: number;
}

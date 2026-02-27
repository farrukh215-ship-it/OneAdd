import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateReportDto {
  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetListingId?: string;

  @IsOptional()
  @IsString()
  targetThreadId?: string;

  @IsString()
  @MinLength(5)
  reason: string;
}

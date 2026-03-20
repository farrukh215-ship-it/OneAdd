import {
  InspectionRequestStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class InspectionQueueDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  workshopPartnerId?: string;

  @IsOptional()
  @IsEnum(InspectionRequestStatus)
  status?: InspectionRequestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

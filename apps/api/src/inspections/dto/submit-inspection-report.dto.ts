import { InspectionVerdict } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SubmitInspectionReportDto {
  @IsObject()
  vehicleInfo!: Record<string, string | number | boolean>;

  @IsObject()
  ownerVerification!: Record<string, string | number | boolean>;

  @IsObject()
  avlsVerification!: Record<string, string | number | boolean>;

  @IsObject()
  mechanicalChecklist!: Record<string, string | number | boolean>;

  @IsObject()
  bodyChecklist!: Record<string, string | number | boolean>;

  @IsObject()
  interiorChecklist!: Record<string, string | number | boolean>;

  @IsObject()
  tyreChecklist!: Record<string, string | number | boolean>;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  evidencePhotos!: string[];

  @IsString()
  formPageFrontUrl!: string;

  @IsOptional()
  @IsString()
  formPageBackUrl?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @IsEnum(InspectionVerdict)
  verdict!: InspectionVerdict;

  @IsObject()
  signatures!: Record<string, string | boolean>;

  @IsObject()
  stamps!: Record<string, string | boolean>;
}

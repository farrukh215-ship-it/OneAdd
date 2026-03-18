import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum UploadKind {
  IMAGE = 'image',
  VIDEO = 'video',
  DOCUMENT = 'document',
}

export class PresignUploadFileDto {
  @IsString()
  filename!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(100 * 1024 * 1024)
  size!: number;

  @IsEnum(UploadKind)
  kind!: UploadKind;
}

export class PresignUploadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => PresignUploadFileDto)
  files!: PresignUploadFileDto[];
}

import { Condition, ListingStatus, StoreType } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @Min(100)
  @Max(99999999)
  price?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsEnum(Condition)
  condition?: 'NEW' | 'USED';

  @IsOptional()
  @IsBoolean()
  isStore?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsEnum(StoreType)
  storeType?: StoreType;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  subcategorySlug?: string;

  @IsOptional()
  @IsString()
  subcategoryName?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number | boolean>;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;
}

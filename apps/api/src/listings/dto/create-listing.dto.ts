import { Condition, StoreType } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MinLength(10)
  @MaxLength(100)
  title!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  description!: string;

  @Min(100)
  @Max(99999999)
  price!: number;

  @IsString()
  categoryId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsString({ each: true })
  images!: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  videos?: string[];

  @IsEnum(Condition)
  condition!: 'NEW' | 'USED';

  @IsOptional()
  @IsBoolean()
  isStore?: boolean;

  @ValidateIf((object: CreateListingDto) => object.isStore === true)
  @IsEnum(StoreType)
  storeType?: StoreType;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  area?: string;

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
}

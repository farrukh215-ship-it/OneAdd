import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";
import { ListingMediaType } from "@prisma/client";

class CreateListingMediaDto {
  @IsString()
  type: ListingMediaType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  durationSec?: number;
}

export class CreateListingDto {
  @IsString()
  categoryId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsBoolean()
  showPhone: boolean;

  @IsBoolean()
  allowChat: boolean;

  @IsBoolean()
  allowCall: boolean;

  @IsBoolean()
  allowSMS: boolean;

  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => CreateListingMediaDto)
  media: CreateListingMediaDto[];
}

export { CreateListingMediaDto };

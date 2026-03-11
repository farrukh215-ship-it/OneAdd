import { Condition } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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
  @ArrayMaxSize(8)
  @IsString({ each: true })
  images!: string[];

  @IsEnum(Condition)
  condition!: 'NEW' | 'USED';

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  area?: string;
}

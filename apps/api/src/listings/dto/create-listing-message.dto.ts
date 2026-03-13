import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateListingMessageDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

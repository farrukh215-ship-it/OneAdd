import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateListingMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}


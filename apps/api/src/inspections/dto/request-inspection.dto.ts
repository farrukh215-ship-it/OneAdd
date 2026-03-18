import { IsString } from 'class-validator';

export class RequestInspectionDto {
  @IsString()
  listingId!: string;
}


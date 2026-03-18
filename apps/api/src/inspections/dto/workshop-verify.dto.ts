import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WorkshopVerifyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  inspectorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  workshopNotes?: string;
}


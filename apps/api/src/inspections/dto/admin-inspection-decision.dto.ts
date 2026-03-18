import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminInspectionDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  badgeLabel?: string;
}


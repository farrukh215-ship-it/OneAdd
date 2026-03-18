import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class PoliceVerifyDto {
  @IsBoolean()
  isStolen!: boolean;

  @IsString()
  @MaxLength(80)
  firStatus!: string;

  @IsString()
  @MaxLength(120)
  avlsReferenceNo!: string;

  @IsString()
  @MaxLength(120)
  policeStation!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  officerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  policeNotes?: string;
}


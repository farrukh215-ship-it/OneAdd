import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class MobileTelemetryDto {
  @IsOptional()
  @IsIn(['info', 'warn', 'error'])
  level?: 'info' | 'warn' | 'error';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  screen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  environment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  device?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

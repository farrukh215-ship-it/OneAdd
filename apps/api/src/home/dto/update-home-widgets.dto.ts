import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateHomeWidgetsDto {
  @IsOptional()
  @IsBoolean()
  weatherEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  jokeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  nationalNewsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  internationalNewsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  gpsWeatherEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  jokePrefix?: string;
}

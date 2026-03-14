import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  contacts?: boolean;

  @IsOptional()
  @IsBoolean()
  savedUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  newListings?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;
}


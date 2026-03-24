import { IsIn, IsString, IsUrl, MaxLength } from 'class-validator';

export class TrackNewsClickDto {
  @IsIn(['NATIONAL', 'INTERNATIONAL'])
  scope!: 'NATIONAL' | 'INTERNATIONAL';

  @IsString()
  @MaxLength(160)
  source!: string;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsUrl()
  url!: string;

  @IsString()
  @MaxLength(80)
  city!: string;
}

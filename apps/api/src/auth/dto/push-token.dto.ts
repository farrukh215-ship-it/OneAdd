import { IsIn, IsString } from 'class-validator';

export class PushTokenDto {
  @IsString()
  token!: string;

  @IsString()
  @IsIn(['ANDROID', 'IOS'])
  platform!: 'ANDROID' | 'IOS';
}


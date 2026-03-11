import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Pakistani number hona chahiye, format: +923001234567',
  })
  phone!: string;

  @IsString()
  firebaseIdToken!: string;
}

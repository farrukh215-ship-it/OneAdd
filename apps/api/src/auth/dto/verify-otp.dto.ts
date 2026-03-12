import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Pakistani number hona chahiye, format: +923001234567',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  firebaseIdToken?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6}$/)
  otpCode?: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}

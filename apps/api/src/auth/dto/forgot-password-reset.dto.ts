import { IsString, Matches, MinLength } from 'class-validator';

export class ForgotPasswordResetDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Pakistani number hona chahiye, format: +923001234567',
  })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/)
  otpCode!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  confirmPassword!: string;
}

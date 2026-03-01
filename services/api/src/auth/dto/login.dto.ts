import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+92[0-9]{10}$/)
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  otpVerificationToken?: string;
}

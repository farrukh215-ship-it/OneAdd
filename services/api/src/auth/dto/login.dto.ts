import { IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  otpVerificationToken?: string;
}

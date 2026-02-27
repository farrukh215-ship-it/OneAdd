import { IsEnum, IsOptional, IsString, Length, Matches } from "class-validator";
import { OtpPurpose } from "@prisma/client";

export class OtpVerifyDto {
  @IsString()
  requestId: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  otp: string;

  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;
}

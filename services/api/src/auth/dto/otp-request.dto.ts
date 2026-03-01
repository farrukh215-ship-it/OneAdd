import { IsBoolean, IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { OtpPurpose } from "@prisma/client";

export class OtpRequestDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/)
  phone: string;

  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;

  @IsOptional()
  @IsBoolean()
  forSignup?: boolean;
}

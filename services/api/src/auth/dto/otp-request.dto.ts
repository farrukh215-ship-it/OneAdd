import { IsEnum, IsOptional, IsString, Matches } from "class-validator";
import { OtpPurpose } from "@prisma/client";

export class OtpRequestDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone: string;

  @IsOptional()
  @IsEnum(OtpPurpose)
  purpose?: OtpPurpose;
}

import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength
} from "class-validator";
import { Gender } from "@prisma/client";

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  fatherName: string;

  @IsString()
  @Matches(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/)
  cnic: string;

  @IsString()
  @Matches(/^\+92[0-9]{10}$/)
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  otpVerificationToken: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;
}

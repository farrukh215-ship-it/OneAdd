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
  @Matches(/^[0-9-]{5,20}$/)
  cnic: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsDateString()
  dateOfBirth: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;
}

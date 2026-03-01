import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches
} from "class-validator";
import { Gender } from "@prisma/client";

export class FirebaseVerifyDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  fatherName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/)
  cnic?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsUrl()
  profilePhotoUrl?: string;
}

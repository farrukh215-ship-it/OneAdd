import { IsEmail, IsString, Matches } from "class-validator";

export class PasswordResetRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^\+92[0-9]{10}$/)
  phone: string;
}

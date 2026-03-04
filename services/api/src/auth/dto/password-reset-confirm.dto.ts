import { IsString, MinLength } from "class-validator";

export class PasswordResetConfirmDto {
  @IsString()
  resetToken: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

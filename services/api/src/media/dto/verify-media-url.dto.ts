import { IsInt, IsString, Matches, Min } from "class-validator";

export class VerifyMediaUrlDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9/_\-.]+$/)
  path: string;

  @IsInt()
  @Min(1)
  expires: number;

  @IsString()
  signature: string;
}

import { IsString } from "class-validator";

export class ListingOtpVerifyDto {
  @IsString()
  idToken: string;
}

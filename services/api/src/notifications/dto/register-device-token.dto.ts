import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const DEVICE_PLATFORMS = ["IOS", "ANDROID", "WEB"] as const;
type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(20)
  @MaxLength(255)
  token: string;

  @IsIn(DEVICE_PLATFORMS)
  platform: DevicePlatform;
}

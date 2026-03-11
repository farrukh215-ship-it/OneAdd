import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Pakistani number hona chahiye, format: +923001234567',
  })
  phone!: string;
}

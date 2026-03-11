import { Module } from '@nestjs/common';
import {
  FirebaseOtpService,
  OtpProviderService,
  TwilioOtpService,
} from './otp.provider.service';

@Module({
  providers: [
    FirebaseOtpService,
    TwilioOtpService,
    {
      provide: OtpProviderService,
      useFactory: (
        firebaseOtpService: FirebaseOtpService,
        twilioOtpService: TwilioOtpService,
      ) =>
        process.env.SMS_PROVIDER === 'twilio'
          ? twilioOtpService
          : firebaseOtpService,
      inject: [FirebaseOtpService, TwilioOtpService],
    },
  ],
  exports: [OtpProviderService],
})
export class OtpModule {}

import { Injectable, InternalServerErrorException } from '@nestjs/common';

export abstract class OtpProviderService {
  abstract sendOtp(phone: string): Promise<void>;
}

@Injectable()
export class FirebaseOtpService extends OtpProviderService {
  async sendOtp(_phone: string): Promise<void> {
    return;
  }
}

@Injectable()
export class TwilioOtpService extends OtpProviderService {
  async sendOtp(phone: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      throw new InternalServerErrorException('Twilio Verify config missing');
    }

    const body = new URLSearchParams({
      To: phone,
      Channel: 'sms',
    });

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(
        `Twilio Verify failed: ${errorText}`,
      );
    }
  }
}

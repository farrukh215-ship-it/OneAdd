import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmsMessage, SmsProvider } from "./sms-provider.interface";

@Injectable()
export class Sms4ConnectProvider implements SmsProvider {
  constructor(private readonly configService: ConfigService) {}

  async send(message: SmsMessage) {
    const baseUrl = this.configService.get<string>("SMS4CONNECT_BASE_URL");
    const apiKey = this.configService.get<string>("SMS4CONNECT_API_KEY");
    const senderId = this.configService.get<string>("SMS4CONNECT_SENDER_ID");

    if (!baseUrl || !apiKey || !senderId) {
      throw new HttpException(
        "SMS4Connect configuration is missing.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const response = await fetch(`${baseUrl}/api/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        sender: senderId,
        to: message.to,
        text: message.message
      })
    });

    if (!response.ok) {
      throw new HttpException(
        "Failed to send OTP SMS.",
        HttpStatus.BAD_GATEWAY
      );
    }
  }
}

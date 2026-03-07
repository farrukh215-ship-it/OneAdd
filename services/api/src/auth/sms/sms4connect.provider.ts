import { Injectable, ServiceUnavailableException } from "@nestjs/common";
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
      throw new ServiceUnavailableException(
        "OTP service abhi active nahi hai. SMS configuration missing hai."
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

    const rawBody = await response.text();
    const normalizedBody = rawBody.toLowerCase();

    if (
      !response.ok ||
      normalizedBody.includes("error") ||
      normalizedBody.includes("failed") ||
      normalizedBody.includes("invalid")
    ) {
      throw new ServiceUnavailableException(
        "OTP send nahi ho saka. SMS service response invalid tha."
      );
    }
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { SmsMessage, SmsProvider } from "./sms-provider.interface";

@Injectable()
export class NoopSmsProvider implements SmsProvider {
  private readonly logger = new Logger(NoopSmsProvider.name);

  async send(message: SmsMessage) {
    this.logger.log(`NOOP SMS to ${message.to}: ${message.message}`);
  }
}

import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(token: string, title: string, body: string, data?: Record<string, unknown>) {
    this.logger.log(
      `Push -> token=${token}, title="${title}", body="${body}", data=${JSON.stringify(
        data ?? {}
      )}`
    );
  }
}

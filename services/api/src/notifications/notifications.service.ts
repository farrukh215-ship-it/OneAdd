import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PushService } from "./push.service";

type DevicePlatform = "IOS" | "ANDROID" | "WEB";
type NotificationType = "CHAT_MESSAGE" | "LISTING_SOLD" | "LISTING_DEACTIVATED";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService
  ) {}

  async registerDeviceToken(
    userId: string,
    token: string,
    platform: DevicePlatform
  ) {
    return (this.prisma as any).deviceToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform
      },
      update: {
        userId,
        platform,
        lastSeenAt: new Date()
      }
    });
  }

  async notifyUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return { notified: 0 };
    }

    await (this.prisma as any).notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        data: data ?? null
      }))
    });

    const tokens = await (this.prisma as any).deviceToken.findMany({
      where: {
        userId: { in: uniqueUserIds }
      },
      select: { token: true }
    });

    await Promise.all(
      tokens.map((item: { token: string }) =>
        this.pushService.send(item.token, title, body, data)
      )
    );

    return { notified: uniqueUserIds.length };
  }
}

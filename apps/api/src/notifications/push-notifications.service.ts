import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, PushPlatform, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PushPayload = {
  title: string;
  body: string;
  href?: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
};

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerToken(user: User, token: string, platform: PushPlatform = 'ANDROID') {
    if (!this.isExpoPushToken(token)) {
      return { ok: false };
    }

    await this.prisma.userPushToken.upsert({
      where: { token },
      update: {
        userId: user.id,
        platform,
        lastSeenAt: new Date(),
      },
      create: {
        userId: user.id,
        token,
        platform,
        lastSeenAt: new Date(),
      },
    });

    return { ok: true };
  }

  async unregisterToken(user: User, token: string) {
    await this.prisma.userPushToken.deleteMany({
      where: {
        userId: user.id,
        token,
      },
    });
    return { ok: true };
  }

  async listNotifications(user: User) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      href: row.href,
      type: this.toClientType(row.type),
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
    }));
  }

  async markRead(user: User, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { ok: true };
  }

  async markAllRead(user: User) {
    await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { ok: true };
  }

  async notifyUsers(userIds: string[], payload: PushPayload) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!uniqueUserIds.length) return;

    if (payload.href && payload.type) {
      await this.prisma.notification.createMany({
        data: uniqueUserIds.map((userId) => ({
          userId,
          title: payload.title,
          body: payload.body,
          href: payload.href!,
          type: payload.type!,
        })),
      });
    }

    await this.sendToUsers(uniqueUserIds, payload);
  }

  async sendToUsers(userIds: string[], payload: PushPayload) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (!uniqueUserIds.length) return;

    const rows = await this.prisma.userPushToken.findMany({
      where: {
        userId: { in: uniqueUserIds },
      },
      select: {
        token: true,
      },
    });

    const messages = rows
      .map((row) => row.token)
      .filter((token) => this.isExpoPushToken(token))
      .map((to) => ({
        to,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }));

    if (!messages.length) return;

    const chunkSize = 100;
    for (let index = 0; index < messages.length; index += chunkSize) {
      const chunk = messages.slice(index, index + chunkSize);
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          this.logger.warn(`Push send failed with HTTP ${response.status}`);
        }
      } catch (error) {
        this.logger.warn(`Push send failed: ${String(error)}`);
      }
    }
  }

  private toClientType(type: NotificationType) {
    if (type === 'CONTACT') return 'contact';
    if (type === 'SAVED_UPDATE') return 'saved_update';
    return 'new_listing';
  }

  private isExpoPushToken(token: string) {
    return /^ExponentPushToken\[.+\]$|^ExpoPushToken\[.+\]$/i.test(token);
  }
}

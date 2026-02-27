import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  ChatMessageType,
  ChatThreadStatus,
  ListingStatus
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService
  ) {}

  async upsertThread(buyerId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        userId: true,
        status: true,
        allowChat: true
      }
    });

    if (!listing) {
      throw new NotFoundException("Listing not found.");
    }
    if (listing.userId === buyerId) {
      throw new BadRequestException("You cannot chat on your own listing.");
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new BadRequestException("Chat is only available for active listings.");
    }
    if (!listing.allowChat) {
      throw new ForbiddenException("Chat is disabled for this listing.");
    }

    // Enforces one thread per buyer per listing via DB unique key.
    return this.prisma.chatThread.upsert({
      where: {
        listingId_buyerId_sellerId: {
          listingId,
          buyerId,
          sellerId: listing.userId
        }
      },
      create: {
        listingId,
        buyerId,
        sellerId: listing.userId
      },
      update: {
        status: ChatThreadStatus.OPEN,
        closedAt: null
      }
    });
  }

  async sendMessage(senderId: string, threadId: string, content: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        status: true
      }
    });

    if (!thread) {
      throw new NotFoundException("Thread not found.");
    }
    if (thread.status !== ChatThreadStatus.OPEN) {
      throw new BadRequestException("Chat thread is closed.");
    }
    if (senderId !== thread.buyerId && senderId !== thread.sellerId) {
      throw new ForbiddenException("Not allowed to send message in this thread.");
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          threadId,
          senderId,
          type: ChatMessageType.TEXT,
          content: content.trim()
        }
      });

      await tx.chatThread.update({
        where: { id: threadId },
        data: { lastMessageAt: createdMessage.createdAt }
      });

      return createdMessage;
    });

    const receiverId = senderId === thread.buyerId ? thread.sellerId : thread.buyerId;
    await this.notificationsService.notifyUsers(
      [receiverId],
      "CHAT_MESSAGE",
      "New chat message",
      content.length > 80 ? `${content.slice(0, 77)}...` : content,
      { threadId, senderId }
    );

    return message;
  }

  async getMyThreads(userId: string) {
    return this.prisma.chatThread.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }]
      },
      include: {
        buyer: { select: { id: true, fullName: true } },
        seller: { select: { id: true, fullName: true } },
        listing: { select: { id: true, title: true, status: true } }
      },
      orderBy: { lastMessageAt: "desc" }
    });
  }

  async getThreadMessages(userId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      select: { buyerId: true, sellerId: true }
    });
    if (!thread) {
      throw new NotFoundException("Thread not found.");
    }
    if (userId !== thread.buyerId && userId !== thread.sellerId) {
      throw new ForbiddenException("Not allowed to view this thread.");
    }

    return this.prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" }
    });
  }
}

import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { randomInt, scryptSync, timingSafeEqual } from 'crypto';
import Redis from 'ioredis';
import { FirebaseService } from '../firebase/firebase.service';
import { PushNotificationsService } from '../notifications/push-notifications.service';
import { OtpProviderService } from '../otp/otp.provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto/user.dto';
import { ForgotPasswordResetDto } from './dto/forgot-password-reset.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly redis: Redis;
  private readonly passwordSalt: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly otpProviderService: OtpProviderService,
    private readonly jwtService: JwtService,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {
    this.redis = new Redis(
      process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
      { maxRetriesPerRequest: 1 },
    );
    this.passwordSalt = process.env.PASSWORD_SALT ?? 'tgmg-default-salt-change-me';
  }

  async sendOtp(phone: string) {
    const key = `otp_limit:${phone}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 3600);
    }

    if (current > 3) {
      throw new HttpException(
        'OTP limit exceed ho gaya hai',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otpCode = String(randomInt(100000, 999999));
    await this.redis.set(`signup_otp:${phone}`, otpCode, 'EX', 300);

    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      throw new ConflictException('Is number par account pehle se bana hua hai');
    }

    await this.otpProviderService.sendOtp(phone);

    return {
      success: true,
      message: 'OTP bheji gayi hai',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
    };
  }

  async sendForgotPasswordOtp(phone: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    if (!existingUser || !existingUser.passwordHash) {
      throw new UnauthorizedException('Is phone number ke sath account nahi mila');
    }

    const key = `forgot_otp_limit:${phone}`;
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, 3600);
    }
    if (current > 3) {
      throw new HttpException(
        'Forgot password OTP limit exceed ho gayi hai',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otpCode = String(randomInt(100000, 999999));
    await this.redis.set(`forgot_otp:${phone}`, otpCode, 'EX', 300);
    await this.otpProviderService.sendOtp(phone);

    return {
      success: true,
      message: 'Password reset OTP bheji gayi hai',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
    };
  }

  async verifyOtp(payload: VerifyOtpDto) {
    if (payload.password !== payload.confirmPassword) {
      throw new HttpException('Password match nahi kar raha', HttpStatus.BAD_REQUEST);
    }

    if (!payload.firebaseIdToken && !payload.otpCode) {
      throw new HttpException('OTP ya firebase token required hai', HttpStatus.BAD_REQUEST);
    }

    if (payload.firebaseIdToken) {
      const decoded = await this.firebaseService.verifyIdToken(payload.firebaseIdToken);
      const decodedPhone = decoded.phone_number;
      if (!decodedPhone || decodedPhone !== payload.phone) {
        throw new UnauthorizedException('Phone verify nahi hua');
      }
    } else {
      const code = await this.redis.get(`signup_otp:${payload.phone}`);
      if (!code || code !== payload.otpCode) {
        throw new UnauthorizedException('OTP ghalat hai ya expire ho gaya');
      }
    }

    const existingByPhone = await this.prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existingByPhone) {
      throw new ConflictException('Is number par account pehle se bana hua hai');
    }

    const email = payload.email.trim().toLowerCase();
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingByEmail) {
      throw new ConflictException('Is email par account pehle se maujood hai');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: payload.phone,
        email,
        name: payload.name.trim(),
        passwordHash: this.hashPassword(payload.password),
        verified: true,
      },
    });

    await this.redis.del(`signup_otp:${payload.phone}`);

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, phone: user.phone },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      user: UserDto.fromUser(user),
      isNewUser: true,
    };
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ya password ghalat hai');
    }

    if (!this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Email ya password ghalat hai');
    }

    if (user.banned) {
      throw new ForbiddenException('Aapka account band kar diya gaya hai');
    }

    await this.prisma.$executeRaw`
      UPDATE "User"
      SET "updatedAt" = NOW()
      WHERE id = ${user.id}
    `;

    const refreshedUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!refreshedUser) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: refreshedUser.id, phone: refreshedUser.phone },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      user: UserDto.fromUser(refreshedUser),
      isNewUser: false,
    };
  }

  async resetForgottenPassword(payload: ForgotPasswordResetDto) {
    if (payload.password !== payload.confirmPassword) {
      throw new HttpException('Password match nahi kar raha', HttpStatus.BAD_REQUEST);
    }

    const user = await this.prisma.user.findUnique({ where: { phone: payload.phone } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Is phone number ke sath account nahi mila');
    }

    const code = await this.redis.get(`forgot_otp:${payload.phone}`);
    if (!code || code !== payload.otpCode) {
      throw new UnauthorizedException('OTP ghalat hai ya expire ho gaya');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: this.hashPassword(payload.password),
      },
    });

    await this.redis.del(`forgot_otp:${payload.phone}`);

    const accessToken = await this.jwtService.signAsync(
      { sub: updatedUser.id, phone: updatedUser.phone },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      user: UserDto.fromUser(updatedUser),
      isNewUser: false,
    };
  }

  me(user: User) {
    return UserDto.fromUser(user);
  }

  async notifications(user: User) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [myListings, savedAds, recentContacts] = await Promise.all([
      this.prisma.listing.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          title: true,
          categoryId: true,
          createdAt: true,
        },
      }),
      this.prisma.savedAd.findMany({
        where: { userId: user.id },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              updatedAt: true,
              categoryId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.contactLog.groupBy({
        by: ['listingId'],
        where: {
          listing: { userId: user.id },
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { listingId: true },
        _max: { createdAt: true },
      }),
    ]);

    const contactItems = recentContacts
      .map((item) => {
        const listing = myListings.find((entry) => entry.id === item.listingId);
        if (!listing || !item._max.createdAt) return null;
        return {
          id: `contact-${listing.id}`,
          title: 'Aapki listing pe contact hua',
          body: `"${listing.title}" par ${item._count.listingId} logon ne rabta kiya`,
          href: `/listings/${listing.id}`,
          type: 'contact' as const,
          createdAt: item._max.createdAt.toISOString(),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const savedUpdateItems = savedAds
      .filter((entry) => entry.listing.updatedAt >= sevenDaysAgo)
      .map((entry) => ({
        id: `saved-${entry.listing.id}`,
        title: 'Saved item update hui',
        body: `"${entry.listing.title}" ki price ya details update hui hain`,
        href: `/listings/${entry.listing.id}`,
        type: 'saved_update' as const,
        createdAt: entry.listing.updatedAt.toISOString(),
      }));

    const watchedCategoryIds = Array.from(
      new Set([
        ...savedAds.map((entry) => entry.listing.categoryId),
        ...myListings.map((entry) => entry.categoryId),
      ]),
    );

    const freshListings = watchedCategoryIds.length
      ? await this.prisma.listing.findMany({
          where: {
            userId: { not: user.id },
            categoryId: { in: watchedCategoryIds },
            status: 'ACTIVE',
            createdAt: { gte: threeDaysAgo },
          },
          select: { id: true, title: true, createdAt: true, category: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 6,
        })
      : [];

    const freshItems = freshListings.map((listing) => ({
      id: `fresh-${listing.id}`,
      title: 'Aapki pasand ki category me naya ad aaya',
      body: `"${listing.title}" ${listing.category.name} category me available hai`,
      href: `/listings/${listing.id}`,
      type: 'new_listing' as const,
      createdAt: listing.createdAt.toISOString(),
    }));

    return [...contactItems, ...savedUpdateItems, ...freshItems]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }

  async registerPushToken(user: User, token: string, platform: 'ANDROID' | 'IOS') {
    return this.pushNotificationsService.registerToken(user, token, platform);
  }

  async unregisterPushToken(user: User, token: string) {
    return this.pushNotificationsService.unregisterToken(user, token);
  }

  private hashPassword(password: string) {
    return scryptSync(password, this.passwordSalt, 64).toString('hex');
  }

  private verifyPassword(password: string, storedHash: string) {
    const candidate = scryptSync(password, this.passwordSalt, 64);
    const stored = Buffer.from(storedHash, 'hex');
    if (candidate.length !== stored.length) return false;
    return timingSafeEqual(candidate, stored);
  }
}

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
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
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
      { sub: user.id, phone: user.phone, role: user.role },
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
      { sub: refreshedUser.id, phone: refreshedUser.phone, role: refreshedUser.role },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      user: UserDto.fromUser(refreshedUser),
      isNewUser: false,
    };
  }

  async adminSignIn(email: string, password: string) {
    const result = await this.signIn(email, password);
    if (result.user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin access required.');
    }
    return result;
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
      { sub: updatedUser.id, phone: updatedUser.phone, role: updatedUser.role },
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
    return this.pushNotificationsService.listNotifications(user);
  }

  async markNotificationRead(user: User, notificationId: string) {
    return this.pushNotificationsService.markRead(user, notificationId);
  }

  async markAllNotificationsRead(user: User) {
    return this.pushNotificationsService.markAllRead(user);
  }

  async notificationPreferences(user: User) {
    return this.pushNotificationsService.getPreferences(user);
  }

  async updateNotificationPreferences(user: User, body: UpdateNotificationPreferencesDto) {
    return this.pushNotificationsService.updatePreferences(user, body);
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

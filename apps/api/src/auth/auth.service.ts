import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import Redis from 'ioredis';
import { FirebaseService } from '../firebase/firebase.service';
import { OtpProviderService } from '../otp/otp.provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dto/user.dto';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly otpProviderService: OtpProviderService,
    private readonly jwtService: JwtService,
  ) {
    this.redis = new Redis(
      process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
      { maxRetriesPerRequest: 1 },
    );
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

    await this.otpProviderService.sendOtp(phone);

    return {
      success: true,
      message: 'OTP bheji gayi hai',
    };
  }

  async verifyOtp(phone: string, firebaseIdToken: string) {
    const decoded = await this.firebaseService.verifyIdToken(firebaseIdToken);
    const decodedPhone = decoded.phone_number;

    if (!decodedPhone || decodedPhone !== phone) {
      throw new UnauthorizedException('Phone verify nahi hua');
    }

    let user = await this.prisma.user.findUnique({
      where: { phone: decodedPhone },
    });

    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: decodedPhone,
          verified: true,
        },
      });
    } else if (!user.verified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { verified: true },
      });
    }

    if (user.banned) {
      throw new ForbiddenException('Aapka account band kar diya gaya hai');
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, phone: user.phone },
      { expiresIn: '30d' },
    );

    return {
      accessToken,
      user: UserDto.fromUser(user),
      isNewUser,
    };
  }

  me(user: User) {
    return UserDto.fromUser(user);
  }
}

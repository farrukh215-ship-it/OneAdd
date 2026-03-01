import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  Gender,
  OtpPurpose,
  Prisma,
  User
} from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomInt, randomUUID } from "crypto";
import { Request } from "express";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { FirebaseVerifyDto } from "./dto/firebase-verify.dto";
import { LoginDto } from "./dto/login.dto";
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpVerifyDto } from "./dto/otp-verify.dto";
import { SignupDto } from "./dto/signup.dto";
import { SMS_PROVIDER, SmsProvider } from "./sms/sms-provider.interface";

type AuthPayload = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    cnic: string;
    phone: string;
    email: string;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(SMS_PROVIDER) private readonly smsProvider: SmsProvider
  ) {}

  async signup(dto: SignupDto, request: Request): Promise<AuthPayload> {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const cnic = dto.cnic.trim();
    const verifiedOtp = await this.validateSignupOtpVerificationToken(
      dto.otpVerificationToken,
      phone
    );

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { phone }, { cnic }] },
      select: { email: true, phone: true, cnic: true }
    });

    if (existing?.cnic === cnic) {
      throw new BadRequestException("CNIC already registered.");
    }
    if (existing?.phone === phone) {
      throw new BadRequestException("Phone already registered.");
    }
    if (existing?.email === email) {
      throw new BadRequestException("Email already registered.");
    }

    const passwordHash = await hash(dto.password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        fatherName: dto.fatherName.trim(),
        cnic,
        phone,
        email,
        passwordHash,
        city: dto.city?.trim() || "Unknown",
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        profilePhotoUrl: dto.profilePhotoUrl?.trim() || null,
        phoneVerifiedAt: new Date()
      }
    });

    await this.prisma.otpCode.update({
      where: { id: verifiedOtp.id },
      data: {
        userId: createdUser.id,
        consumedAt: new Date()
      }
    });

    await this.saveDeviceFingerprint(createdUser.id, request);
    return this.buildAuthResponse(createdUser);
  }

  async requestOtp(dto: OtpRequestDto, request: Request) {
    const phone = dto.phone.trim();
    const isSignupRequest = dto.forSignup === true;
    const purpose = dto.purpose ?? OtpPurpose.LOGIN;
    const ip = getIpAddress(request);
    const userAgent = request.headers["user-agent"] ?? null;
    const fingerprintHash = this.hashFingerprint(ip, userAgent);

    const requestWindowMinutes = this.configService.get<number>(
      "OTP_REQUEST_WINDOW_MINUTES",
      3
    );
    const maxRequests = this.configService.get<number>(
      "OTP_MAX_REQUESTS_PER_WINDOW",
      3
    );
    const windowStart = new Date(Date.now() - requestWindowMinutes * 60 * 1000);
    const recentRequests = await this.prisma.otpCode.count({
      where: {
        phone,
        purpose,
        createdAt: { gte: windowStart }
      }
    });

    if (recentRequests >= maxRequests) {
      throw new ForbiddenException(
        "Too many OTP requests. Please try again later."
      );
    }

    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (isSignupRequest && user) {
      throw new BadRequestException("Phone already registered. Please login.");
    }
    if (!isSignupRequest && !user) {
      throw new BadRequestException("No account found for this phone.");
    }

    const otp = this.generateOtp();
    const expiresMinutes = this.configService.get<number>("OTP_EXPIRES_MINUTES", 3);
    const maxAttempts = this.configService.get<number>("OTP_MAX_ATTEMPTS", 5);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    const otpRecord = await this.prisma.otpCode.create({
      data: {
        userId: user?.id ?? null,
        phone,
        purpose,
        otpHash: this.hashOtp(otp),
        fingerprintHash,
        ip,
        userAgent,
        expiresAt,
        maxAttempts
      }
    });

    await this.smsProvider.send({
      to: phone,
      message: `Your OTP is ${otp}. It will expire in ${expiresMinutes} minutes.`
    });

    return {
      requestId: otpRecord.id,
      expiresAt: otpRecord.expiresAt.toISOString()
    };
  }

  async verifyOtp(dto: OtpVerifyDto, request: Request) {
    const phone = dto.phone.trim();
    const purpose = dto.purpose ?? OtpPurpose.LOGIN;
    const ip = getIpAddress(request);
    const userAgent = request.headers["user-agent"] ?? null;
    const fingerprintHash = this.hashFingerprint(ip, userAgent);

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        id: dto.requestId,
        phone,
        purpose,
        consumedAt: null
      }
    });

    if (!otpRecord) {
      throw new BadRequestException("OTP request not found.");
    }
    if (otpRecord.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("OTP expired.");
    }
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      throw new ForbiddenException("Maximum OTP attempts exceeded.");
    }
    if (otpRecord.fingerprintHash !== fingerprintHash) {
      throw new UnauthorizedException("Device fingerprint mismatch.");
    }

    const providedHash = this.hashOtp(dto.otp.trim());
    if (providedHash !== otpRecord.otpHash) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      });
      throw new UnauthorizedException("Invalid OTP.");
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: {
        verifiedAt: new Date(),
        ip,
        userAgent
      }
    });

    if (otpRecord.userId) {
      await this.prisma.user.update({
        where: { id: otpRecord.userId },
        data: {
          phoneVerifiedAt: new Date()
        }
      });
    }

    const verificationToken = await this.jwtService.signAsync(
      {
        sub: otpRecord.userId,
        phone,
        otpId: otpRecord.id,
        type: "otp_verified"
      },
      {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: "10m"
      }
    );

    return { verificationToken };
  }

  async login(dto: LoginDto, request: Request): Promise<AuthPayload> {
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();

    if (!email || !phone) {
      throw new BadRequestException("Email and phone are required for login.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        email,
        phone
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    if (dto.password) {
      const isMatch = await compare(dto.password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException("Invalid credentials.");
      }
    } else if (dto.otpVerificationToken) {
      await this.validateOtpVerificationToken(dto.otpVerificationToken, user);
    } else {
      throw new BadRequestException(
        "Provide either password or otpVerificationToken."
      );
    }

    await this.saveDeviceFingerprint(user.id, request);
    return this.buildAuthResponse(user);
  }

  async verifyFirebaseToken(
    dto: FirebaseVerifyDto,
    request: Request
  ): Promise<AuthPayload> {
    const firebaseAuth = this.getFirebaseAuth();
    if (!firebaseAuth) {
      throw new BadRequestException(
        "Firebase auth is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FCM_* credentials."
      );
    }

    let decodedToken: { phone_number?: string };
    try {
      decodedToken = await firebaseAuth.verifyIdToken(dto.idToken, true);
    } catch {
      throw new UnauthorizedException("Invalid Firebase idToken.");
    }

    const phone = decodedToken.phone_number?.trim();
    if (!phone) {
      throw new UnauthorizedException("Phone number is missing in Firebase token.");
    }
    const normalizedEmail = dto.email?.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email is required for Firebase login.");
    }

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (user && user.email.toLowerCase() !== normalizedEmail) {
      throw new UnauthorizedException("Email and phone do not match.");
    }
    if (!user) {
      this.assertFirebaseSignupPayload(dto);
      const email = normalizedEmail;
      const cnic = String(dto.cnic).trim();
      const existing = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { cnic }] },
        select: { email: true, cnic: true }
      });

      if (existing?.cnic === cnic) {
        throw new BadRequestException("CNIC already registered.");
      }
      if (existing?.email === email) {
        throw new BadRequestException("Email already registered.");
      }

      user = await this.prisma.user.create({
        data: {
          fullName: String(dto.fullName).trim(),
          fatherName: String(dto.fatherName).trim(),
          cnic,
          phone,
          email,
          passwordHash: await hash(randomUUID(), 10),
          city: String(dto.city).trim(),
          dateOfBirth: new Date(String(dto.dateOfBirth)),
          gender: dto.gender as Gender,
          profilePhotoUrl: dto.profilePhotoUrl?.trim() || null,
          phoneVerifiedAt: new Date()
        }
      });
    }

    await this.saveDeviceFingerprint(user.id, request);
    return this.buildAuthResponse(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        fatherName: true,
        cnic: true,
        phone: true,
        email: true,
        city: true,
        dateOfBirth: true,
        gender: true,
        profilePhotoUrl: true
      }
    });
    if (!user) {
      throw new UnauthorizedException("User not found.");
    }
    return user;
  }

  private async validateOtpVerificationToken(token: string, user: User) {
    const payload = await this.decodeOtpVerificationToken(token);
    if (payload.phone !== user.phone) {
      throw new UnauthorizedException("Invalid OTP verification token.");
    }

    const otp = await this.prisma.otpCode.findUnique({
      where: { id: payload.otpId as string }
    });
    if (!otp || !otp.verifiedAt || otp.consumedAt || otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("OTP is not valid for login.");
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() }
    });
  }

  private async validateSignupOtpVerificationToken(token: string, phone: string) {
    const payload = await this.decodeOtpVerificationToken(token);
    if (payload.phone !== phone) {
      throw new UnauthorizedException("OTP token does not match signup phone.");
    }

    const otp = await this.prisma.otpCode.findUnique({
      where: { id: payload.otpId as string }
    });

    if (!otp || !otp.verifiedAt || otp.consumedAt || otp.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("OTP is not valid for signup.");
    }
    if (otp.userId) {
      throw new BadRequestException("Phone already registered. Please login.");
    }

    return otp;
  }

  private async decodeOtpVerificationToken(token: string) {
    let payload: { phone?: string; otpId?: string; type?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET")
      });
    } catch {
      throw new UnauthorizedException("Invalid OTP verification token.");
    }

    if (payload.type !== "otp_verified" || !payload.phone || !payload.otpId) {
      throw new UnauthorizedException("Invalid OTP verification token.");
    }

    return payload;
  }

  private async saveDeviceFingerprint(userId: string, request: Request) {
    const ip = getIpAddress(request);
    const userAgent = request.headers["user-agent"] ?? null;
    const fingerprintHash = this.hashFingerprint(ip, userAgent);

    await this.prisma.deviceFingerprint.upsert({
      where: {
        userId_hash: {
          userId,
          hash: fingerprintHash
        }
      },
      create: {
        userId,
        hash: fingerprintHash,
        ip,
        userAgent
      },
      update: {
        ip,
        userAgent,
        lastSeenAt: new Date()
      }
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        riskSignals: {
          fingerprintHash,
          ip,
          updatedAt: new Date().toISOString()
        } as Prisma.InputJsonValue
      }
    });
  }

  private async buildAuthResponse(user: User): Promise<AuthPayload> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, phone: user.phone, email: user.email },
      {
        secret: this.configService.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN", "7d") as any
      }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        cnic: user.cnic,
        phone: user.phone,
        email: user.email
      }
    };
  }

  private hashOtp(otp: string) {
    const secret = this.configService.get<string>("OTP_SECRET");
    return createHash("sha256").update(`${secret}:${otp}`).digest("hex");
  }

  private hashFingerprint(ip: string, userAgent: string | null) {
    return createHash("sha256")
      .update(`${ip}:${userAgent ?? ""}`)
      .digest("hex");
  }

  private generateOtp() {
    return randomInt(100000, 1000000).toString();
  }

  private getFirebaseAuth():
    | { verifyIdToken: (idToken: string, checkRevoked?: boolean) => Promise<{ phone_number?: string }> }
    | null {
    const firebaseAdmin = require("firebase-admin");
    if (firebaseAdmin.apps.length === 0) {
      const serviceAccount = this.getFirebaseServiceAccount();
      if (!serviceAccount) {
        return null;
      }

      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
    }

    return firebaseAdmin.auth();
  }

  private getFirebaseServiceAccount():
    | { projectId: string; clientEmail: string; privateKey: string }
    | null {
    const rawPath = this.configService.get<string>("FIREBASE_SERVICE_ACCOUNT_PATH", "");
    if (rawPath) {
      const resolvedPath = join(process.cwd(), rawPath);
      if (existsSync(resolvedPath)) {
        const parsed = JSON.parse(readFileSync(resolvedPath, "utf-8")) as {
          project_id?: string;
          client_email?: string;
          private_key?: string;
        };
        if (parsed.project_id && parsed.client_email && parsed.private_key) {
          return {
            projectId: parsed.project_id,
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key
          };
        }
      }
    }

    const projectId = this.configService.get<string>("FCM_PROJECT_ID", "");
    const clientEmail = this.configService.get<string>("FCM_CLIENT_EMAIL", "");
    const privateKey = this.configService
      .get<string>("FCM_PRIVATE_KEY", "")
      .replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  }

  private assertFirebaseSignupPayload(dto: FirebaseVerifyDto) {
    const required: Array<keyof FirebaseVerifyDto> = [
      "fullName",
      "fatherName",
      "cnic",
      "email",
      "city",
      "dateOfBirth",
      "gender"
    ];

    const missing = required.filter((field) => !dto[field]);
    if (missing.length > 0) {
      throw new BadRequestException({
        message: "New Firebase phone requires profile fields to create account.",
        onboardingRequired: true,
        missingFields: missing
      });
    }
  }
}

function getIpAddress(request: Request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  const ip = request.ip ?? request.socket.remoteAddress ?? "0.0.0.0";
  return ip.replace("::ffff:", "");
}

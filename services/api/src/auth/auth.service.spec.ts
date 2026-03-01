import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException
} from "@nestjs/common";
import { Gender, OtpPurpose } from "@prisma/client";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const configServiceMock = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        OTP_SECRET: "otp-secret",
        JWT_ACCESS_SECRET: "jwt-secret",
        JWT_ACCESS_EXPIRES_IN: "7d",
        OTP_EXPIRES_MINUTES: 3,
        OTP_MAX_ATTEMPTS: 5,
        OTP_MAX_REQUESTS_PER_WINDOW: 3,
        OTP_REQUEST_WINDOW_MINUTES: 3
      };
      return values[key] ?? fallback;
    })
  };

  const jwtServiceMock = {
    signAsync: jest.fn().mockResolvedValue("access-token"),
    verifyAsync: jest.fn()
  };

  const smsProviderMock = {
    send: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks signup when CNIC already exists", async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      type: "otp_verified",
      phone: "+923001234567",
      otpId: "otp-1"
    });

    const prisma: any = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ cnic: "12345-1234567-1", phone: "x", email: "x" }),
        create: jest.fn()
      },
      otpCode: {
        findUnique: jest.fn().mockResolvedValue({
          id: "otp-1",
          userId: null,
          verifiedAt: new Date(Date.now() - 5_000),
          consumedAt: null,
          expiresAt: new Date(Date.now() + 60_000)
        }),
        update: jest.fn()
      },
      deviceFingerprint: { upsert: jest.fn() }
    };
    const service = new AuthService(
      prisma,
      jwtServiceMock as any,
      configServiceMock as any,
      smsProviderMock
    );

    await expect(
      service.signup(
        {
          fullName: "Ali Khan",
          fatherName: "Khan",
          cnic: "12345-1234567-1",
          phone: "+923001234567",
          email: "ali@example.com",
          password: "StrongPass1!",
          otpVerificationToken: "otp-token",
          city: "Karachi",
          dateOfBirth: "2000-01-01",
          gender: Gender.MALE
        },
        {
          headers: {},
          ip: "127.0.0.1",
          socket: { remoteAddress: "127.0.0.1" }
        } as any
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails OTP verify when OTP is expired", async () => {
    const prisma: any = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: "otp-1",
          userId: "user-1",
          otpHash: "hash",
          phone: "+923001234567",
          purpose: OtpPurpose.LOGIN,
          expiresAt: new Date(Date.now() - 60_000),
          attempts: 0,
          maxAttempts: 5,
          fingerprintHash: "fp",
          consumedAt: null
        }),
        update: jest.fn()
      }
    };
    const service = new AuthService(
      prisma,
      jwtServiceMock as any,
      configServiceMock as any,
      smsProviderMock
    );

    await expect(
      service.verifyOtp(
        {
          requestId: "otp-1",
          phone: "+923001234567",
          otp: "123456",
          purpose: OtpPurpose.LOGIN
        },
        {
          headers: { "user-agent": "jest" },
          ip: "127.0.0.1",
          socket: { remoteAddress: "127.0.0.1" }
        } as any
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("fails OTP verify when attempts limit is reached", async () => {
    const prisma: any = {
      otpCode: {
        findFirst: jest.fn().mockResolvedValue({
          id: "otp-1",
          userId: "user-1",
          otpHash: "hash",
          phone: "+923001234567",
          purpose: OtpPurpose.LOGIN,
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 5,
          maxAttempts: 5,
          fingerprintHash: "fp",
          consumedAt: null
        }),
        update: jest.fn()
      }
    };
    const service = new AuthService(
      prisma,
      jwtServiceMock as any,
      configServiceMock as any,
      smsProviderMock
    );

    await expect(
      service.verifyOtp(
        {
          requestId: "otp-1",
          phone: "+923001234567",
          otp: "123456",
          purpose: OtpPurpose.LOGIN
        },
        {
          headers: { "user-agent": "jest" },
          ip: "127.0.0.1",
          socket: { remoteAddress: "127.0.0.1" }
        } as any
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects login with consumed OTP verification token", async () => {
    const prisma: any = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: "user-1",
          fullName: "Ali Khan",
          fatherName: "Khan",
          cnic: "12345-1234567-1",
          phone: "+923001234567",
          email: "ali@example.com",
          passwordHash: "hash"
        })
      },
      otpCode: {
        findUnique: jest.fn().mockResolvedValue({
          id: "otp-1",
          verifiedAt: new Date(Date.now() - 30_000),
          consumedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000)
        }),
        update: jest.fn()
      },
      deviceFingerprint: {
        upsert: jest.fn()
      }
    };

    jwtServiceMock.verifyAsync.mockResolvedValue({
      type: "otp_verified",
      phone: "+923001234567",
      otpId: "otp-1"
    });

    const service = new AuthService(
      prisma,
      jwtServiceMock as any,
      configServiceMock as any,
      smsProviderMock
    );

    await expect(
      service.login(
        {
          email: "ali@example.com",
          phone: "+923001234567",
          otpVerificationToken: "otp-token"
        },
        {
          headers: { "user-agent": "jest" },
          ip: "127.0.0.1",
          socket: { remoteAddress: "127.0.0.1" }
        } as any
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

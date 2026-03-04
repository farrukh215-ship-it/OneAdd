import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { FirebaseVerifyDto } from "./dto/firebase-verify.dto";
import { ListingOtpVerifyDto } from "./dto/listing-otp-verify.dto";
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpVerifyDto } from "./dto/otp-verify.dto";
import { PasswordResetConfirmDto } from "./dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "./dto/password-reset-request.dto";
import { PasswordResetVerifyDto } from "./dto/password-reset-verify.dto";
import { SignupDto } from "./dto/signup.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  signup(@Body() dto: SignupDto, @Req() request: Request) {
    return this.authService.signup(dto, request);
  }

  @Post("otp/request")
  @RateLimit({ max: 6, windowSeconds: 60, failClosedOnRedisError: true })
  requestOtp(@Body() dto: OtpRequestDto, @Req() request: Request) {
    return this.authService.requestOtp(dto, request);
  }

  @Post("otp/verify")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  verifyOtp(@Body() dto: OtpVerifyDto, @Req() request: Request) {
    return this.authService.verifyOtp(dto, request);
  }

  @Post("password-reset/request")
  @RateLimit({ max: 6, windowSeconds: 60, failClosedOnRedisError: true })
  requestPasswordReset(@Body() dto: PasswordResetRequestDto, @Req() request: Request) {
    return this.authService.requestPasswordReset(dto, request);
  }

  @Post("password-reset/verify")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  verifyPasswordReset(@Body() dto: PasswordResetVerifyDto, @Req() request: Request) {
    return this.authService.verifyPasswordReset(dto, request);
  }

  @Post("password-reset/confirm")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post("login")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Post("listing-otp/request")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listingOtpRequest(@Req() request: Request) {
    return this.authService.requestListingPublishOtp(String(request.user?.sub ?? ""));
  }

  @Post("listing-otp/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  listingOtpVerify(
    @Req() request: Request,
    @Body() dto: ListingOtpVerifyDto
  ) {
    return this.authService.verifyListingPublishOtp(
      String(request.user?.sub ?? ""),
      dto
    );
  }

  @Post("firebase/verify")
  @RateLimit({ max: 15, windowSeconds: 60, failClosedOnRedisError: true })
  firebaseVerify(@Body() dto: FirebaseVerifyDto, @Req() request: Request) {
    return this.authService.verifyFirebaseToken(dto, request);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: Request) {
    return this.authService.getMe(String(request.user?.sub ?? ""));
  }
}

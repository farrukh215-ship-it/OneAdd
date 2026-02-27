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
import { OtpRequestDto } from "./dto/otp-request.dto";
import { OtpVerifyDto } from "./dto/otp-verify.dto";
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

  @Post("login")
  @RateLimit({ max: 10, windowSeconds: 60, failClosedOnRedisError: true })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: Request) {
    return this.authService.getMe(String(request.user?.sub ?? ""));
  }
}

import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordResetDto } from './dto/forgot-password-reset.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { SignInDto } from './dto/sign-in.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body.phone);
  }

  @Post('forgot-password/send-otp')
  sendForgotPasswordOtp(@Body() body: SendOtpDto) {
    return this.authService.sendForgotPasswordOtp(body.phone);
  }

  @Post('forgot-password/reset')
  resetForgottenPassword(@Body() body: ForgotPasswordResetDto) {
    return this.authService.resetForgottenPassword(body);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  @Post('sign-in')
  signIn(@Body() body: SignInDto) {
    return this.authService.signIn(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return this.authService.me(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  notifications(@CurrentUser() user: User) {
    return this.authService.notifications(user);
  }
}

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./admin.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { NoopSmsProvider } from "./sms/noop-sms.provider";
import { SMS_PROVIDER } from "./sms/sms-provider.interface";
import { Sms4ConnectProvider } from "./sms/sms4connect.provider";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_ACCESS_EXPIRES_IN", "7d") as any
        }
      })
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminGuard,
    JwtAuthGuard,
    NoopSmsProvider,
    Sms4ConnectProvider,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService, NoopSmsProvider, Sms4ConnectProvider],
      useFactory: (
        configService: ConfigService,
        noopProvider: NoopSmsProvider,
        sms4ConnectProvider: Sms4ConnectProvider
      ) => {
        const provider = configService.get<string>("SMS_PROVIDER", "noop");
        if (provider === "sms4connect") {
          return sms4ConnectProvider;
        }
        return noopProvider;
      }
    }
  ],
  exports: [JwtModule, JwtAuthGuard, AdminGuard]
})
export class AuthModule {}

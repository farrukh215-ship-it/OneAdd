import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ListingsModule } from './listings/listings.module';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, FirebaseModule, OtpModule, AuthModule, ListingsModule],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthController } from './health.controller';
import { ListingsModule } from './listings/listings.module';
import { OtpModule } from './otp/otp.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    OtpModule,
    AuthModule,
    ListingsModule,
    CategoriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

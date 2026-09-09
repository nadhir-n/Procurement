import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './users/users.controller';
import { TenantPrismaService } from './prisma/tenant-prisma.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
  providers: [TenantPrismaService],
})
export class AppModule {}

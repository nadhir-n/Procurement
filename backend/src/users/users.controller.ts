import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantPrismaService } from '../prisma/tenant-prisma.service';

@Controller('api/v1/users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly prisma: TenantPrismaService) {}

  @Get()
  async getTenantUsers() {
    // Because of TenantPrismaService, this will ONLY return users for the caller's tenant!
    return this.prisma.client.user.findMany({
      select: { id: true, email: true, status: true }
    });
  }
}

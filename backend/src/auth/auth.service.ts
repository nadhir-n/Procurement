import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(data: any) {
    // Basic implementation for Phase 1: create org + user
    const { orgName, email, password } = data;

    const existingUser = await this.prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const org = await this.prisma.organization.create({
      data: { name: orgName },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        tenantId: org.id,
        status: 'active',
      },
    });

    return this.login({ email, password });
  }

  async login(data: any) {
    const user = await this.prisma.user.findFirst({ where: { email: data.email } });
    
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, tenantId: user.tenantId };
    
    // Create refresh token logic would go here
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    signup(data: any): Promise<{
        access_token: string;
    }>;
    login(data: any): Promise<{
        access_token: string;
    }>;
}

import { TenantPrismaService } from '../prisma/tenant-prisma.service';
export declare class UsersController {
    private readonly prisma;
    constructor(prisma: TenantPrismaService);
    getTenantUsers(): Promise<any>;
}

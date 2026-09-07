import { PrismaService } from './prisma.service';
export declare class TenantPrismaService {
    private readonly request;
    private readonly prisma;
    private _tenantClient;
    constructor(request: any, prisma: PrismaService);
    get client(): any;
}

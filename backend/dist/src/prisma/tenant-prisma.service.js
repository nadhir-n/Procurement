"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantPrismaService = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("./prisma.service");
let TenantPrismaService = class TenantPrismaService {
    request;
    prisma;
    _tenantClient;
    constructor(request, prisma) {
        this.request = request;
        this.prisma = prisma;
        const tenantId = this.request?.user?.tenantId;
        if (tenantId) {
            this._tenantClient = this.prisma.$extends({
                query: {
                    $allModels: {
                        async $allOperations({ model, operation, args, query }) {
                            const globalModels = ['Organization', 'PlatformAdmin', 'ImpersonationSession'];
                            if (!globalModels.includes(model)) {
                                args.where = { ...args.where, tenantId };
                                if (['create', 'createMany'].includes(operation)) {
                                    if (args.data) {
                                        if (Array.isArray(args.data)) {
                                            args.data = args.data.map((d) => ({ ...d, tenantId }));
                                        }
                                        else {
                                            args.data = { ...args.data, tenantId };
                                        }
                                    }
                                }
                            }
                            return query(args);
                        },
                    },
                },
            });
        }
        else {
            this._tenantClient = this.prisma;
        }
    }
    get client() {
        return this._tenantClient || this.prisma;
    }
};
exports.TenantPrismaService = TenantPrismaService;
exports.TenantPrismaService = TenantPrismaService = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(0, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [Object, prisma_service_1.PrismaService])
], TenantPrismaService);
//# sourceMappingURL=tenant-prisma.service.js.map
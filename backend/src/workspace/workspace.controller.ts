import { Controller, Get } from '@nestjs/common';

@Controller('api/v1')
export class WorkspaceController {
  @Get('health') check() { return { ok: true, service: 'procurement_api', version: '4.1.2-local' }; }
  @Get('orders') orders() { return []; }
  @Get('approvals') approvals() { return []; }
  @Get('items') items() { return []; }
  @Get('vendors') vendors() { return []; }
  @Get('properties') properties() { return []; }
}

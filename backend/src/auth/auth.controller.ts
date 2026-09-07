import { Controller, Post, Body, Res, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: any) {
    return this.authService.signup(body);
  }

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(body);
    // In production, add refresh token as httpOnly cookie here
    res.json(tokens);
  }
  
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookies here
    res.json({ success: true });
  }
}

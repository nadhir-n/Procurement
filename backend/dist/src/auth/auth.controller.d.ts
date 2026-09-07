import { AuthService } from './auth.service';
import type { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(body: any): Promise<{
        access_token: string;
    }>;
    login(body: any, res: Response): Promise<void>;
    logout(res: Response): Promise<void>;
}

import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { CsrfGuard } from './csrf.guard.js';
import { CurrentUser, Public, type AuthUser } from './auth.types.js';

const sessionBodySchema = z.object({
  accessToken: z.string().min(1).optional(),
  /** @deprecated Alias for accessToken during FE cutover */
  idToken: z.string().min(1).optional(),
  accountType: z.string().optional(),
}).refine((b) => Boolean(b.accessToken || b.idToken), {
  message: 'accessToken required',
});

const emailBodySchema = z.object({
  email: z.string().email(),
});

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(CsrfGuard)
  @Post('session')
  async createSession(
    @Body(new ZodValidationPipe(sessionBodySchema))
    body: z.infer<typeof sessionBodySchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.createSession(res, body);
    if ('ok' in result) return { success: true, uid: result.uid };
    res.status(result.status);
    return result.body;
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Delete('session')
  async deleteSession(@Res({ passthrough: true }) res: Response) {
    await this.auth.clearSession(res);
    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return this.auth.getMe(user);
  }

  @Get('sessions')
  async sessions(@CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.auth.listSessions(user, req.headers['user-agent']);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body(new ZodValidationPipe(emailBodySchema)) body: z.infer<typeof emailBodySchema>,
  ) {
    // Password reset is owned by Supabase Auth client — Nest does not send email.
    // Never claim success as if mail was sent.
    void body.email;
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message:
        'Password reset must be initiated via Supabase Auth client. This API does not send email.',
      stub: true,
    };
  }

  @Public()
  @Post('magic-link')
  async magicLink(
    @Body(new ZodValidationPipe(emailBodySchema)) body: z.infer<typeof emailBodySchema>,
  ) {
    void body.email;
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      message:
        'Magic link sign-in must be initiated via Supabase Auth client. This API does not send email.',
      stub: true,
    };
  }
}

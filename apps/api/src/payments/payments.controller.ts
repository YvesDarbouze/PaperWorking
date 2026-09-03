import {
  All,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, Public, type AuthUser } from '../auth/auth.types.js';
import { PaymentsService } from './payments.service.js';

@Controller('api/billing')
export class BillingController {
  constructor(private readonly payments: PaymentsService) {}

  @All(['', '*path'])
  handleBilling(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return this.payments.billingGet(user, req.path || req.url);
    }
    return this.payments.billingMutate(
      user,
      req.method || 'POST',
      req.path || req.url,
      body ?? {},
    );
  }
}

@Controller('api/stripe')
export class StripeController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.payments.checkout(user, body ?? {});
  }

  @Post('portal')
  portal(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.payments.portal(user, body ?? {});
  }

  @Get('session-status')
  sessionStatus(
    @CurrentUser() user: AuthUser,
    @Query('session_id') sessionId?: string,
  ) {
    return this.payments.sessionStatus(user, sessionId);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const raw =
      req.rawBody ||
      (typeof req.body === 'string' || Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body ?? {})));
    return this.payments.webhook(raw, signature);
  }
}

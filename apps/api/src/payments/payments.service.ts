import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BillingForbiddenError,
  BillingNotFoundError,
  BillingUnavailableError,
  BillingValidationError,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildNestBillingServices, type NestBillingServices } from './payments-factory.js';

@Injectable()
export class PaymentsService {
  private readonly billing: NestBillingServices;

  constructor(private readonly prisma: PrismaService) {
    this.billing = buildNestBillingServices(this.prisma);
  }

  private parseBillingPath(reqPath: string): string[] {
    const idx = reqPath.indexOf('/api/billing');
    const rest = idx >= 0 ? reqPath.slice(idx + '/api/billing'.length) : reqPath;
    return rest.split('/').filter(Boolean);
  }

  private mapBillingError(err: unknown): never {
    if (err instanceof BillingValidationError) {
      throw new BadRequestException(err.payload);
    }
    if (err instanceof BillingForbiddenError) {
      throw new ForbiddenException(err.payload);
    }
    if (err instanceof BillingNotFoundError) {
      throw new NotFoundException(err.payload);
    }
    if (err instanceof BillingUnavailableError) {
      throw new ServiceUnavailableException(err.payload);
    }
    throw err;
  }

  async billingGet(user: AuthUser, reqPath: string) {
    const actionPath = this.parseBillingPath(reqPath);

    if (actionPath.length === 0) {
      return this.billing.read.getSummary(user);
    }

    if (actionPath.length === 1 && actionPath[0] === 'payment-methods') {
      return [];
    }

    if (actionPath.length === 1 && actionPath[0] === 'invoices') {
      return [];
    }

    if (
      actionPath.length === 3 &&
      actionPath[0] === 'invoices' &&
      actionPath[2] === 'download'
    ) {
      return {
        success: true,
        invoiceId: actionPath[1],
        stub: true,
        message: 'Invoice PDF stub — no binary storage configured',
      };
    }

    throw new BadRequestException({ error: 'Endpoint not found' });
  }

  async billingMutate(
    user: AuthUser,
    method: string,
    reqPath: string,
    body: Record<string, unknown>,
  ) {
    const actionPath = this.parseBillingPath(reqPath);

    try {
      if (method === 'POST' && actionPath[0] === 'change-plan') {
        return await this.billing.subscriptionCommand.changePlan(user, body);
      }

      if (method === 'POST' && actionPath[0] === 'cancel') {
        return await this.billing.subscriptionCommand.cancelSubscription(user);
      }

      if (method === 'POST' && actionPath[0] === 'reactivate') {
        return await this.billing.subscriptionCommand.reactivateSubscription(user);
      }

      if (method === 'POST' && actionPath[0] === 'payment-methods') {
        return {
          success: true,
          paymentMethods: [],
          message: 'Payment methods require Stripe; returning empty list',
        };
      }

      if (method === 'DELETE' && actionPath[0] === 'payment-methods') {
        return { success: true, paymentMethods: [] };
      }

      if (method === 'PUT' && actionPath[0] === 'payment-methods' && actionPath[1] === 'default') {
        return { success: true, paymentMethods: [] };
      }

      if (method === 'PUT' || method === 'POST' || method === 'DELETE') {
        const sub = await this.billing.read.getSummary(user);
        return {
          success: true,
          path: actionPath,
          subscription: sub.subscription,
        };
      }
    } catch (err) {
      this.mapBillingError(err);
    }

    throw new BadRequestException({ error: 'Endpoint not found' });
  }

  async checkout(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.billing.checkout.createCheckout(user, body);
    } catch (err) {
      this.mapBillingError(err);
    }
  }

  async portal(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.billing.portal.createPortalSession(user, body);
    } catch (err) {
      this.mapBillingError(err);
    }
  }

  async sessionStatus(user: AuthUser, sessionId?: string) {
    try {
      return await this.billing.checkout.getSessionStatus(user, sessionId);
    } catch (err) {
      this.mapBillingError(err);
    }
  }

  async webhook(rawBody: Buffer | string, signature: string | undefined) {
    try {
      return await this.billing.webhook.handleWebhook(rawBody, signature);
    } catch (err) {
      this.mapBillingError(err);
    }
  }
}

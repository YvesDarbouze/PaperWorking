import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildNestReportsServices, type NestReportsServices } from './reports-factory.js';

@Injectable()
export class ReportsService {
  private readonly reports: NestReportsServices;

  constructor(private readonly prisma: PrismaService) {
    this.reports = buildNestReportsServices(this.prisma);
  }

  private mapError(err: unknown): never {
    if (err instanceof AuthzForbiddenError) {
      throw new ForbiddenException(err.payload);
    }
    if (err instanceof AuthzNotFoundError) {
      throw new ForbiddenException(err.payload);
    }
    throw err;
  }

  async portfolio(user: AuthUser, period?: string) {
    try {
      const result = await this.reports.read.getPortfolioReport(user, period);
      return { ...result, period: period ?? 'monthly' };
    } catch (err) {
      this.mapError(err);
    }
  }

  async byPeriod(
    user: AuthUser,
    period: string,
    opts?: { organizationId?: string; projectId?: string },
  ) {
    try {
      return await this.reports.read.getPeriodReport(user, period, opts);
    } catch (err) {
      this.mapError(err);
    }
  }

  async generate(user: AuthUser, body: { type?: string; period?: string; format?: string }, res: Response) {
    try {
      const result = await this.reports.generate.generateExport(user, body);
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.body);
    } catch (err) {
      this.mapError(err);
    }
  }
}

const generateSchema = z.object({
  type: z.string().optional(),
  period: z.string().optional(),
  format: z.string().optional(),
});

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('portfolio')
  portfolio(@CurrentUser() user: AuthUser, @Query('period') period?: string) {
    return this.reports.portfolio(user, period);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(generateSchema)) body: z.infer<typeof generateSchema>,
    @Res() res: Response,
  ) {
    return this.reports.generate(user, body, res);
  }

  @Get(':period')
  byPeriod(
    @CurrentUser() user: AuthUser,
    @Param('period') period: string,
    @Query('organizationId') organizationId?: string,
    @Query('projectId') projectId?: string,
  ) {
    if (!period || period === 'generate' || period === 'portfolio') {
      throw new ForbiddenException({ error: 'Invalid period' });
    }
    return this.reports.byPeriod(user, period, { organizationId, projectId });
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

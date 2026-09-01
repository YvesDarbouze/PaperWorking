import {
  All,
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Injectable,
  Module,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ProfileForbiddenError,
  ProfileNotFoundError,
  ProfileValidationError,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildNestProfileServices, type NestProfileServices } from './settings-factory.js';

/** Writable settings sections for normal users. */
const ALLOWED_SECTIONS = new Set([
  'profile',
  'notifications',
  'preferences',
  'display',
  'privacy',
]);

/** Fields that must never be written via settings (privilege / identity). */
const FORBIDDEN_FIELDS = new Set([
  'id',
  'userId',
  'uid',
  'email',
  'accountType',
  'role',
  'isAdmin',
  'organizationId',
  'orgId',
  'legacyFirebaseUid',
  'stripeCustomerId',
  'subscriptionStatus',
  'subscriptionPlan',
  'permissions',
]);

@Injectable()
export class SettingsService {
  private readonly profileServices: NestProfileServices;

  constructor(private readonly prisma: PrismaService) {
    this.profileServices = buildNestProfileServices(this.prisma);
  }

  private sectionFromPath(path: string): string {
    const idx = path.indexOf('/api/settings');
    const rest = idx >= 0 ? path.slice(idx + '/api/settings'.length) : '';
    const parts = rest.split('/').filter(Boolean);
    return parts[0] || 'profile';
  }

  private assertAllowedSection(section: string) {
    if (!ALLOWED_SECTIONS.has(section)) {
      throw new ForbiddenException({
        error: 'Forbidden settings section',
        section,
      });
    }
  }

  private stripForbidden(body: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (FORBIDDEN_FIELDS.has(key)) {
        throw new ForbiddenException({
          error: 'Forbidden settings field',
          field: key,
        });
      }
      out[key] = value;
    }
    return out;
  }

  private mapProfileError(err: unknown): never {
    if (err instanceof ProfileForbiddenError) {
      throw new ForbiddenException(err.payload);
    }
    if (err instanceof ProfileValidationError) {
      throw new BadRequestException(err.payload);
    }
    throw err;
  }

  async get(user: AuthUser, path: string) {
    const section = this.sectionFromPath(path);
    this.assertAllowedSection(section);

    if (section === 'profile') {
      try {
        return await this.profileServices.read.getProfile(user);
      } catch (err) {
        this.mapProfileError(err);
      }
    }

    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
    });
    const settings =
      row?.settings && typeof row.settings === 'object'
        ? (row.settings as Record<string, unknown>)
        : {};

    return {
      success: true,
      section,
      settings: settings[section] ?? {},
    };
  }

  async put(user: AuthUser, path: string, body: Record<string, unknown>) {
    const section = this.sectionFromPath(path);
    this.assertAllowedSection(section);

    if (section === 'profile') {
      try {
        return await this.profileServices.command.updateProfile(user, body);
      } catch (err) {
        if (err instanceof ProfileNotFoundError) {
          return err.payload;
        }
        this.mapProfileError(err);
      }
    }

    // Never trust client ownership ids.
    void body.userId;
    void body.organizationId;
    void body.uid;

    const safeBody = this.stripForbidden(body);

    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
    });
    if (!row) {
      return { success: false, error: 'User not found' };
    }

    const existing =
      row.settings && typeof row.settings === 'object'
        ? { ...(row.settings as Record<string, unknown>) }
        : {};
    existing[section] = {
      ...((existing[section] as object) || {}),
      ...safeBody,
    };
    const updated = await this.prisma.user.update({
      where: { id: row.id },
      data: { settings: existing as object },
    });
    return { success: true, section, settings: existing[section], userId: updated.id };
  }

  async mutate(
    user: AuthUser,
    method: string,
    path: string,
    body: Record<string, unknown>,
  ) {
    if (method === 'GET') return this.get(user, path);
    if (method === 'DELETE') {
      const section = this.sectionFromPath(path);
      this.assertAllowedSection(section);
      if (section === 'profile') {
        throw new ForbiddenException({ error: 'Cannot delete profile section' });
      }
      const row = await this.prisma.user.findFirst({
        where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
      });
      if (!row) return { success: false, error: 'User not found' };
      const existing =
        row.settings && typeof row.settings === 'object'
          ? { ...(row.settings as Record<string, unknown>) }
          : {};
      delete existing[section];
      await this.prisma.user.update({
        where: { id: row.id },
        data: { settings: existing as object },
      });
      return { success: true, section, deleted: true };
    }
    return this.put(user, path, body);
  }
}

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @All(['', '*path'])
  handle(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
  ) {
    return this.settings.mutate(
      user,
      req.method || 'GET',
      req.path || req.url,
      body ?? {},
    );
  }
}

@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

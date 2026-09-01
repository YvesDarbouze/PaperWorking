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
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

/** Profile column allowlist on User. */
const PROFILE_FIELDS = new Set([
  'name',
  'displayName',
  'phone',
  'timezone',
  'companyName',
  'avatarUrl',
]);

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async get(user: AuthUser, path: string) {
    const section = this.sectionFromPath(path);
    this.assertAllowedSection(section);
    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
    });
    const settings =
      row?.settings && typeof row.settings === 'object'
        ? (row.settings as Record<string, unknown>)
        : {};

    if (section === 'profile') {
      return {
        success: true,
        section,
        settings: {
          id: row?.id || user.uid,
          email: row?.email || user.email,
          name: row?.name,
          displayName: row?.displayName,
          phone: row?.phone,
          timezone: row?.timezone,
          companyName: row?.companyName,
          avatarUrl: row?.avatarUrl,
          accountType: row?.accountType || user.accountType,
          ...((settings.profile as object) || {}),
        },
      };
    }

    return {
      success: true,
      section,
      settings: settings[section] ?? {},
    };
  }

  async put(user: AuthUser, path: string, body: Record<string, unknown>) {
    const section = this.sectionFromPath(path);
    this.assertAllowedSection(section);

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

    if (section === 'profile') {
      const data: Record<string, unknown> = {};
      for (const key of PROFILE_FIELDS) {
        if (typeof safeBody[key] === 'string') data[key] = safeBody[key];
      }
      // FE sends firstName/lastName — map to name + displayName
      const firstName =
        typeof safeBody.firstName === 'string' ? safeBody.firstName.trim() : '';
      const lastName =
        typeof safeBody.lastName === 'string' ? safeBody.lastName.trim() : '';
      if (firstName || lastName) {
        const full = [firstName, lastName].filter(Boolean).join(' ').trim();
        if (full) {
          data.name = full;
          data.displayName = full;
        }
      }
      const allowedKeys = new Set([...PROFILE_FIELDS, 'firstName', 'lastName', 'profile']);
      for (const key of Object.keys(safeBody)) {
        if (!allowedKeys.has(key)) {
          throw new BadRequestException({
            error: 'Unknown profile field',
            field: key,
          });
        }
      }
      const updated = await this.prisma.user.update({
        where: { id: row.id },
        data,
      });
      return { success: true, section, settings: updated };
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

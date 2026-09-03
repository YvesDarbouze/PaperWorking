import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { createOrganizationsRepository } from '@paperworking/database';
import type { AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/auth.types.js';
import { AuthorizationService } from '../authz/authorization.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || `org-${Date.now().toString(36)}`;
}

@Injectable()
export class OrganizationsService {
  private readonly organizationsRepository;

  constructor(private readonly authz: AuthorizationService) {
    this.organizationsRepository = createOrganizationsRepository();
  }

  async listForUser(user: AuthUser) {
    const orgIds = await this.authz.resolveUserOrgIds(user.uid);
    if (orgIds.length === 0) {
      return { success: true, organizations: [] };
    }
    const organizations = await this.organizationsRepository.listByIds(orgIds);
    return { success: true, organizations };
  }

  async getById(user: AuthUser, organizationId: string) {
    await this.authz.assertOrgAccess(user, organizationId);
    const organization = await this.organizationsRepository.getById(organizationId);
    if (!organization) {
      throw new BadRequestException({ error: 'Organization not found' });
    }
    return { success: true, organization };
  }

  async create(user: AuthUser, body: { name: string; slug?: string }) {
    const name = body.name.trim();
    if (!name) {
      throw new BadRequestException({ error: 'name required' });
    }

    const slug = body.slug?.trim() || slugifyName(name);
    const result = await this.organizationsRepository.createWithOwner({
      name,
      slug,
      ownerId: user.uid,
      ownerEmail: user.email ?? undefined,
    });

    return {
      success: true,
      organization: result.organization,
      membership: result.membership,
    };
  }
}

const createOrgSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(64).optional(),
});

@Controller('api/organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.organizations.listForUser(user);
  }

  @Get('current')
  current(@CurrentUser() user: AuthUser, @Query('organizationId') organizationId?: string) {
    if (organizationId) {
      return this.organizations.getById(user, organizationId);
    }
    return this.organizations.listForUser(user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createOrgSchema)) body: z.infer<typeof createOrgSchema>,
  ) {
    return this.organizations.create(user, body);
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}

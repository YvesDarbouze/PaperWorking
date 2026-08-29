import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async listings() {
    const listings = await this.prisma.marketplaceListing.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return { success: true, listings };
  }

  async profile(user: AuthUser) {
    const row = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.uid }, { legacyFirebaseUid: user.uid }] },
    });
    const following = await this.prisma.investorFollower.count({
      where: { followerUid: row?.id || user.uid },
    });
    const followers = await this.prisma.investorFollower.count({
      where: { targetUid: row?.id || user.uid },
    });
    return {
      success: true,
      profile: {
        id: row?.id || user.uid,
        email: row?.email || user.email,
        displayName: row?.displayName || row?.name,
        accountType: row?.accountType || user.accountType,
        companyName: row?.companyName,
        avatarUrl: row?.avatarUrl,
        following,
        followers,
      },
    };
  }

  async investors(q?: string) {
    // Public directory — never select or return email. Search must not use email either.
    const where = {
      accountType: 'investor',
      ...(q?.trim()
        ? {
            OR: [
              { name: { contains: q.trim(), mode: 'insensitive' as const } },
              { displayName: { contains: q.trim(), mode: 'insensitive' as const } },
              { companyName: { contains: q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const investors = await this.prisma.user.findMany({
      where,
      take: 50,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        companyName: true,
        avatarUrl: true,
        accountType: true,
      },
    });
    return {
      success: true,
      investors: investors.map((inv: {
        id: string;
        name: string | null;
        displayName: string | null;
        companyName: string | null;
        avatarUrl: string | null;
        accountType: string | null;
      }) => this.toPublicInvestor(inv)),
    };
  }

  async investorById(id: string) {
    const investor = await this.prisma.user.findFirst({
      where: { OR: [{ id }, { legacyFirebaseUid: id }] },
      select: {
        id: true,
        name: true,
        displayName: true,
        companyName: true,
        avatarUrl: true,
        accountType: true,
        createdAt: true,
      },
    });
    if (!investor) throw new NotFoundException({ error: 'Investor not found' });
    const followers = await this.prisma.investorFollower.count({
      where: { targetUid: investor.id },
    });
    return {
      success: true,
      investor: { ...this.toPublicInvestor(investor), followers, createdAt: investor.createdAt },
    };
  }

  /** Public DTO — email deliberately omitted (serialization safety). */
  private toPublicInvestor(inv: {
    id: string;
    name?: string | null;
    displayName?: string | null;
    companyName?: string | null;
    avatarUrl?: string | null;
    accountType?: string | null;
  }) {
    return {
      id: inv.id,
      name: inv.name,
      displayName: inv.displayName,
      companyName: inv.companyName,
      avatarUrl: inv.avatarUrl,
      accountType: inv.accountType,
    };
  }

  async follow(user: AuthUser, body: Record<string, unknown>) {
    const targetUid = String(body.targetUid || body.investorId || body.id || '');
    if (!targetUid) throw new NotFoundException({ error: 'targetUid required' });
    const row = await this.prisma.investorFollower.upsert({
      where: {
        followerUid_targetUid: {
          followerUid: user.uid,
          targetUid,
        },
      },
      create: { followerUid: user.uid, targetUid },
      update: {},
    });
    return { success: true, follow: row };
  }

  async listFollowers(user: AuthUser) {
    const following = await this.prisma.investorFollower.findMany({
      where: { followerUid: user.uid },
      orderBy: { createdAt: 'desc' },
    });
    const followers = await this.prisma.investorFollower.findMany({
      where: { targetUid: user.uid },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, following, followers };
  }

  async createFollower(user: AuthUser, body: Record<string, unknown>) {
    return this.follow(user, body);
  }
}

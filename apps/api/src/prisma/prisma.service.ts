import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getApiPrismaClient, type ApiPrismaClient } from '@paperworking/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: ApiPrismaClient = getApiPrismaClient();

  get user() {
    return this.client.user;
  }
  get organization() {
    return this.client.organization;
  }
  get organizationMember() {
    return this.client.organizationMember;
  }
  get organizationInvite() {
    return this.client.organizationInvite;
  }
  get project() {
    return this.client.project;
  }
  get projectDocument() {
    return this.client.projectDocument;
  }
  get projectMember() {
    return this.client.projectMember;
  }
  get inboxItem() {
    return this.client.inboxItem;
  }
  get investorFollower() {
    return this.client.investorFollower;
  }
  get taskAssignment() {
    return this.client.taskAssignment;
  }
  get appConfig() {
    return this.client.appConfig;
  }
  get deal() {
    return this.client.deal;
  }
  get dealBroadcast() {
    return this.client.dealBroadcast;
  }
  get dealInvitation() {
    return this.client.dealInvitation;
  }
  get dealMessage() {
    return this.client.dealMessage;
  }
  get marketplaceListing() {
    return this.client.marketplaceListing;
  }
  get message() {
    return this.client.message;
  }
  get subscription() {
    return this.client.subscription;
  }
  get vendor() {
    return this.client.vendor;
  }
  get vendorBid() {
    return this.client.vendorBid;
  }
  get phaseTransition() {
    return this.client.phaseTransition;
  }
  get adminAuditLog() {
    return this.client.adminAuditLog;
  }
  get stripeWebhookEvent() {
    return this.client.stripeWebhookEvent;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

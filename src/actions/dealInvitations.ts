'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { DealInvitation, DealLedgerEntry } from '@/types/dealInvitation';
import type { VisibilityMode } from '@/types/listing';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';
import {
  checkUserInvitationSuspended,
  checkInvitationRateLimits,
  detectPurchasedListPattern
} from '@/lib/invitations/abuseCheckers';
import { trackDealActivity } from '@/lib/invitations/activityTimeline';

interface VerifiedUser {
  uid: string;
  email: string;
  role: string;
  organizationId: string;
  accountType?: string;
  displayName?: string;
  [key: string]: unknown;
}

async function verifyActionAuth(idToken: string): Promise<VerifiedUser> {
  if (!idToken) throw new Error('Missing authentication token.');
  try {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true' && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      const { cookies } = require('next/headers');
      const cookieStore = await cookies();
      const uid = cookieStore.get('mock_user_uid')?.value || 'user_lead_investor_seed';
      const email = cookieStore.get('mock_user_email')?.value || 'marcus@apexcapital.io';
      const name = cookieStore.get('mock_user_name')?.value || 'Marcus Aurelius';
      const role = cookieStore.get('mock_user_role')?.value || 'Lead Investor';
      const accountType = cookieStore.get('mock_user_account_type')?.value || (role === 'Vendor' ? 'vendor' : 'investor');
      const subscriptionPlan = cookieStore.get('mock_user_subscription_plan')?.value || 'Team';
      const subscriptionStatus = subscriptionPlan === 'None' ? 'inactive' : 'active';
      const organizationId = cookieStore.get('mock_user_org_id')?.value || 'org_paperworking_seed';
      if (role === 'Vendor' || accountType === 'vendor') {
        throw new Error('Not Found');
      }

      return {
        uid,
        email,
        displayName: name,
        role,
        accountType,
        subscriptionPlan,
        subscriptionStatus,
        organizationId,
      } as VerifiedUser;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userSnap = await userDocRef.get();

    if (!userSnap.exists) throw new Error('User profile not found in database.');

    const userData = userSnap.data() as Record<string, unknown>;

    // Live database role/accountType check for Vendor role
    if (userData.role === 'Vendor' || userData.accountType === 'vendor') {
      throw new Error('Not Found');
    }

    return { uid: decodedToken.uid, email: decodedToken.email || (userData.email as string), ...userData } as VerifiedUser;
  } catch (err: any) {
    if (err.message === 'Not Found') throw err;
    console.error('Server Action Auth Error:', err);
    throw new Error('Unauthorized');
  }
}

/**
 * Send deal invitations to existing subscribers/contacts.
 * Bulk invitation is capped at 20.
 * Rate limit of 100 per 24 hours per project.
 * Blocks invitations to unpublished deals.
 * Blocks invitations to vendors (G-9).
 */
export async function inviteSubscribers(
  idToken: string,
  projectId: string,
  invitees: Array<{ email: string; name?: string }>,
  personalNote?: string
): Promise<{ success: boolean; invitedCount: number }> {
  try {
    const caller = await verifyActionAuth(idToken);
    await checkUserInvitationSuspended(caller.uid);

    // Enforce bulk invitation cap
    if (invitees.length === 0) {
      throw new Error('No invitees provided.');
    }
    if (invitees.length > 20) {
      throw new Error('Bulk invitation is capped at 20 recipients per submission.');
    }

    // Fetch active project
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new Error('Project not found.');
    }
    const projectData = projectSnap.data()!;

    // Check permissions
    const isOwner = projectData.ownerUid === caller.uid;
    const isTeammate = caller.organizationId && caller.organizationId === projectData.organizationId;
    if (!isOwner && !isTeammate) {
      throw new Error('Access denied. You do not have permissions to invite subscribers.');
    }

    // Fetch active deal listing to verify publish status
    const listingsSnap = await adminDb.collection('dealListings')
      .where('projectId', '==', projectId)
      .limit(1)
      .get();
    
    if (listingsSnap.empty) {
      throw new Error('Cannot send invitations for an unpublished Deal.');
    }

    const listingDoc = listingsSnap.docs[0];
    const listingData = listingDoc.data();

    if (listingData.status !== 'published') {
      throw new Error('Cannot send invitations for an unpublished Deal.');
    }

    const visibilityMode = listingData.visibilityMode as VisibilityMode;
    const version = (listingData.version as number) || 1;

    // Enforce 24-hour rate limits
    await checkInvitationRateLimits(caller.uid, projectId, invitees.length);

    // Purchased list detection
    const emails = invitees.map(i => i.email);
    const purchasedCheck = await detectPurchasedListPattern(caller.uid, projectId, emails);
    if (purchasedCheck.isSuspicious && purchasedCheck.strangersCount > 15 && visibilityMode === 'PRIVATE') {
      throw new Error('Your invitation batch was flagged as non-relational. To protect platform integrity, mass invites to unverified contacts are restricted.');
    }

    let warning: string | undefined = undefined;
    if (purchasedCheck.isSuspicious) {
      warning = 'Warning: High volume of unfamiliar email addresses. Mass cold emailing is monitored and may result in sending privilege suspension.';
    }

    // Process each invitee and run checks
    const preparedInvitations: Omit<DealInvitation, 'id'>[] = [];
    
    for (const invitee of invitees) {
      const emailLower = invitee.email.trim().toLowerCase();
      if (!emailLower) continue;

      // 0. Check global unsubscribe list (DM-25)
      const unsubscribedSnap = await adminDb.collection('unsubscribedEmails').doc(emailLower).get();
      if (unsubscribedSnap.exists) {
        throw new Error(`The email address ${invitee.email} has opted out of platform invitations.`);
      }

      // 1. Verify User table check for Vendor role (G-9)
      const userQuery = await adminDb.collection('users')
        .where('email', '==', emailLower)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0].data();
        if (userDoc.role === 'Vendor' || userDoc.accountType === 'vendor') {
          throw new Error(`A Vendor (${invitee.email}) cannot be invited to a Deal listing.`);
        }
      }

      // 2. Contact table check for Vendor role (G-9)
      const contactQuery = await adminDb.collection('projects').doc(projectId)
        .collection('investor_contacts')
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      
      if (!contactQuery.empty) {
        const contactDoc = contactQuery.docs[0].data();
        if (contactDoc.role === 'Vendor' || contactDoc.type === 'Vendor' || contactDoc.accountType === 'vendor') {
          throw new Error(`A Vendor (${invitee.email}) cannot be invited to a Deal listing.`);
        }
        if (contactDoc.emailConsent === false) {
          throw new Error(`The email address ${invitee.email} has opted out of communications from this sender.`);
        }
      }

      const inviteeUid = !userQuery.empty ? userQuery.docs[0].id : undefined;
      const inviteeName = invitee.name || (!userQuery.empty ? userQuery.docs[0].data().displayName : undefined);
      const inviteToken = require('crypto').randomUUID();

      preparedInvitations.push({
        projectId,
        listingId: listingDoc.id,
        inviterUid: caller.uid,
        inviteeEmail: emailLower,
        ...(inviteeUid && { inviteeUid }),
        ...(inviteeName && { inviteeName }),
        ...(personalNote && { personalNote }),
        visibilityMode,
        version,
        status: 'sent',
        createdAt: new Date().toISOString(),
        token: inviteToken,
      });
    }

    // Batch write invitations and ledger records
    const batch = adminDb.batch();
    const ledgerChanges: Array<{ fieldPath: string; oldValue: any; newValue: any }> = [];
    const invitationsToCommit: DealInvitation[] = [];

    for (const invite of preparedInvitations) {
      // 1. Invitation document
      const inviteRef = adminDb.collection('dealInvitations').doc();
      const committedInvite = { ...invite, id: inviteRef.id } as DealInvitation;
      batch.set(inviteRef, committedInvite);
      invitationsToCommit.push(committedInvite);

      // 2. Immutable Ledger event
      const ledgerRef = adminDb.collection('projects').doc(projectId)
        .collection('dealLedger').doc();
      const ledgerData: DealLedgerEntry = {
        id: ledgerRef.id,
        projectId,
        listingId: listingDoc.id,
        eventType: 'INVITATION_SENT',
        performedBy: caller.uid,
        inviteeEmail: invite.inviteeEmail,
        version,
        visibilityMode,
        timestamp: new Date().toISOString(),
        metadata: {
          invitationId: inviteRef.id,
          personalNote: invite.personalNote,
        },
      };
      batch.set(ledgerRef, ledgerData);

      // Keep track for activity log
      ledgerChanges.push({
        fieldPath: `invitations.${invite.inviteeEmail.replace(/\./g, '_')}`,
        oldValue: null,
        newValue: { status: 'sent', version, visibilityMode },
      });
    }

    // A. Database write occurs FIRST
    await batch.commit();

    // Track timeline activity
    for (const invite of invitationsToCommit) {
      await trackDealActivity(projectId, projectId, caller.uid, 'invite', {
        inviteeEmail: invite.inviteeEmail,
        inviteeName: invite.inviteeName || 'Anonymous Investor',
        visibilityMode,
        version,
      }).catch(err => console.error('[inviteSubscribers timeline tracking failed]', err));
    }

    // Log Activity log
    await writeActivityLog(projectId, caller.uid, ledgerChanges, 'system');

    // B. Send invitation emails (Side-effects occur AFTER successful db commit)
    const { CommunicationEngine } = require('@/lib/engine/CommunicationEngine');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co';
    const PHYSICAL_ADDRESS = 'PaperWorking Inc., 548 Market St, Suite 48921, San Francisco, CA 94104';

    for (const invite of invitationsToCommit) {
      let addressText = 'Address Unspecified';
      let priceText = 'N/A';
      let capRateText = 'N/A';
      let cocText = 'N/A';
      let targetText = 'N/A';
      let minTicketText = 'N/A';

      if (visibilityMode === 'PRIVATE') {
        addressText = projectData.address 
          ? `${projectData.address.street || ''}, ${projectData.address.city || ''}, ${projectData.address.state || ''} ${projectData.address.zip || ''}`
          : projectData.propertyAddress || 'Address Unspecified';
        
        priceText = listingData.askingPriceCents ? `$${(listingData.askingPriceCents / 100).toLocaleString()}` : 'N/A';
        capRateText = listingData.capRate ? `${listingData.capRate}%` : 'N/A';
        cocText = listingData.cashOnCash ? `${listingData.cashOnCash}%` : 'N/A';
        targetText = listingData.equityTerms?.fundingTarget ? `$${(listingData.equityTerms.fundingTarget / 100).toLocaleString()}` : 'N/A';
        minTicketText = listingData.equityTerms?.minTicket ? `$${(listingData.equityTerms.minTicket / 100).toLocaleString()}` : 'N/A';
      } else {
        // Obfuscate figures for PUBLIC_SOLICITED or MARKETPLACE
        const { buildTeaserFromListing } = require('@/lib/listings/obfuscation');
        const teaser = buildTeaserFromListing(listingData);

        addressText = `${teaser.neighborhood || 'Neighborhood Unspecified'}, ${teaser.city || ''}, ${teaser.state || ''} (Exact street address hidden)`;
        priceText = teaser.askingPriceApprox || 'N/A';
        capRateText = teaser.capRateRange || 'N/A';
        cocText = teaser.cashOnCashRange || 'N/A';
        targetText = teaser.fundingTargetApprox || 'N/A';
        minTicketText = teaser.minTicketApprox || 'N/A';
      }

      const inviteUrl = `${appUrl}/invest/${invite.token}`;
      const unsubscribeUrl = `${appUrl}/unsubscribe?email=${encodeURIComponent(invite.inviteeEmail)}&projectId=${projectId}`;

      const subject = `Invitation to review ${listingData.propertyName || 'Deal'} from ${caller.displayName || 'Lead Investor'}`;
      const emailHtml = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eaeaea;border-radius:12px;background-color:#ffffff;">
          <h2 style="font-size:20px;font-weight:700;color:#121014;margin-top:0;margin-bottom:16px;">You are invited to review a Deal on PaperWorking</h2>
          
          <p style="font-size:14px;color:#4a4a4a;margin-bottom:20px;">
            ${caller.displayName || 'A Lead Investor'} has invited you to view the listing for <strong>${listingData.propertyName || 'a new real estate deal'}</strong>.
          </p>

          ${invite.personalNote ? `
            <div style="background-color:#f9f9f9;border-left:4px solid #454955;padding:12px 16px;margin-bottom:20px;font-size:14px;font-style:italic;color:#4a4a4a;">
              "${invite.personalNote}"
            </div>
          ` : ''}

          <div style="background-color:#fafafa;border:1px solid #f0f0f0;border-radius:8px;padding:16px;margin-bottom:24px;">
            <h3 style="font-size:12px;font-weight:700;color:#121014;margin-top:0;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">Deal Teaser & Metrics</h3>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;width:40%;">Location</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;">${addressText}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;">Asking Price</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;font-family:monospace;">${priceText}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;">Target Cap Rate</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;font-family:monospace;">${capRateText}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;">Cash-on-Cash</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;font-family:monospace;">${cocText}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;">Funding Target</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;font-family:monospace;">${targetText}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#666666;font-weight:500;">Minimum Ticket</td>
                <td style="padding:6px 0;color:#121014;font-weight:600;font-family:monospace;">${minTicketText}</td>
              </tr>
            </table>
          </div>

          <div style="margin: 24px 0; text-align: center;">
            <a href="${inviteUrl}?action=interested" style="display: inline-block; padding: 12px 20px; background-color: #121014; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
              I'm Interested
            </a>
            <a href="${inviteUrl}?action=ask" style="display: inline-block; padding: 12px 20px; background-color: #fafafa; color: #121014; border: 1px solid #dcdcdc; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
              Ask a Question
            </a>
            <a href="${inviteUrl}?action=decline" style="display: inline-block; padding: 12px 20px; background-color: #ffffff; color: #ff3b30; border: 1px solid #ffb3b0; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 4px;">
              Decline Invitation
            </a>
          </div>

          <hr style="border:0;border-top:1px solid #eaeaea;margin-bottom:20px;" />

          <div style="font-size:11px;color:#666666;line-height:1.5;">
            <p style="margin-bottom:12px;font-weight:500;font-style:italic;">
              Non-Binding Disclosure: This communication does not constitute an offer to sell or the solicitation of an offer to buy any securities. Any indication of interest or investment commitment made hereunder is non-binding.
            </p>
            <p style="margin-bottom:12px;">
              This email was sent by ${caller.displayName || 'a user'} via PaperWorking.
            </p>
            <p style="margin-bottom:0;">
              Sender Physical Address: ${PHYSICAL_ADDRESS}<br />
              To stop receiving these invitations, you can <a href="${unsubscribeUrl}" style="color:#666666;text-decoration:underline;">unsubscribe here</a>.
            </p>
          </div>
        </div>
      `;

      const inboundDomain = process.env.INBOUND_EMAIL_DOMAIN;
      const replyTo = inboundDomain ? `reply+${invite.token}@${inboundDomain}` : undefined;

      await CommunicationEngine.sendRawEmail([invite.inviteeEmail], subject, emailHtml, { replyTo });
    }

    return { success: true, invitedCount: preparedInvitations.length, ...(warning && { warning }) } as any;
  } catch (err) {
    console.error('inviteSubscribers error:', err);
    throw err instanceof Error ? err : new Error('Failed to send invitations.');
  }
}

/**
 * Fetch deal invitations for a project.
 */
export async function getDealInvitations(
  idToken: string,
  projectId: string
): Promise<DealInvitation[]> {
  try {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true' && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      if (projectId === 'project_cf') {
        return [
          {
            id: 'inv_cf_1',
            projectId: 'project_cf',
            listingId: 'listing_cf',
            inviterUid: 'user_lead_investor_seed',
            inviteeEmail: 'investor1@paperworking.com',
            inviteeName: 'Warren Buffett',
            status: 'interested',
            visibilityMode: 'MARKETPLACE',
            version: 1,
            createdAt: new Date().toISOString(),
            indication: {
              type: 'amount',
              value: 500000,
              currency: 'USD',
              updatedAt: new Date().toISOString(),
            }
          },
          {
            id: 'inv_cf_2',
            projectId: 'project_cf',
            listingId: 'listing_cf',
            inviterUid: 'user_lead_investor_seed',
            inviteeEmail: 'investor2@paperworking.com',
            inviteeName: 'Bernard Arnault',
            status: 'interested',
            visibilityMode: 'MARKETPLACE',
            version: 1,
            createdAt: new Date().toISOString(),
            indication: {
              type: 'amount',
              value: 300000,
              currency: 'EUR',
              updatedAt: new Date().toISOString(),
            }
          }
        ];
      }
      if (projectId === 'project_j1_deal') {
        return [
          {
            id: 'inv_j1_1',
            projectId: 'project_j1_deal',
            listingId: 'listing_j1',
            inviterUid: 'user_lead_investor_seed',
            inviteeEmail: 'sub@paperworking.com',
            inviteeName: 'In-Platform subscriber',
            status: 'sent',
            visibilityMode: 'PRIVATE',
            version: 1,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'inv_j1_2',
            projectId: 'project_j1_deal',
            listingId: 'listing_j1',
            inviterUid: 'user_lead_investor_seed',
            inviteeEmail: 'external@gmail.com',
            inviteeName: 'External Email',
            status: 'sent',
            visibilityMode: 'PRIVATE',
            version: 1,
            createdAt: new Date().toISOString(),
          }
        ];
      }
    }

    const caller = await verifyActionAuth(idToken);

    // Fetch active project to verify role permissions
    const projectSnap = await adminDb.collection('projects').doc(projectId).get();
    if (!projectSnap.exists) throw new Error('Project not found.');
    const projectData = projectSnap.data()!;

    const isOwner = projectData.ownerUid === caller.uid;
    const isTeammate = caller.organizationId && caller.organizationId === projectData.organizationId;
    if (!isOwner && !isTeammate) {
      throw new Error('Access denied. You do not have permissions to view invitations.');
    }

    const invitesSnap = await adminDb.collection('dealInvitations')
      .where('projectId', '==', projectId)
      .get();

    return invitesSnap.docs.map(doc => doc.data() as DealInvitation);
  } catch (err) {
    console.error('getDealInvitations error:', err);
    throw err instanceof Error ? err : new Error('Failed to retrieve invitations.');
  }
}

/**
 * Decline or express interest in a Deal invitation.
 */
export async function respondToDealInvitation(
  idToken: string,
  projectId: string,
  response: 'declined' | 'interested'
): Promise<{ success: boolean }> {
  try {
    const caller = await verifyActionAuth(idToken);
    const emailLower = caller.email.toLowerCase();

    // Query active invitation
    const inviteSnap = await adminDb.collection('dealInvitations')
      .where('projectId', '==', projectId)
      .where('inviteeEmail', '==', emailLower)
      .limit(1)
      .get();

    if (inviteSnap.empty) {
      throw new Error('No invitation found for this deal.');
    }

    const inviteDoc = inviteSnap.docs[0];
    const inviteData = inviteDoc.data() as DealInvitation;

    const batch = adminDb.batch();
    const now = new Date().toISOString();

    // Update status
    batch.update(inviteDoc.ref, {
      status: response,
      respondedAt: now,
    });

    // Write Ledger response entry
    const ledgerRef = adminDb.collection('projects').doc(projectId)
      .collection('dealLedger').doc();
    const ledgerData: DealLedgerEntry = {
      id: ledgerRef.id,
      projectId,
      listingId: inviteData.listingId,
      eventType: 'INVITATION_RESPONSE',
      performedBy: caller.uid,
      inviteeEmail: emailLower,
      version: inviteData.version,
      visibilityMode: inviteData.visibilityMode,
      timestamp: now,
      metadata: {
        response,
        invitationId: inviteDoc.id,
      },
    };
    batch.set(ledgerRef, ledgerData);

    await batch.commit();

    // Track timeline activity
    await trackDealActivity(
      projectId,
      projectId,
      caller.uid,
      response === 'interested' ? 'interest' : 'decline',
      {
        inviteeEmail: emailLower,
      }
    ).catch(err => console.error('[respondToDealInvitation timeline tracking failed]', err));

    // Write Activity Log
    await writeActivityLog(projectId, caller.uid, [{
      fieldPath: `invitations.${emailLower.replace(/\./g, '_')}.status`,
      oldValue: inviteData.status,
      newValue: response,
    }], 'system');

    return { success: true };
  } catch (err) {
    console.error('respondToDealInvitation error:', err);
    throw err instanceof Error ? err : new Error('Failed to submit response.');
  }
}

/**
 * Fetch list of possible invite targets (contacts + subscribers).
 */
export async function getInviteTargets(
  idToken: string,
  projectId: string
): Promise<Array<{ email: string; name?: string; source: string }>> {
  try {
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_MOCK_AUTH === 'true' && (idToken === 'mock_token' || idToken === 'mock_token_123' || idToken === 'mock_session_token_123')) {
      return [
        { email: 'sub@paperworking.com', name: 'Platform Subscriber', source: 'Platform Subscriber' },
        { email: 'external@gmail.com', name: 'External Email', source: 'Project Contact' }
      ];
    }

    const caller = await verifyActionAuth(idToken);
    const targets: Array<{ email: string; name?: string; source: string }> = [];

    // 1. Fetch project contacts
    const contactsSnap = await adminDb.collection('projects').doc(projectId)
      .collection('investor_contacts').get();
    for (const doc of contactsSnap.docs) {
      const data = doc.data();
      if (data.email) {
        targets.push({
          email: data.email,
          name: data.name || data.displayName,
          source: 'Project Contact',
        });
      }
    }

    // 2. Fetch existing platform subscribers
    const usersSnap = await adminDb.collection('users')
      .where('role', '==', 'Subscriber')
      .get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      if (data.email && !targets.some(t => t.email.toLowerCase() === data.email.toLowerCase())) {
        targets.push({
          email: data.email,
          name: data.displayName || data.name,
          source: 'Platform Subscriber',
        });
      }
    }

    return targets;
  } catch (err) {
    console.error('getInviteTargets error:', err);
    return [];
  }
}

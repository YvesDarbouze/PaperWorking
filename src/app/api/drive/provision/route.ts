import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Google Drive Folder Provisioning Endpoint
 * 
 * Authenticates via GCP Service Account, creates a parent folder named
 * after the property address, generates 3 nested sub-folders, and writes
 * the resulting folder URLs back to the Deal document in Firestore.
 * 
 * POST /api/drive/provision
 * Body: { idToken: string, dealId: string, propertyAddress: string }
 */

// Sub-folders to create inside each property folder
const SUB_FOLDERS = ['Closing Docs', 'Receipts', 'Permits'] as const;

/**
 * Creates a Google Drive folder and returns its ID + web link
 */
async function createFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink: string }> {
  const fileMetadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, webViewLink',
  });

  return {
    id: response.data.id as string,
    webViewLink: response.data.webViewLink as string,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, dealId, propertyAddress } = body;

    // ── Authentication ──────────────────────────────────────────
    if (!idToken || !dealId || !propertyAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: idToken, dealId, propertyAddress' },
        { status: 400 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Verify the deal exists and belongs to this user's organization
    const dealRef = adminDb.collection('deals').doc(dealId);
    const dealSnap = await dealRef.get();

    if (!dealSnap.exists) {
      return NextResponse.json({ error: 'Deal not found.' }, { status: 404 });
    }

    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    const dealData = dealSnap.data();
    const userData = userSnap.data();

    if (dealData?.organizationId !== userData?.organizationId) {
      return NextResponse.json({ error: 'Cross-tenant access denied.' }, { status: 403 });
    }

    // ── Google Drive Client Setup ───────────────────────────────
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ── Folder Creation Pipeline ────────────────────────────────

    // 1. Create the parent folder named after the property address
    const parentFolder = await createFolder(drive, `PW — ${propertyAddress}`);

    // 2. Create nested sub-folders inside the parent
    const subFolderResults: Record<string, { id: string; webViewLink: string }> = {};

    for (const folderName of SUB_FOLDERS) {
      const result = await createFolder(drive, folderName, parentFolder.id);
      subFolderResults[folderName] = result;
    }

    // ── Firestore Update ────────────────────────────────────────
    // Write the folder structure back to the Deal document
    const driveFolders = {
      parentFolderId: parentFolder.id,
      parentFolderUrl: parentFolder.webViewLink,
      subFolders: {
        closingDocs: {
          id: subFolderResults['Closing Docs'].id,
          url: subFolderResults['Closing Docs'].webViewLink,
        },
        receipts: {
          id: subFolderResults['Receipts'].id,
          url: subFolderResults['Receipts'].webViewLink,
        },
        permits: {
          id: subFolderResults['Permits'].id,
          url: subFolderResults['Permits'].webViewLink,
        },
      },
    };

    await dealRef.update({
      driveFolders,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      dealId,
      driveFolders,
    });
  } catch (error: any) {
    console.error('[Drive Provision] Error:', error);

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Session expired. Please re-authenticate.' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to provision Drive folders.', details: error.message },
      { status: 500 }
    );
  }
}

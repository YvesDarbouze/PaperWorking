import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { validateUploadQuota, DEFAULT_ACCOUNT_QUOTA_BYTES } from '@/lib/storage/quota';
import { getCategoryByFilename, DocumentCategory } from '@/lib/storage/categories';

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.csv'];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = (formData.get('projectId') as string) || 'proj_demo_1';
    const categoryOverride = formData.get('category') as DocumentCategory | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileSizeBytes = file.size;

    // 1. Extension Validation
    const extMatch = fileName.match(/\.[0-9a-z]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File type ${ext} is not allowed. Permitted: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 2. Storage Quota Check
    const currentProjectUsedBytes = 10485760; // Mock 10 MB used
    const projectQuotaBytes = Math.floor(DEFAULT_ACCOUNT_QUOTA_BYTES / 3); // 178 MB quota per project
    const quotaCheck = validateUploadQuota(currentProjectUsedBytes, projectQuotaBytes, fileSizeBytes);

    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.errorReason }, { status: 400 });
    }

    // 3. Path & Category Determination
    const category = categoryOverride || getCategoryByFilename(fileName);
    const storagePath = `/${uid}/${projectId}/${category}/${fileName}`;
    const file_id = `file_${Date.now()}`;
    const uploaded_at = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        file_id,
        fileName,
        url: `https://storage.paperworking.co${storagePath}`,
        storagePath,
        size: fileSizeBytes,
        category,
        uploaded_at,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Upload failed', details: errMsg }, { status: 500 });
  }
}

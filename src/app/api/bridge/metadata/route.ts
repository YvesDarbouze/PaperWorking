import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { bridgeResoService } from '@/lib/services/bridgeResoService';

/**
 * GET /api/bridge/metadata
 *
 * Exposes the list of accessible MLS fields by querying and parsing
 * the Bridge Interactive OData $metadata definition.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  try {
    const fields = await bridgeResoService.getAccessibleFields();
    
    if (!fields || fields.length === 0) {
      return NextResponse.json(
        { error: 'Could not retrieve MLS fields from metadata.' }, 
        { status: 504 }
      );
    }

    return NextResponse.json({
      success: true,
      metadata: {
        entityType: 'Property',
        fieldCount: fields.length,
        fields: fields.sort()
      }
    });

  } catch (error: any) {
    console.error('❌ [API BRIDGE METADATA] Route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error refreshing metadata.' }, 
      { status: 500 }
    );
  }
}

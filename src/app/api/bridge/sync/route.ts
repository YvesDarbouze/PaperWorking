import { NextResponse } from 'next/server';
import { replicationWorker } from '@/lib/services/replicationWorker';

/**
 * POST /api/bridge/sync
 * 
 * manually triggers the high-volume replication worker to sync
 * listings from the Bridge /Property/replication endpoint.
 */
export async function POST() {
  try {
    console.log('🚀 [API BRIDGE SYNC] Manual trigger initiated...');
    
    // We execute the sync process. 
    // Note: For very long syncs, you might want to run this as a background job 
    // and return a 202 Accepted status. For this implementation, we run it inline.
    const result = await replicationWorker.sync();

    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Replication sync failed.', 
          details: result.error 
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Replication sync completed successfully.',
      syncedCount: result.syncedCount
    });

  } catch (error: any) {
    console.error('❌ [API BRIDGE SYNC] Route error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during replication sync.' }, 
      { status: 500 }
    );
  }
}

/**
 * GET /api/bridge/sync
 * 
 * returns the current sync status and watermark information.
 */
export async function GET() {
  try {
    const prisma = (await import('@/lib/prisma')).default;
    
    const state = await prisma.bridgeSyncState.findUnique({
      where: { id: 'replication_watermark' }
    });

    return NextResponse.json({
      active: true,
      lastWatermark: state?.mostRecentModificationTimestamp || 'None',
      updatedAt: state?.updatedAt || 'None'
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve sync status.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { processEmailQueue, cleanupEmailQueue, getQueueStats } from '@/lib/email-queue';

// This endpoint should be called by a cron job (e.g., every 5 minutes)
export async function GET(request: Request) {
  // Simple authentication check using a secret header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processEmailQueue();
    const stats = await getQueueStats();

    // Cleanup old emails occasionally (every 100th call)
    const shouldCleanup = Math.random() < 0.01;
    let cleanupResult = { deleted: 0 };
    if (shouldCleanup) {
      cleanupResult = await cleanupEmailQueue();
    }

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      stats,
      cleanup: cleanupResult,
    });
  } catch (error) {
    console.error('[EMAIL_QUEUE_CRON_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to process email queue' },
      { status: 500 }
    );
  }
}

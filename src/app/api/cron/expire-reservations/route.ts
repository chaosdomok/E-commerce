import { NextResponse } from 'next/server';
import { expireOverdueReservations } from '@/actions/reservations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await expireOverdueReservations();
    return NextResponse.json({
      success: true,
      message: `Checked and expired ${result.expiredCount} overdue reservations.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron reservation expiration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to expire reservations.' },
      { status: 500 }
    );
  }
}

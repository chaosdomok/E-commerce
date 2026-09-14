import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple health check - if we reach here, the app is running
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.2.0',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

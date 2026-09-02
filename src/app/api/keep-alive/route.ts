import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    // Optional: Protect the cron route with a secret defined in Vercel environment variables
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // Perform a minimal, low-cost query on the 'books' table to register activity
    // This will prevent the Supabase free tier database from pausing due to inactivity
    const { data, error } = await supabase
      .from('books')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive cron error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Keep-alive ping successful', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Keep-alive generic error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

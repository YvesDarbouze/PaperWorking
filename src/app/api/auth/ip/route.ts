import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  let ip = request.headers.get('x-forwarded-for') || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (!ip) {
    ip = request.headers.get('x-real-ip') || '';
  }
  if (!ip) {
    ip = '127.0.0.1'; // fallback for local dev
  }
  return NextResponse.json({ ip });
}

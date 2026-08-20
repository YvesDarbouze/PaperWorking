export function extractClientIp(headers: Record<string, string | undefined>): string {
  let ip = headers['x-forwarded-for'] || '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (!ip) {
    ip = headers['x-real-ip'] || '';
  }
  if (!ip) {
    ip = '127.0.0.1';
  }
  return ip;
}

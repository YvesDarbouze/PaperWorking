/**
 * Mock-mode gate for the Next.js frontend.
 *
 * Contract (must match Nest AuthService.mockAuthEnabled):
 * - production → always false (even if flags are true)
 * - non-production → true unless USE_MOCK_DATA / ENABLE_MOCK_AUTH / NEXT_PUBLIC_* is false|0
 *
 * Precedence for the flag value:
 *   NEXT_PUBLIC_USE_MOCK_DATA
 *   ?? USE_MOCK_DATA
 *   ?? NEXT_PUBLIC_ENABLE_MOCK_AUTH
 *   ?? ENABLE_MOCK_AUTH
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function readMockFlag(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_DATA ??
    process.env.USE_MOCK_DATA ??
    process.env.NEXT_PUBLIC_ENABLE_MOCK_AUTH ??
    process.env.ENABLE_MOCK_AUTH
  );
}

/**
 * Whether the app should serve centralized /mockdata via the mock provider.
 */
export function useMockData(): boolean {
  if (isProductionRuntime()) return false;
  const flag = readMockFlag();
  if (flag === 'false' || flag === '0') return false;
  return true;
}

/**
 * Dev auth (mock session token / Bearer dev-session) — never in production.
 * Same gate as Nest mockAuthEnabled so FE/API stay synchronized.
 */
export function useMockAuth(): boolean {
  return useMockData();
}

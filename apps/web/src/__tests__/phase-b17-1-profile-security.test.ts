import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

describe('phase B17.1 — profile response security (static)', () => {
  it('profile services map through SafeProfileDto', () => {
    const read = readFileSync(
      join(webRoot, '../../packages/services/src/profile/profile-read-service.ts'),
      'utf8',
    );
    const command = readFileSync(
      join(webRoot, '../../packages/services/src/profile/profile-command-service.ts'),
      'utf8',
    );
    expect(read).toContain('mapUserRowToSafeProfileDto');
    expect(read).not.toContain('...nestedProfile');
    expect(command).toContain('mapUserRowToSafeProfileDto');
    expect(command).not.toContain('as unknown as Record<string, unknown>');
  });

  it('client profile mapper derives display role from accountType only', () => {
    const source = readFileSync(join(webRoot, 'lib/settings/profile-api.ts'), 'utf8');
    expect(source).toContain("String(s.accountType ?? '—')");
    expect(source).not.toMatch(/s\.role/);
  });
});

describe('phase B17.1 — transport regression', () => {
  it('profile and insights panels remain on BFF helpers', () => {
    const profile = readFileSync(join(webRoot, 'components/settings/ProfileSettingsPanel.tsx'), 'utf8');
    const insights = readFileSync(join(webRoot, 'components/insights/PortfolioInsightsPanel.tsx'), 'utf8');
    expect(profile).toContain('updateProfileFromBff');
    expect(profile).not.toContain('apiFetch(');
    expect(insights).toContain('getPortfolioInsightsFromBff');
    expect(insights).not.toContain('apiFetch(');
  });
});

import type { TitleProvider } from './titleProvider';
import { ManualTitleAdapter } from './manualTitleAdapter';
import { QualiaTitleAdapter } from './qualiaTitleAdapter';

export function getTitleProvider(): TitleProvider {
  const provider = process.env.TITLE_PROVIDER || 'manual';
  if (provider === 'qualia') {
    return new QualiaTitleAdapter();
  }
  return new ManualTitleAdapter();
}

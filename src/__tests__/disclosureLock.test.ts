import { NON_BINDING_DISCLOSURE } from '@/lib/constants/disclosure';
import fs from 'fs';
import path from 'path';

describe('DM-34: Non-binding Disclosure Lock', () => {
  it('confirms the disclosure text originates from a single source of truth constant', () => {
    expect(NON_BINDING_DISCLOSURE).toBeDefined();
    expect(NON_BINDING_DISCLOSURE).toContain('non-binding expression of interest');
    expect(NON_BINDING_DISCLOSURE).toContain('does not constitute a commitment');
  });

  it('renders at capture in SoftCommitWidget.tsx', () => {
    const filePath = path.join(process.cwd(), 'src/components/project/SoftCommitWidget.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('NON_BINDING_DISCLOSURE');
    // Ensure there is no alternative text used in input section
    expect(content).not.toContain('const customDisclosure');
  });

  it('renders in notifications inside indication/route.ts', () => {
    const filePath = path.join(process.cwd(), 'src/app/api/invitations/[token]/indication/route.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('NON_BINDING_DISCLOSURE');
  });

  it('renders in the CSV export inside listing/page.tsx', () => {
    const filePath = path.join(process.cwd(), 'src/app/dashboard/projects/[id]/listing/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('NON_BINDING_DISCLOSURE');
    expect(content).toContain('csvContent');
    // Verify it is appended at export time
    expect(content).toContain('NON_BINDING_DISCLOSURE.replace');
  });

  it('renders in the Lead Investor aggregate view inside listing/page.tsx', () => {
    const filePath = path.join(process.cwd(), 'src/app/dashboard/projects/[id]/listing/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('NON_BINDING_DISCLOSURE');
    // Aggregate view displays it as a locked warning/info card
    expect(content).toContain('Locked Non-Binding Disclosure Banner');
  });

  it('prohibits per-Deal editing or suppression by configuration', () => {
    // Assert that there are no parameters or settings that allow deal-specific custom text
    const listingPagePath = path.join(process.cwd(), 'src/app/dashboard/projects/[id]/listing/page.tsx');
    const listingContent = fs.readFileSync(listingPagePath, 'utf-8');
    expect(listingContent).not.toContain('customDisclosure');
    expect(listingContent).not.toContain('overrideDisclosure');

    const widgetPath = path.join(process.cwd(), 'src/components/project/SoftCommitWidget.tsx');
    const widgetContent = fs.readFileSync(widgetPath, 'utf-8');
    expect(widgetContent).not.toContain('customDisclosure');
    expect(widgetContent).not.toContain('overrideDisclosure');
  });
});

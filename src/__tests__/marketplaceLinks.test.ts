import fs from 'fs';
import path from 'path';

describe('Marketplace Integration Checks', () => {
  it('verifies projects/[id]/phase-2/page.tsx has no data-todo attributes left', () => {
    const filePath = path.resolve(__dirname, '../app/dashboard/projects/[id]/phase-2/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).not.toContain('data-todo');
  });

  it('verifies only Home Inspector and Real Estate Attorney links are retained on Phase 2 page', () => {
    const filePath = path.resolve(__dirname, '../app/dashboard/projects/[id]/phase-2/page.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check that Title Company, Insurance Agent, and Surveyor links were removed
    expect(content).not.toContain('Title Company');
    expect(content).not.toContain('Insurance Agent');
    expect(content).not.toContain('Surveyor');

    // Check that Home Inspector and Real Estate Attorney are still present
    expect(content).toContain('Home Inspector');
    expect(content).toContain('Real Estate Attorney');
    
    // Check they map to correct query parameters
    expect(content).toContain("type: 'Inspector'");
    expect(content).toContain("type: 'Lawyer'");
    expect(content).toContain('projectId=${projectId}');
  });
});

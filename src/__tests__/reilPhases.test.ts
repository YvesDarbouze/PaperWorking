import fs from 'fs';
import path from 'path';

describe('REIL Phase Marketing Copy Integrity', () => {
  const marketingFiles = [
    'src/components/marketing/VideoHero.tsx',
    'src/components/landing/LandingHeader.tsx',
    'src/components/landing/HowItWorks.tsx',
    'src/components/landing/FlippingPhases.tsx',
    'src/components/landing/LifecycleGrid.tsx',
  ];

  // Specific incorrect patterns used as phase labels
  const incorrectPatterns = [
    /phase:\s*['"](Purchase|Closing|Hold\s*&\s*Rehab|Hold\/Rehab|Hold\s*\+\s*Rehab)['"]/i,
    /['"](Purchase|Closing|Hold\s*&\s*Rehab|Hold\/Rehab|Hold\s*\+\s*Rehab)\s+Phase['"]/i,
  ];

  marketingFiles.forEach((fileRelativePath) => {
    const absolutePath = path.resolve(process.cwd(), fileRelativePath);

    if (fs.existsSync(absolutePath)) {
      it(`should only contain canonical phases and NOT incorrect phase labels in copy file: ${fileRelativePath}`, () => {
        const content = fs.readFileSync(absolutePath, 'utf8');

        // Verify that the files do not contain the incorrect phase patterns
        incorrectPatterns.forEach((pattern) => {
          const hasIncorrect = pattern.test(content);
          expect(hasIncorrect).toBe(false);
        });

        // For files that contain the phases structure, verify canonical phases exist in the file
        if (fileRelativePath !== 'src/components/marketing/VideoHero.tsx') {
          expect(content).toContain('Acquisition');
          expect(content).toContain('Fund');
          expect(content).toContain('Hold');
          expect(content).toContain('Exit');
        }
      });
    } else {
      it(`should skip checking missing file: ${fileRelativePath}`, () => {
        console.warn(`Marketing file not found at: ${absolutePath}`);
      });
    }
  });
});

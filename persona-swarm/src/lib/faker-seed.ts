/**
 * Persona Swarm Seeded Pseudo-Random Generator
 * 
 * Provides deterministic, reproducible fake data generation seeded per agent (P-NN → seed NN).
 */

export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /** Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive) */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /** Returns an integer in range [min, max] */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Picks one element from an array deterministically */
  pick<T>(arr: T[]): T {
    const idx = this.int(0, arr.length - 1);
    return arr[idx];
  }
}

const METRO_STREETS: Record<string, string[]> = {
  'Phoenix, AZ': ['Willetta St', 'Catalina Dr', 'Camelback Rd', 'Thomas Rd', 'Indian School Rd', 'Central Ave'],
  'Atlanta, GA': ['Peachtree St', 'Piedmont Ave', 'Moreland Ave', 'Ponce de Leon Ave', 'Cascade Rd', 'DeKalb Ave'],
  'Cleveland, OH': ['E 147th St', 'Lorain Ave', 'Detroit Ave', 'St Clair Ave', 'Euclid Ave', 'Kinsman Rd'],
  'Houston, TX': ['Westheimer Rd', 'Washington Ave', 'Heights Blvd', 'Montrose Blvd', 'Bissonnet St', 'Main St'],
  'Denver, CO': ['Colfax Ave', 'Broadway', 'Larimer St', 'Speer Blvd', 'Colorado Blvd', 'Federal Blvd'],
  'Minneapolis, MN': ['Hennepin Ave', 'Nicollet Ave', 'Lyndale Ave', 'Grand Ave', 'University Ave', 'Lake St'],
  'Charlotte, NC': ['Tryon St', 'South Blvd', 'Central Ave', 'Plaza Rd', 'Sharon Rd', 'Providence Rd'],
  'Austin, TX': ['Congress Ave', 'Lamar Blvd', 'Guadalupe St', 'Burnet Rd', 'Enfield Rd', 'East 6th St'],
  'Nashville, TN': ['Broadway', 'West End Ave', 'Gallatin Pike', 'Charlotte Ave', '8th Ave S', 'Nolensville Pike'],
  'Chicago, IL': ['Michigan Ave', 'Halsted St', 'Clark St', 'Milwaukee Ave', 'Ashland Ave', 'Western Ave'],
  'Dallas, TX': ['Preston Rd', 'Greenville Ave', 'Oak Lawn Ave', 'Gaston Ave', 'Abrams Rd', 'Ross Ave'],
  'Miami, FL': ['Biscayne Blvd', 'Ocean Dr', 'Brickell Ave', 'Calle Ocho', 'Coral Way', 'Flagler St'],
  'New York, NY': ['5th Ave', 'Broadway', 'Park Ave', 'Lexington Ave', 'Madison Ave', 'Amsterdam Ave'],
  'San Francisco, CA': ['Market St', 'Mission St', 'Geary Blvd', 'Van Ness Ave', 'Valencia St', 'Lombard St'],
  'Boston, MA': ['Boylston St', 'Beacon St', 'Tremont St', 'Commonwealth Ave', 'Mass Ave', 'Newbury St'],
  'Washington, DC': ['Pennsylvania Ave', 'K St', 'Connecticut Ave', 'Wisconsin Ave', 'Georgia Ave', 'H St'],
  'Seattle, WA': ['Pike St', 'Pine St', '1st Ave', '2nd Ave', 'Rainier Ave', 'Aurora Ave'],
  'St. Louis, MO': ['Washington Ave', 'Delmar Blvd', 'Gravois Ave', 'Grand Blvd', 'Chouteau Ave', 'Lindell Blvd'],
  'Las Vegas, NV': ['Las Vegas Blvd', 'Charleston Blvd', 'Sahara Ave', 'Flamingo Rd', 'Tropicana Ave', 'Spring Mountain Rd'],
  'Raleigh, NC': ['Fayetteville St', 'Hillsborough St', 'Glenwood Ave', 'Six Forks Rd', 'Wake Forest Rd', 'Peace St'],
  'Hartford, CT': ['Asylum St', 'Farmington Ave', 'Capitol Ave', 'Main St', 'Albany Ave', 'Wethersfield Ave'],
  'Tampa, FL': ['Kennedy Blvd', 'Dale Mabry Hwy', 'Hillsborough Ave', 'Florida Ave', 'Neptune St', 'South MacDill Ave'],
};

/**
 * Generates a realistic street address for a persona's metro market.
 */
export function generateSeededAddress(agentId: string, projectIndex: number, metro: string): string {
  const seed = parseInt(agentId.replace(/\D/g, ''), 10) * 100 + projectIndex;
  const rng = new SeededRandom(seed);
  const houseNum = rng.int(100, 9999);
  const streets = METRO_STREETS[metro] || ['Main St', 'Oak Ave', 'Maple Rd', 'Pine St', 'Elm St'];
  const street = rng.pick(streets);
  return `${houseNum} ${street}`;
}

/**
 * Generates synthetic PDF document buffer watermarked "TEST — PERSONA SWARM".
 */
export function generateTestPdfBuffer(title: string, docType: string, agentId: string): Buffer {
  const content = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 120>> stream
BT
/F1 12 Tf
72 712 Td
(${title} - TEST — PERSONA SWARM) Tj
0 -20 Td
(Document Type: ${docType} | Agent: ${agentId}) Tj
0 -20 Td
(Watermark: TEST — PERSONA SWARM - Disposable Test Run Only) Tj
ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000062 00000 n 
0000000117 00000 n 
0000000188 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
350
%%EOF`;

  return Buffer.from(content, 'utf-8');
}

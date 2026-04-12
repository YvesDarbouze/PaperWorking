import { ApplicationUser } from '@/types/schema';

// Generate some mock lawyer accounts acting as local DB entries
const mockLawyers: ApplicationUser[] = [
  {
    uid: 'lawyer_001',
    organizationId: 'org_zanelaw',
    email: 'robert.zane@zanelaw.com',
    displayName: 'Robert Zane, Esq.',
    subscriptionPlan: 'Lawyer Lead-Gen',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    uid: 'lawyer_002',
    organizationId: 'org_pearsonhardman',
    email: 'jessica.pearson@pearsonhardman.com',
    displayName: 'Jessica Pearson, Esq.',
    subscriptionPlan: 'Lawyer Lead-Gen',
    subscriptionStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    uid: 'lawyer_003',
    organizationId: 'org_pearsonhardman',
    email: 'harvey.specter@pearsonhardman.com',
    displayName: 'Harvey Specter, Esq.',
    subscriptionPlan: 'Lawyer Lead-Gen',
    subscriptionStatus: 'inactive', // Should be filtered out
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function fetchStateMatchedLawyers(stateCode: string): Promise<ApplicationUser[]> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return lawyers who have an 'active' subscription
  return mockLawyers.filter(lawyer => lawyer.subscriptionStatus === 'active');
}

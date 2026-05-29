import { adminDb } from '@/lib/firebase/admin';
import { DealAnalyzerTerminal } from '@/components/intelligence/DealAnalyzerTerminal';
import { notFound } from 'next/navigation';
import { Project } from '@/types/schema';

export const revalidate = 0; // Dynamic route

export default async function ProjectAnalyzerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  // Fetch project from Firestore
  let projectData: Partial<Project> | null = null;
  try {
    const docSnap = await adminDb.collection('projects').doc(id).get();
    if (docSnap.exists) {
      projectData = docSnap.data() as Partial<Project>;
    } else {
      console.warn(`Project ${id} not found. Using fallback mock data.`);
    }
  } catch (error) {
    console.error('Error fetching project data:', error);
  }

  const financials = projectData?.financials;
  
  // 10 Core REI Data Points
  // If the Firestore schema is not fully established yet, we set up the data fetching
  // structure with a robust fallback/mock that matches the exact shape expected by the component.
  const hydratedData = {
    purchasePrice: financials?.purchasePrice ?? 325000,
    arv: (financials?.estimatedARV || financials?.arv) ?? 485000,
    rehabCost: (financials?.rehabBudget || financials?.actualRehabCost) ?? 65000,
    loanAmount: 275000, // To be added to schema
    interestRate: 7.5,  // To be added to schema
    loanTermYears: 30,  // To be added to schema
    monthlyRent: financials?.actualRentalIncome ?? 2800,
    vacancyRatePct: 5,  // To be added to schema
    monthlyTaxes: 350,  // To be added to schema
    monthlyInsurance: 180, // To be added to schema
    monthlyMaintenance: 150, // To be added to schema
    propertyMgmtPct: 8, // To be added to schema
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0b141a]">
      <DealAnalyzerTerminal data={hydratedData} />
    </div>
  );
}

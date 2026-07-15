import { adminDb } from '@/lib/firebase/admin';
import DealAnalyzer from '@/components/evaluation/DealAnalyzer';
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
      console.warn(`Project ${id} not found.`);
    }
  } catch (error) {
    console.error('Error fetching project data:', error);
  }

  const financials = projectData?.financials;
  
  // Map real values or leave them undefined so they show up as empty or clearly marked assumptions.
  const initialValues = {
    rental: {
      purchasePrice: financials?.purchasePrice,
      monthlyRent: financials?.monthlyGrossRent ?? financials?.projectedMonthlyRent,
      otherIncome: financials?.otherMonthlyIncome,
      vacancyRate: financials?.vacancyRatePercent ?? financials?.vacancyRate,
      interestRate: financials?.loanInterestRate,
      loanTermYears: financials?.loanTermYears,
      monthlyTaxes: financials?.operatingExpenseTaxes,
      monthlyInsurance: financials?.operatingExpenseInsurance,
      propertyMgmtPercent: financials?.propertyManagementFeePercent,
      monthlyHOA: financials?.monthlyHOA,
    },
    flip: {
      purchasePrice: financials?.purchasePrice,
      rehabCost: financials?.projectedRehabCost ?? financials?.rehabBudget,
      arv: financials?.estimatedARV ?? financials?.arv,
      loanAmount: financials?.loanAmount,
      interestRate: financials?.loanInterestRate,
    },
    mode: projectData?.dispositionType === 'SALE' ? 'flip' as const : 'rental' as const,
    arv: financials?.estimatedARV ?? financials?.arv,
    rehabEst: financials?.projectedRehabCost ?? financials?.rehabBudget,
    fixedCosts: financials?.fixedAcquisitionCosts,
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0d0a0b] p-6 lg:p-8">
      <DealAnalyzer projectId={id} initialValues={initialValues} />
    </div>
  );
}

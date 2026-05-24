function parseDateSafe(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d);
    }
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? null : d;
}

function calculateMortgageAmortization(
  loanAmount,
  interestRate,
  termYears,
  acquisitionDate,
  periodStart,
  periodEnd,
  soldDate
) {
  if (loanAmount <= 0 || interestRate <= 0 || termYears <= 0) {
    return { interest: 0, principal: 0 };
  }

  const monthlyRate = (interestRate / 100) / 12;
  const totalPayments = termYears * 12;
  
  // Monthly payment amount
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  if (isNaN(monthlyPayment) || !isFinite(monthlyPayment)) {
    return { interest: 0, principal: 0 };
  }

  const holdStart = acquisitionDate;
  const holdEnd = soldDate || new Date();

  let totalInterest = 0;
  let totalPrincipal = 0;

  // Iterate calendar month-by-calendar-month
  let current = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
  const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);

  console.log("Start holdStart:", holdStart.toISOString());
  console.log("Start holdEnd:", holdEnd.toISOString());

  while (current <= end) {
    // Check if current calendar month overlaps with hold period
    const currentMonthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    const overlapStart = new Date(Math.max(holdStart.getTime(), current.getTime()));
    const overlapEnd = new Date(Math.min(holdEnd.getTime(), currentMonthEnd.getTime()));

    console.log(`Month ${current.getFullYear()}-${current.getMonth()+1}:`);
    console.log("  currentMonthEnd:", currentMonthEnd.toISOString());
    console.log("  overlapStart:", overlapStart.toISOString());
    console.log("  overlapEnd:", overlapEnd.toISOString());

    if (overlapStart <= overlapEnd) {
      // Find the 1-indexed payment number since acquisition
      const elapsedMonths = (current.getFullYear() - holdStart.getFullYear()) * 12 + (current.getMonth() - holdStart.getMonth());
      console.log("  elapsedMonths:", elapsedMonths);
      
      if (elapsedMonths >= 0 && elapsedMonths < totalPayments) {
        // Amortize up to this payment number to find interest and principal splits
        let balance = loanAmount;
        let pInterest = 0;
        let pPrincipal = 0;

        for (let payNum = 0; payNum <= elapsedMonths; payNum++) {
          pInterest = balance * monthlyRate;
          pPrincipal = monthlyPayment - pInterest;
          balance = Math.max(0, balance - pPrincipal);
        }

        // Adjust for partial months if necessary
        const daysInMonth = currentMonthEnd.getDate();
        
        // Strip hours
        const activeStartDay = new Date(overlapStart.getFullYear(), overlapStart.getMonth(), overlapStart.getDate());
        const activeEndDay = new Date(overlapEnd.getFullYear(), overlapEnd.getMonth(), overlapEnd.getDate());
        const activeDays = Math.round((activeEndDay.getTime() - activeStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const activeFraction = Math.min(1, activeDays / daysInMonth);

        console.log(`  activeDays: ${activeDays}, daysInMonth: ${daysInMonth}, fraction: ${activeFraction}`);
        console.log(`  pInterest: ${pInterest}, pPrincipal: ${pPrincipal}`);

        totalInterest += pInterest * activeFraction;
        totalPrincipal += pPrincipal * activeFraction;
      }
    }
    current.setMonth(current.getMonth() + 1);
  }

  return {
    interest: Math.round(totalInterest * 100) / 100,
    principal: Math.round(totalPrincipal * 100) / 100
  };
}

const loanAmount = 300000;
const interestRate = 6.0;
const termYears = 30;
const acquisitionDate = parseDateSafe('2025-01-01');
const periodStart = new Date(2025, 0, 1);
const periodEnd = new Date(2025, 2, 31);
const soldDate = null;

const result = calculateMortgageAmortization(
  loanAmount,
  interestRate,
  termYears,
  acquisitionDate,
  periodStart,
  periodEnd,
  soldDate
);

console.log("Result:", result);

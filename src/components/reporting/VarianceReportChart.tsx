import React from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function VarianceReportChart() {
  const projects = useProjectStore(state => state.projects);

  const labels = projects.map(d => d.propertyName);

  const estimatedCosts = projects.map(d => {
    // If we have a base budget, use it. Otherwise, assume 0.
    return d.rehab?.baseBudget || 0;
  });

  const actualCosts = projects.map(d => {
    // Sum only approved costs to see real expenditures vs budget
    const approvedCosts = d.financials?.costs?.filter(c => c.approved) || [];
    return approvedCosts.reduce((acc, curr) => acc + curr.amount, 0);
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Original Estimated Rehab Budget',
        data: estimatedCosts,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Actual Approved Costs',
        data: actualCosts,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Variance Report: Estimated vs Actual Costs (By Property)',
        color: '#6b7280',
        font: {
          size: 14,
          weight: 'normal' as const
        }
      },
      tooltip: {
        callbacks: {
           label: function(context: any) {
             let label = context.dataset.label || '';
             if (label) {
                 label += ': ';
             }
             if (context.parsed.y !== null) {
                 label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
             }
             return label;
           }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  // If no projects have costs or rehab budgets, show placeholder
  const hasData = estimatedCosts.some(v => v > 0) || actualCosts.some(v => v > 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h3 className="text-lg font-bold text-gray-900">Capital Variance Report</h3>
           <p className="text-sm text-gray-500">Live monitoring of rehab budgets vs actual approved ledger entries.</p>
        </div>
      </div>
      
      <div className="h-80 w-full relative">
         {!hasData ? (
             <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No construction budget or cost data available yet.</p>
             </div>
         ) : (
            <Bar data={data} options={options} />
         )}
      </div>
    </div>
  );
}

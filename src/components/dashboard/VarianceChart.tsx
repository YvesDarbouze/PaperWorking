'use client';

import React from 'react';
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
import { useDealStore } from '@/store/dealStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function VarianceChart() {
  const deals = useDealStore(state => state.deals);

  // Group approved/projected spend across active deals for chart
  const data = {
    labels: deals.slice(0, 5).map(d => d.propertyName.split(' ')[0]), // Mock labels (first word of property)
    datasets: [
      {
        label: 'Approved Spend ($)',
        data: deals.slice(0, 5).map(d => d.financials.costs?.reduce((acc, cost) => acc + cost.amount, 0) || 50000),
        backgroundColor: '#111827', // Black/dark gray
        borderRadius: 4,
      },
      {
        label: 'Budget Target ($)',
        data: deals.slice(0, 5).map(d => d.financials.ARV * 0.7 || 80000), // Mock budget line based loosely on margin
        backgroundColor: '#e5e7eb', // Light gray
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
           usePointStyle: true,
           boxWidth: 8,
           font: { family: 'Inter', size: 11 },
           color: '#6b7280'
        }
      },
      tooltip: {
        backgroundColor: '#111827',
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
           color: '#f3f4f6',
        },
        ticks: {
           font: { family: 'Inter', size: 10 },
           color: '#9ca3af',
           callback: (value: any) => '$' + (value / 1000) + 'k'
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: {
           font: { family: 'Inter', size: 10 },
           color: '#6b7280'
        },
        border: { display: false }
      }
    }
  };

  return (
    <div className="w-full h-full min-h-[220px]">
      <Bar options={options} data={data} />
    </div>
  );
}

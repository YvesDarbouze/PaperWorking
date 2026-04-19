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
import { useProjectStore } from '@/store/projectStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function VarianceChart() {
  const projects = useProjectStore(state => state.projects);

  // Group approved/projected spend across active projects for chart
  const data = {
    labels: projects.slice(0, 5).map(d => d.propertyName.split(' ')[0]), // Mock labels (first word of property)
    datasets: [
      {
        label: 'Approved Spend',
        data: projects.slice(0, 5).map(d => d.financials.costs?.reduce((acc, cost) => acc + cost.amount, 0) || 50000),
        backgroundColor: '#000000', // PW BLACK
        borderRadius: 8,
        barThickness: 16,
      },
      {
        label: 'Budget Target',
        data: projects.slice(0, 5).map(d => (d.financials.estimatedARV || 0) * 0.7 || 80000), 
        backgroundColor: '#e5e7eb', // LIGHT GRAY
        borderRadius: 8,
        barThickness: 16,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
           usePointStyle: true,
           boxWidth: 6,
           boxHeight: 6,
           padding: 20,
           font: { family: 'Inter', size: 10, weight: 600 },
           color: '#71717a'
        }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#000000',
        bodyColor: '#71717a',
        borderColor: 'rgba(0,0,0,0.05)',
        borderWidth: 1,
        titleFont: { family: 'Inter', size: 12, weight: 600 },
        bodyFont: { family: 'Inter', size: 11 },
        padding: 16,
        cornerRadius: 16,
        displayColors: false,
        shadowBlur: 30,
        shadowColor: 'rgba(0,0,0,0.1)',
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
           color: 'rgba(0,0,0,0.03)',
           drawTicks: false,
        },
        ticks: {
           font: { family: 'Inter', size: 9, weight: 500 },
           color: '#a1a1aa',
           padding: 10,
           callback: (value: any) => '$' + (value / 1000) + 'k'
        },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: {
           font: { family: 'Inter', size: 9, weight: 500 },
           color: '#a1a1aa',
           padding: 10,
        },
        border: { display: false }
      }
    }
  };

  return (
    <div className="w-full h-full min-h-[260px] p-2">
      <Bar options={options} data={data} />
    </div>
  );
}

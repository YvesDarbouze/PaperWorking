import React from 'react';

interface LifecycleCardProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function LifecycleCard({ number, title, description, icon }: LifecycleCardProps) {
  return (
    <div className="flex flex-col border border-gray-200 bg-white p-8 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-4">
         <span className="text-gray-400 font-mono text-sm tracking-tighter">0{number} //</span>
         <div className="w-8 h-8 rounded-full bg-[#f2f2f2] flex items-center justify-center text-gray-900 border border-gray-200">
            {icon}
         </div>
      </div>
      <h3 className="text-xl font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

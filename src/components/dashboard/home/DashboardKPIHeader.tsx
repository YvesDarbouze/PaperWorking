'use client';

import { Card, CardContent } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowUpRight, ArrowDownRight, FileText, PenTool, Zap, HardDrive } from "lucide-react";

// Mock data for sparklines
const generateSparklineData = (positive: boolean) => {
  let value = positive ? 10 : 50;
  return Array.from({ length: 15 }).map((_, i) => {
    value += positive ? Math.random() * 5 : (Math.random() * 10 - 7);
    return { value };
  });
};

const kpis = [
  {
    title: "Total Documents",
    value: "1,248",
    change: "↑ 12% vs. last week",
    positive: true,
    data: generateSparklineData(true),
    icon: FileText,
    color: "#16a34a"
  },
  {
    title: "Pending Signatures",
    value: "14",
    change: "↓ 5% vs. last week",
    positive: true, // Decreasing pending is good
    data: generateSparklineData(false),
    icon: PenTool,
    color: "#16a34a"
  },
  {
    title: "Team Efficiency",
    value: "94%",
    change: "↑ 2% vs. last week",
    positive: true,
    data: generateSparklineData(true),
    icon: Zap,
    color: "#16a34a"
  },
  {
    title: "Storage Usage",
    value: "45.2 GB",
    change: "↑ 8% vs. last week",
    positive: false, // Increasing storage might be bad or neutral, we'll mark as neutral/negative for variety
    data: generateSparklineData(true),
    icon: HardDrive,
    color: "#d97706"
  }
];

export default function DashboardKPIHeader() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <Card key={i} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#595959]" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${kpi.positive ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {kpi.change.split(' ')[1]}
                </div>
              </div>
              <div className="flex flex-col mb-4">
                <h3 className="text-3xl font-light tracking-tight text-[#595959]">{kpi.value}</h3>
                <p className="text-xs font-medium text-[#7F7F7F] uppercase tracking-wider">{kpi.title}</p>
              </div>
              <div className="h-16 w-full -mx-2 -mb-2 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpi.color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={kpi.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={kpi.color} 
                      fillOpacity={1} 
                      fill={`url(#color-${i})`} 
                      strokeWidth={2} 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileText, X, Download, Share2 } from "lucide-react";

type ActivityStatus = "Complete" | "Pending" | "Overdue";

interface Activity {
  id: string;
  name: string;
  type: string;
  date: string;
  amount: number;
  status: ActivityStatus;
}

const recentActivities: Activity[] = [
  { id: "1", name: "Acme Corp NDA", type: "Legal", date: "2026-05-08", amount: 0, status: "Pending" },
  { id: "2", name: "Q1 Financial Report", type: "Finance", date: "2026-05-07", amount: 15420.50, status: "Complete" },
  { id: "3", name: "Vendor Agreement - Tech Solutions", type: "Contract", date: "2026-05-05", amount: 5000.00, status: "Complete" },
  { id: "4", name: "Employee Handbook Update", type: "HR", date: "2026-05-01", amount: 0, status: "Overdue" },
  { id: "5", name: "Series B Term Sheet", type: "Investment", date: "2026-04-28", amount: 2500000.00, status: "Complete" },
  { id: "6", name: "Office Lease Renewal", type: "Real Estate", date: "2026-04-25", amount: 12000.00, status: "Pending" },
];

export default function RecentActivityTable() {
  const [selectedDoc, setSelectedDoc] = useState<Activity | null>(null);

  const getBadgeVariant = (status: ActivityStatus) => {
    switch (status) {
      case "Complete": return "success";
      case "Pending": return "warning";
      case "Overdue": return "destructive";
      default: return "default";
    }
  };

  return (
    <div className="flex gap-6 relative w-full h-[600px]">
      {/* Table Container */}
      <div className={`transition-all duration-300 ease-in-out h-full overflow-hidden ${selectedDoc ? 'w-full lg:w-2/3' : 'w-full'}`}>
        <Card className="h-full flex flex-col overflow-hidden">
          <div className="p-6 pb-0 mb-4 flex-shrink-0">
            <h2 className="text-xl font-medium text-[#595959]">Recent Activity</h2>
            <p className="text-sm text-[#7F7F7F] mt-1">Review and manage recent document workflows.</p>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-6 relative">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:border-b after:border-[#A5A5A5]/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-[#7F7F7F]">Document Name</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Type</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Date</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Status</TableHead>
                  <TableHead className="text-right font-semibold text-[#7F7F7F]">Value (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((activity, index) => (
                  <TableRow 
                    key={activity.id} 
                    className={`cursor-pointer group hover:bg-[#F2F2F2]/80 transition-colors ${index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-[#FFFFFF]'}`}
                    onClick={() => setSelectedDoc(activity)}
                    data-state={selectedDoc?.id === activity.id ? "selected" : undefined}
                  >
                    <TableCell className="font-medium text-[#595959]">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[#A5A5A5] group-hover:text-[#595959] transition-colors" />
                        {activity.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#7F7F7F]">{activity.type}</TableCell>
                    <TableCell className="text-[#7F7F7F]">{activity.date}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(activity.status)}>
                        {activity.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-[#7F7F7F]">
                      {activity.amount > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(activity.amount) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Split Pane Preview */}
      {selectedDoc && (
        <div className="hidden lg:flex w-1/3 h-full animate-in slide-in-from-right-8 duration-300">
          <Card className="w-full h-full flex flex-col overflow-hidden border-[#A5A5A5]/50 bg-[#F2F2F2]/30">
            <div className="p-4 flex items-center justify-between border-b border-[#A5A5A5]/20 bg-[#FFFFFF]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#595959]" />
                <span className="text-sm font-semibold text-[#595959] truncate w-40" title={selectedDoc.name}>{selectedDoc.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-[#7F7F7F] hover:text-[#595959] hover:bg-[#F2F2F2] rounded-md transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-[#7F7F7F] hover:text-[#595959] hover:bg-[#F2F2F2] rounded-md transition-colors" title="Share">
                  <Share2 className="w-4 h-4" />
                </button>
                <button 
                  className="p-1.5 text-[#7F7F7F] hover:text-[#595959] hover:bg-[#F2F2F2] rounded-md transition-colors ml-2" 
                  onClick={() => setSelectedDoc(null)}
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Mock Document Preview Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-[#FFFFFF] w-full min-h-[600px] shadow-sm border border-[#A5A5A5]/20 rounded p-8 flex flex-col mx-auto max-w-md">
                <div className="w-1/3 h-4 bg-[#F2F2F2] rounded mb-8" />
                <div className="w-2/3 h-8 bg-[#F2F2F2] rounded mb-12" />
                
                <div className="space-y-4 flex-1">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className={`h-2.5 bg-[#F2F2F2] rounded ${i % 3 === 0 ? 'w-5/6' : 'w-full'}`} />
                  ))}
                  <div className="h-6" />
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i + 10} className={`h-2.5 bg-[#F2F2F2] rounded ${i % 4 === 0 ? 'w-4/5' : 'w-full'}`} />
                  ))}
                </div>

                <div className="mt-12 flex justify-between items-end">
                  <div className="w-24 h-10 border-b border-[#A5A5A5]/30 flex items-end pb-1">
                    <span className="text-[10px] text-[#A5A5A5] uppercase tracking-widest">Signature</span>
                  </div>
                  <div className="w-24 h-10 border-b border-[#A5A5A5]/30 flex items-end pb-1">
                    <span className="text-[10px] text-[#A5A5A5] uppercase tracking-widest">Date</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

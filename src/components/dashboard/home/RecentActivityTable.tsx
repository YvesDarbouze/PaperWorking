'use client';

import { useState, useMemo } from "react";
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
import { useProjectStore } from "@/store/projectStore";

type ActivityStatus = "Complete" | "Pending" | "Overdue";

interface Activity {
  id: string;
  name: string;
  type: string;
  date: string;
  amount: number;
  status: ActivityStatus;
  fileUrl?: string;
  projectId?: string;
  projectName?: string;
}

export default function RecentActivityTable() {
  const [selectedDoc, setSelectedDoc] = useState<Activity | null>(null);
  const projects = useProjectStore(state => state.projects);

  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];
    
    projects.forEach(project => {
       // 1. Role Linked Documents
       project.roleLinkedDocuments?.forEach(doc => {
         activities.push({
           id: `role-${doc.id}`,
           name: doc.fileName || doc.category,
           type: doc.category,
           date: new Date(doc.uploadedAt || new Date()).toLocaleDateString(),
           amount: 0,
           status: doc.verified ? 'Complete' : 'Pending',
           fileUrl: doc.fileUrl,
           projectId: project.id,
           projectName: project.propertyName,
         });
       });

       // 2. Settlement Documents
       project.settlementDocuments?.forEach(doc => {
         activities.push({
           id: `settlement-${doc.id}`,
           name: doc.fileName || doc.type,
           type: 'Settlement',
           date: new Date(doc.uploadedAt || new Date()).toLocaleDateString(),
           amount: 0,
           status: 'Complete',
           fileUrl: doc.fileUrl,
           projectId: project.id,
           projectName: project.propertyName,
         });
       });

       // 3. LOI Documents
       project.loiDocuments?.forEach(doc => {
         activities.push({
           id: `loi-${doc.id}`,
           name: doc.fileName || 'LOI Document',
           type: 'LOI',
           date: new Date(doc.createdAt || new Date()).toLocaleDateString(),
           amount: doc.amount || 0,
           status: doc.status === 'Accepted' || doc.status === 'Signed' ? 'Complete' : 'Pending',
           fileUrl: doc.documentUrl,
           projectId: project.id,
           projectName: project.propertyName,
         });
       });
       
       // 4. Action Items (Tasks that are completed)
       project.actionItems?.forEach(item => {
         if (item.completed) {
           activities.push({
             id: `task-${item.id}`,
             name: item.label || 'Task Completed',
             type: 'Task',
             date: new Date(item.completedAt || new Date()).toLocaleDateString(),
             amount: 0,
             status: 'Complete',
             projectId: project.id,
             projectName: project.propertyName,
           });
         }
       });
       
       // 5. Ledger Items (Approved/Pending Costs)
       const ledgerItems = useProjectStore.getState().ledgerItems[project.id] || [];
       ledgerItems.forEach(item => {
         activities.push({
           id: `ledger-${item.id}`,
           name: item.description || 'Expense',
           type: 'Expense',
           date: new Date(item.createdAt || new Date()).toLocaleDateString(),
           amount: item.amount || 0,
           status: item.status === 'Approved' || item.status === 'Settled' ? 'Complete' : item.status === 'Rejected' ? 'Overdue' : 'Pending',
           fileUrl: item.receiptUrl,
           projectId: project.id,
           projectName: project.propertyName,
         });
       });
    });

    // Sort by date descending
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
  }, [projects]);

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
            <h2 className="text-xl font-medium text-[#595959]">Deal Activity</h2>
            <p className="text-sm text-[#7F7F7F] mt-1">Documents, tasks, and expenses across your portfolio.</p>
          </div>
          <div className="flex-1 overflow-auto px-6 pb-6 relative">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-white after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:border-b after:border-[#A5A5A5]/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-[#7F7F7F]">Activity</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Project</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Type</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Date</TableHead>
                  <TableHead className="font-semibold text-[#7F7F7F]">Status</TableHead>
                  <TableHead className="text-right font-semibold text-[#7F7F7F]">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-secondary">
                      Activity will appear here as you add deals and upload documents.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentActivities.map((activity, index) => (
                    <TableRow 
                      key={activity.id} 
                      className={`cursor-pointer group hover:bg-[#F2F2F2]/80 transition-colors ${index % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-[#FFFFFF]'}`}
                      onClick={() => setSelectedDoc(activity)}
                      data-state={selectedDoc?.id === activity.id ? "selected" : undefined}
                    >
                      <TableCell className="font-medium text-[#595959]">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[#A5A5A5] group-hover:text-[#595959] transition-colors" />
                          <span className="truncate max-w-[150px] sm:max-w-[200px]" title={activity.name}>{activity.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#7F7F7F]">
                        <span className="truncate max-w-[120px] block" title={activity.projectName || 'Unknown'}>{activity.projectName || '-'}</span>
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
                  ))
                )}
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
                {selectedDoc.fileUrl && (
                  <a href={selectedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-[#7F7F7F] hover:text-[#595959] hover:bg-[#F2F2F2] rounded-md transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                )}
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
            
            {/* Document Preview Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedDoc.fileUrl ? (
                <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-white border border-border-accent rounded">
                  {selectedDoc.fileUrl.endsWith('.pdf') ? (
                    <iframe src={selectedDoc.fileUrl} className="w-full h-full" title={selectedDoc.name} />
                  ) : selectedDoc.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                     // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedDoc.fileUrl} alt={selectedDoc.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center p-6">
                      <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                      <p className="text-text-primary font-medium mb-2">File preview not available</p>
                      <a href={selectedDoc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-pw-accent hover:underline text-sm">Download to view</a>
                    </div>
                  )}
                </div>
              ) : (
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
                  
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                    <p className="text-sm font-medium text-text-secondary bg-white px-4 py-2 border border-border-accent rounded shadow-sm">No document uploaded yet</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


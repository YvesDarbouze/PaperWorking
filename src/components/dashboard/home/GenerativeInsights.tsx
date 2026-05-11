'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

export default function GenerativeInsights() {
  return (
    <Card className="bg-[#595959] text-white border-transparent overflow-hidden relative shadow-md">
      <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      <CardContent className="p-6 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-medium tracking-tight mb-1">Today&apos;s Priorities</h3>
            <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
              You have <strong>3 documents</strong> awaiting your signature before 5 PM today. The "Acme Corp NDA" has been reviewed by legal and is marked as high priority. Storage usage increased unexpectedly yesterday; consider archiving old portfolios.
            </p>
          </div>
        </div>
        <button className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-white text-[#595959] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#F2F2F2] transition-colors">
          Review Now
          <ArrowRight className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
}

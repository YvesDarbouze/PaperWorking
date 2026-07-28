import React from "react";
import { CommandCenter } from "@/components/dashboard/command-center/CommandCenter";

export const metadata = {
  title: "Portfolio Command Center | PaperWorking",
  description: "View key portfolio metrics, deal pipeline, and system audit logs in the Command Center.",
};

export default function CommandCenterPage() {
  return (
    <div className="command-center-desk min-h-full bg-transparent">
      <CommandCenter />
    </div>
  );
}

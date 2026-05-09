import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "overdue";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider",
        {
          "bg-[#595959] text-[#FFFFFF] hover:bg-[#595959]/80": variant === "default",
          "bg-[#F2F2F2] text-[#595959] hover:bg-[#F2F2F2]/80": variant === "secondary",
          "text-[#595959] border border-[#A5A5A5]": variant === "outline",
          "bg-green-100 text-green-800 border-transparent": variant === "success",
          "bg-amber-100 text-amber-800 border-transparent": variant === "warning",
          "bg-red-100 text-red-800 border-transparent": variant === "destructive" || variant === "overdue",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }

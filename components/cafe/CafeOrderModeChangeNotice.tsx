"use client";

import { AlertTriangle } from "lucide-react";
import { useCafeOrderModeReportNotices } from "@/hooks/useCafeOrderMode";

export function CafeOrderModeChangeNotice() {
  const notices = useCafeOrderModeReportNotices();
  if (notices.length === 0) return null;

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <div
          key={notice.switchedAt}
          className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/8 p-4"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{notice.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {notice.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

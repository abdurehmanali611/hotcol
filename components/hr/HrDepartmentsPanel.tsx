"use client";

import {
  HrDepartmentEditor,
} from "@/components/hr/HrDepartmentEditor";
import {
  HrPanelShell,
  HrSectionCard,
} from "@/components/hr/hrChrome";
import { Building2 } from "lucide-react";

export function HrDepartmentsPanel() {
  return (
    <HrPanelShell>
      <HrSectionCard
        title="Departments"
        description="Register departments for shift scheduling. HR picks from this list when assigning coverage."
        icon={<Building2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
        accent="bg-linear-to-r from-sky-500 via-cyan-400 to-primary/70"
      >
        <HrDepartmentEditor />
      </HrSectionCard>
    </HrPanelShell>
  );
}

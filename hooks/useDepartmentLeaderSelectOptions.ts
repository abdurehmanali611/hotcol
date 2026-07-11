"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDepartmentLeaders } from "@/lib/api/departmentLeaders";
import {
  selectOptionsForDepartments,
  type DepartmentLeaderRow,
  type DepartmentLeaderSelectOption,
} from "@/lib/departments";
import { rowHotelMatchesTenantScope } from "@/lib/tenantRowMatch";

export type DepartmentSelectOption = DepartmentLeaderSelectOption;

export function useDepartmentLeaderSelectOptions(
  allowedDepartments: readonly string[],
  opts?: { perLeader?: boolean },
) {
  const [leaders, setLeaders] = useState<DepartmentLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const perLeader = opts?.perLeader !== false;

  useEffect(() => {
    let cancelled = false;
    void fetchDepartmentLeaders()
      .then((rows) => {
        if (cancelled) return;
        // Defense in depth: never surface another property's leaders.
        setLeaders(
          rows.filter((row) => rowHotelMatchesTenantScope(row.HotelName, null)),
        );
      })
      .catch(() => {
        if (!cancelled) setLeaders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(
    () =>
      selectOptionsForDepartments(leaders, allowedDepartments, { perLeader }),
    [leaders, allowedDepartments, perLeader],
  );

  return { options, loading };
}

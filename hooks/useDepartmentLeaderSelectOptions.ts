"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchDepartmentLeaders } from "@/lib/api/departmentLeaders";
import {
  selectOptionsForDepartments,
  type DepartmentLeaderRow,
} from "@/lib/departments";

export type DepartmentSelectOption = { value: string; label: string };

export function useDepartmentLeaderSelectOptions(
  allowedDepartments: readonly string[],
) {
  const [leaders, setLeaders] = useState<DepartmentLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchDepartmentLeaders()
      .then((rows) => {
        if (!cancelled) setLeaders(rows);
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
    () => selectOptionsForDepartments(leaders, allowedDepartments),
    [leaders, allowedDepartments],
  );

  return { options, loading };
}

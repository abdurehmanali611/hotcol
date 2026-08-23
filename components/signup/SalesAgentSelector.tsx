"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SalesAgentOption = {
  id: number;
  displayName: string;
  phone?: string | null;
  city?: string | null;
};

const NONE = "none";

export function SalesAgentSelector({
  value,
  onChange,
  agents,
  loading,
  disabled,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  agents: SalesAgentOption[];
  loading?: boolean;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(!loading);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  return (
    <Select
      value={value != null ? String(value) : NONE}
      onValueChange={(next) => {
        if (next === NONE) onChange(null);
        else onChange(Number(next));
      }}
      disabled={disabled || !ready}
    >
      <SelectTrigger className="h-11 w-full">
        <SelectValue
          placeholder={loading ? "Loading sales agents…" : "No sales agent"}
        />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No sales agent (I found HotCol myself)</SelectItem>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={String(agent.id)}>
            {agent.displayName}
            {agent.city ? ` · ${agent.city}` : ""}
            {agent.phone ? ` · ${agent.phone}` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

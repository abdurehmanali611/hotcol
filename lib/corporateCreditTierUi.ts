/** Fallback accents when level name is unknown (by sort order). */
export function getCorporateTierAccent(sortOrder: number) {
  const cycles = [
    {
      borderAccent: "border-amber-500/20",
      badge:
        "text-amber-500 border-amber-500/20 bg-amber-500/5",
    },
    {
      borderAccent: "border-slate-400/20",
      badge:
        "text-slate-400 border-slate-400/20 bg-slate-400/5",
    },
    {
      borderAccent: "border-orange-700/20",
      badge:
        "text-orange-700 border-orange-700/20 bg-orange-700/5",
    },
  ] as const;
  const i = ((sortOrder % 3) + 3) % 3;
  return cycles[i];
}

/** Match café `AdminCredit` `getLevelColor` / card accents by level name. */
export function getCafeCreditLevelAccent(level: string) {
  switch (level) {
    case "Platinum":
      return {
        borderAccent: "border-cyan-400/25",
        badge:
          "text-cyan-200 border-cyan-400/25 bg-cyan-400/10",
      };
    case "Gold":
      return {
        borderAccent: "border-amber-500/20",
        badge: "text-amber-500 border-amber-500/20 bg-amber-500/5",
      };
    case "Silver":
      return {
        borderAccent: "border-slate-400/20",
        badge: "text-slate-400 border-slate-400/20 bg-slate-400/5",
      };
    case "Bronze":
      return {
        borderAccent: "border-orange-700/20",
        badge: "text-orange-700 border-orange-700/20 bg-orange-700/5",
      };
    default:
      return getCorporateTierAccent(0);
  }
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { APEX_SOLUTION } from "@/constants/branding";

export const AUTH_CARD_CLASS =
  "auth-shimmer relative overflow-hidden rounded-2xl border-violet-500/20 bg-linear-to-br from-violet-500/14 via-card/85 to-indigo-500/14 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.72),0_0_44px_-12px_rgba(139,92,246,0.28)] ring-1 ring-violet-500/15 backdrop-blur-md before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-linear-to-r before:from-violet-400 before:to-indigo-400";

export const AUTH_PANEL_WARM =
  "rounded-2xl border border-violet-500/25 bg-linear-to-br from-violet-500/16 via-card/80 to-purple-500/8 p-4 shadow-sm ring-1 ring-violet-500/10";

export const AUTH_PANEL_COOL =
  "rounded-2xl border border-indigo-500/25 bg-linear-to-br from-indigo-500/16 via-card/80 to-blue-900/8 p-4 shadow-sm ring-1 ring-indigo-500/10";

export const AUTH_BAND =
  "border-violet-500/20 bg-linear-to-r from-violet-500/14 via-card/40 to-indigo-500/10";

export const AUTH_EYEBROW =
  "text-[11px] font-medium tracking-[0.22em] text-violet-300 uppercase";

export const AUTH_TITLE =
  "bg-linear-to-r from-violet-100 via-fuchsia-200 to-indigo-200 bg-clip-text font-semibold tracking-tight text-transparent";

export const AUTH_SUBTITLE = "leading-relaxed text-pretty text-violet-200/70";

export const AUTH_MUTED = "text-violet-200/55";

export const AUTH_LABEL_WARM =
  "text-[13px] font-medium tracking-wide text-violet-200!";

export const AUTH_LABEL_COOL =
  "text-[13px] font-medium tracking-wide text-indigo-200!";

export const AUTH_LINK =
  "font-medium text-violet-300 underline-offset-4 transition-colors hover:text-fuchsia-300 hover:underline";

export const AUTH_BUTTON =
  "bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500";

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-3.5">
      <div
        className={cn(
          "auth-mark-glow relative flex items-center justify-center rounded-xl bg-linear-to-br from-violet-300 via-fuchsia-500 to-indigo-700 font-bold text-white ring-1 ring-violet-200/40",
          size === "sm" ? "h-10 w-10 text-base" : "h-12 w-12 text-lg",
        )}
      >
        H
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "auth-brand-shine font-extrabold tracking-[0.22em] bg-linear-to-r from-violet-200 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(167,139,250,0.55)]",
            size === "sm" ? "text-lg" : "text-[1.45rem]",
          )}
        >
          HOTCOL
        </p>
        <p
          className={cn(
            "mt-0.5 font-semibold tracking-[0.16em] text-violet-300 uppercase",
            size === "sm" ? "text-[9px]" : "text-[11px]",
          )}
        >
          Hospitality operations
        </p>
      </div>
    </div>
  );
}

export function AuthPageShell({
  children,
  className,
  compact = false,
}: {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className="dark min-h-dvh text-foreground lg:grid lg:grid-cols-[minmax(300px,38%)_1fr]">
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#16121c] via-[#12101a] to-[#0e1018] lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:px-12 lg:py-14">
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute -left-16 -top-10 h-80 w-80 rounded-full bg-violet-400/22 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-b pointer-events-none absolute -bottom-16 right-[-20%] h-72 w-72 rounded-full bg-indigo-500/22 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-grid-shift pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.14) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 70% at 20% 40%, black, transparent)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 20% 40%, black, transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-10 right-0 w-px bg-linear-to-b from-transparent via-white/12 to-transparent"
        />
        <div className="auth-fade-right relative">
          <BrandMark />
        </div>
        <div className="relative mt-2 flex max-w-sm flex-col gap-7">
          <p className="auth-rise auth-delay-1 flex w-fit items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
            </span>
            Staff portal
          </p>
          <p className="auth-rise auth-delay-1 text-[2.05rem] font-bold leading-[1.15] tracking-tight text-balance text-foreground">
            Quiet, polished control{" "}
            <span className="bg-linear-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              for cafés and hotels
            </span>
            .
          </p>
          <p className="auth-rise auth-delay-2 text-sm leading-relaxed text-muted-foreground">
            One place for orders, lodging, and the people who run them — built
            for the floor, not a demo.
          </p>
        </div>
        <a
          href={APEX_SOLUTION.website}
          target="_blank"
          rel="noopener noreferrer"
          className="auth-rise auth-delay-3 relative text-xs tracking-[0.18em] text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
        >
          {APEX_SOLUTION.name}
        </a>
      </aside>

      <div
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden bg-linear-to-br from-[#16121c] via-[#101018] to-[#0e1018] px-4",
          compact ? "h-dvh py-4" : "min-h-dvh py-10",
        )}
      >
        <div
          aria-hidden
          className="auth-orb-c pointer-events-none absolute left-1/2 top-[-10%] h-96 w-96 -translate-x-1/2 rounded-full bg-violet-400/18 blur-3xl"
        />
        <div
          aria-hidden
          className="auth-orb-a pointer-events-none absolute bottom-[-18%] right-[-8%] h-80 w-80 rounded-full bg-indigo-500/18 blur-3xl"
        />
        <div className={cn("relative lg:hidden", compact ? "mb-3" : "mb-8")}>
          <BrandMark size="sm" />
        </div>
        <div
          className={cn(
            "relative z-10 flex w-full flex-col items-center",
            className,
          )}
        >
          <div className="auth-rise relative z-10 flex w-full flex-col items-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

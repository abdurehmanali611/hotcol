"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Music2, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CLASSICAL_DEFAULT_VOLUME,
  CLASSICAL_PLAYLISTS,
  CLASSICAL_STORAGE_KEY,
  type ClassicalPlaylist,
} from "@/lib/classicalPlaylists";

type StoredState = {
  playlistId: string;
  volume: number;
  muted: boolean;
  minimized: boolean;
};

const AUTH_HIDDEN_PATHS = new Set(["/", "/SignUp"]);

function readStored(): StoredState {
  try {
    const raw = localStorage.getItem(CLASSICAL_STORAGE_KEY);
    if (!raw) {
      return {
        playlistId: CLASSICAL_PLAYLISTS[0].id,
        volume: CLASSICAL_DEFAULT_VOLUME,
        muted: false,
        minimized: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    const playlistId = CLASSICAL_PLAYLISTS.some((p) => p.id === parsed.playlistId)
      ? parsed.playlistId!
      : CLASSICAL_PLAYLISTS[0].id;
    const volume = Math.min(1, Math.max(0, Number(parsed.volume) || CLASSICAL_DEFAULT_VOLUME));
    return {
      playlistId,
      volume,
      muted: Boolean(parsed.muted),
      minimized: Boolean(parsed.minimized),
    };
  } catch {
    return {
      playlistId: CLASSICAL_PLAYLISTS[0].id,
      volume: CLASSICAL_DEFAULT_VOLUME,
      muted: false,
      minimized: false,
    };
  }
}

export function ClassicalAmbientPlayer() {
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [computer, setComputer] = useState(true);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playlistId, setPlaylistId] = useState(CLASSICAL_PLAYLISTS[0].id);
  const [volume, setVolume] = useState(CLASSICAL_DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const wasPlayingRef = useRef(false);

  const playlist = useMemo(
    () => CLASSICAL_PLAYLISTS.find((item) => item.id === playlistId) ?? CLASSICAL_PLAYLISTS[0],
    [playlistId],
  );

  const silent = computer ? muted || volume <= 0.004 : volume <= 0.004;
  const hideOnRoute = AUTH_HIDDEN_PATHS.has(pathname);

  useEffect(() => {
    setMounted(true);
    setLoggedIn(Boolean(localStorage.getItem("auth_token") || localStorage.getItem("user_role")));
    const stored = readStored();
    setPlaylistId(stored.playlistId);
    setVolume(stored.volume);
    setMuted(stored.muted);
    setMinimized(stored.minimized);
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncPointer = () => setComputer(media.matches);
    syncPointer();
    media.addEventListener("change", syncPointer);
    return () => media.removeEventListener("change", syncPointer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(
      CLASSICAL_STORAGE_KEY,
      JSON.stringify({ playlistId, volume, muted, minimized }),
    );
  }, [mounted, playlistId, volume, muted, minimized]);

  const minimizePlayer = () => {
    const audio = audioRef.current;
    wasPlayingRef.current = Boolean(audio && !audio.paused);
    if (audio && !audio.paused) audio.pause();
    setOpen(false);
    setMinimized(true);
  };

  const restorePlayer = async () => {
    setMinimized(false);
    if (!wasPlayingRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    applyAudio();
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const applyAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== new URL(playlist.src, window.location.origin).href) {
      audio.src = playlist.src;
    }
    audio.loop = true;
    audio.volume = volume;
    audio.muted = computer ? muted : false;
  }, [computer, muted, playlist.src, volume]);

  useEffect(() => {
    applyAudio();
  }, [applyAudio]);

  const startPlaylist = async (next: ClassicalPlaylist) => {
    setPlaylistId(next.id);
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== new URL(next.src, window.location.origin).href) {
      audio.src = next.src;
    }
    audio.loop = true;
    audio.volume = volume;
    audio.muted = computer ? muted : false;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!computer) return;
    setMuted((current) => {
      const next = !current;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  const onVolume = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolume(clamped);
    if (computer && clamped > 0.004) setMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      if (computer && clamped > 0.004) audioRef.current.muted = false;
    }
  };

  const openPanel = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  useEffect(() => {
    if (computer || !open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const root = document.getElementById("classical-ambient-root");
      if (root && target && !root.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [computer, open]);

  if (!mounted || hideOnRoute || !loggedIn) return null;

  return (
    <div
      id="classical-ambient-root"
      className="pointer-events-none fixed right-[max(1.15rem,env(safe-area-inset-right))] bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-40 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
      onMouseEnter={!minimized && computer ? openPanel : undefined}
      onMouseLeave={!minimized && computer ? scheduleClose : undefined}
    >
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {minimized ? (
        <button
          type="button"
          aria-label="Show classical player"
          onClick={() => void restorePlayer()}
          className="pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-full border border-[#c4a574]/30 bg-[#0c0a08]/88 px-2.5 py-1.5 text-[#d4b896] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)] ring-1 ring-white/8 backdrop-blur-md transition-transform duration-200 hover:scale-[1.03] hover:border-[#c4a574]/50 focus-visible:ring-2 focus-visible:ring-[#d4b896]/60"
        >
          <Music2 className="size-3.5" strokeWidth={1.75} />
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">Classical</span>
        </button>
      ) : (
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <div
            className={cn(
              "w-max max-w-[calc(100vw-2.5rem)] origin-bottom-right overflow-hidden rounded-2xl border border-[#c4a574]/25 bg-[#0c0a08]/92 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.8),0_0_40px_-16px_rgba(166,139,91,0.35)] ring-1 ring-white/8 backdrop-blur-xl transition-all duration-300",
              open
                ? "visible translate-y-0 scale-100 opacity-100"
                : "invisible translate-y-2 scale-95 opacity-0",
            )}
          >
            <div className="border-b border-[#c4a574]/15 px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d4b896] uppercase">
                Classical floor
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#d4b896]/70">
                Pick a list to start
              </p>
            </div>

            <div className={cn("flex w-max", computer ? "flex-row" : "flex-col")}>
              <ul className="w-max space-y-0.5 p-1.5">
                {CLASSICAL_PLAYLISTS.map((item) => {
                  const active = item.id === playlist.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void startPlaylist(item)}
                        className={cn(
                          "flex w-full cursor-pointer flex-col whitespace-nowrap rounded-xl px-2.5 py-1.5 text-left transition-colors",
                          active
                            ? "bg-[#c4a574]/18 text-[#f3e6cc]"
                            : "text-[#e8dcc4]/80 hover:bg-white/5 hover:text-[#f3e6cc]",
                        )}
                      >
                        <span className="text-sm font-medium tracking-tight">{item.label}</span>
                        <span className="text-[11px] text-[#d4b896]/70">{item.composer}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div
                className={cn(
                  "flex items-center justify-center gap-3 border-[#c4a574]/15",
                  computer
                    ? "w-14 shrink-0 flex-col border-l py-3"
                    : "border-t px-3 py-2.5",
                )}
              >
                {silent ? (
                  <VolumeX className="size-4 text-[#d4b896]/80" />
                ) : (
                  <Volume2 className="size-4 text-[#d4b896]" />
                )}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  aria-label="Classical volume"
                  onChange={(event) => onVolume(Number(event.target.value))}
                  className={cn(
                    "accent-[#d4b896] cursor-pointer",
                    computer ? "h-28 w-8 origin-center [writing-mode:vertical-lr] rotate-180" : "h-1.5 w-full",
                  )}
                />
                <span className="text-[10px] tabular-nums text-[#d4b896]/75">
                  {Math.round(volume * 100)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Hide classical player"
              onClick={(event) => {
                event.stopPropagation();
                minimizePlayer();
              }}
              className="absolute -top-1.5 -right-1.5 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full border border-[#c4a574]/40 bg-[#1a1510] text-[#d4b896] shadow-md transition-colors hover:bg-[#2a2218] hover:text-[#f3e6cc] focus-visible:ring-2 focus-visible:ring-[#d4b896]/60"
            >
              <X className="size-3" strokeWidth={2.25} />
            </button>

            <button
              type="button"
              aria-label={
                computer
                  ? silent
                    ? "Unmute classical"
                    : "Mute classical"
                  : open
                    ? "Close classical lists"
                    : "Open classical lists"
              }
              onClick={() => {
                if (computer) {
                  toggleMute();
                  return;
                }
                setOpen((value) => !value);
              }}
              className={cn(
                "relative flex size-12 cursor-pointer items-center justify-center rounded-full border border-[#c4a574]/35 bg-linear-to-br from-[#2a2218] to-[#0c0a08] text-[#f3e6cc] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_24px_-6px_rgba(166,139,91,0.55)] ring-1 ring-[#d4b896]/20 transition-transform duration-200 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-[#d4b896]/60",
                silent && "opacity-70",
              )}
            >
              {playing && !silent ? (
                <span className="absolute inset-0 animate-pulse rounded-full bg-[#d4b896]/10 motion-reduce:animate-none" />
              ) : null}
              {computer && silent ? (
                <VolumeX className="relative size-5" strokeWidth={1.75} />
              ) : (
                <Music2 className="relative size-5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

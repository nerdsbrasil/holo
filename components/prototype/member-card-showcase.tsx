"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MemberLicenseCard } from "@/components/prototype/member-license-card";
import { CardConfigDock } from "@/components/prototype/card-config-dock";
import {
  captureCardPng,
  downloadPng,
  exportCardGlb,
  type CardFace,
} from "@/lib/prototype/export-card";
import {
  DEFAULT_CARD_CONFIG,
  loadCardConfig,
  saveCardConfig,
  type CardVisualConfig,
} from "@/lib/prototype/card-config";
import type { MemberLicenseMock } from "@/lib/prototype/mock-member";
import { cn } from "@/lib/utils";

type Props = {
  member: MemberLicenseMock;
  live?: boolean;
};

type ExportOption =
  | {
      id: string;
      label: string;
      hint: string;
      kind: "png";
      face: CardFace;
      pixelRatio: number;
      backgroundColor?: string;
    }
  | {
      id: string;
      label: string;
      hint: string;
      kind: "glb";
    };

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "png-front-2x",
    label: "PNG frente · 2×",
    hint: "padrão",
    kind: "png",
    face: "front",
    pixelRatio: 2,
    backgroundColor: "#0c0c0c",
  },
  {
    id: "png-front-3x",
    label: "PNG frente · 3×",
    hint: "alta",
    kind: "png",
    face: "front",
    pixelRatio: 3,
    backgroundColor: "#0c0c0c",
  },
  {
    id: "png-back-2x",
    label: "PNG verso · 2×",
    hint: "costa",
    kind: "png",
    face: "back",
    pixelRatio: 2,
    backgroundColor: "#0c0c0c",
  },
  {
    id: "png-transparent",
    label: "PNG transparente",
    hint: "frente",
    kind: "png",
    face: "front",
    pixelRatio: 2,
  },
  {
    id: "glb",
    label: "GLB 3D",
    hint: "objeto",
    kind: "glb",
  },
];

export function MemberCardShowcase({ member }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [config, setConfig] = useState<CardVisualConfig>(DEFAULT_CARD_CONFIG);
  const [configReady, setConfigReady] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const displayMember = {
    ...member,
    avatarUrl: customAvatar ?? member.avatarUrl,
  };

  useEffect(() => {
    setConfig(loadCardConfig());
    setConfigReady(true);
  }, []);

  const patchConfig = useCallback((patch: Partial<CardVisualConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveCardConfig(next);
      return next;
    });
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CARD_CONFIG);
    saveCardConfig(DEFAULT_CARD_CONFIG);
    setCustomAvatar(null);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const runExport = useCallback(
    async (opt: ExportOption) => {
      const root = captureRef.current?.querySelector(
        "[data-card-capture]",
      ) as HTMLElement | null;
      if (!root || exporting) return;
      setMenuOpen(false);
      setExporting(true);
      try {
        if (opt.kind === "glb") {
          await exportCardGlb({
            root,
            filename: `nerdsbrasil-card-${member.id}.glb`,
          });
        } else {
          const dataUrl = await captureCardPng({
            root,
            face: opt.face,
            pixelRatio: opt.pixelRatio,
            backgroundColor: opt.backgroundColor,
          });
          downloadPng(dataUrl, `nerdsbrasil-card-${member.id}-${opt.id}.png`);
        }
      } catch (err) {
        console.error("export failed", err);
      } finally {
        setExporting(false);
      }
    },
    [exporting, member.id],
  );

  const dockProps = {
    config,
    onChange: patchConfig,
    onReset: resetConfig,
    avatarUrl: displayMember.avatarUrl,
    defaultAvatarUrl: member.avatarUrl,
    onAvatarChange: setCustomAvatar,
  };

  return (
    <div className="relative flex h-dvh max-h-dvh flex-1 flex-col overflow-hidden bg-[#0c0c0c]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #161616 25%, transparent 25%), linear-gradient(-45deg, #161616 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161616 75%), linear-gradient(-45deg, transparent 75%, #161616 75%)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0",
        }}
      />

      <header className="absolute right-4 top-4 z-30 flex items-center justify-end sm:right-6 sm:top-6">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            disabled={exporting}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur hover:bg-white/10 disabled:opacity-50"
          >
            {exporting ? "Exportando…" : "Export"}
            <svg
              viewBox="0 0 12 12"
              className={cn(
                "size-3 opacity-70 transition-transform",
                menuOpen && "rotate-180",
              )}
              fill="currentColor"
              aria-hidden
            >
              <path
                d="M2.5 4.5 L6 8 L9.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {menuOpen && !exporting && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1.5 min-w-[13rem] overflow-hidden rounded-xl border border-white/12 bg-[#161616] py-1 shadow-xl"
            >
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="menuitem"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void runExport(opt);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10"
                >
                  <span>{opt.label}</span>
                  <span className="text-[10px] text-white/40">{opt.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="absolute bottom-4 left-4 top-4 z-20 hidden w-[340px] md:flex sm:bottom-6 sm:left-6 sm:top-6">
        {configReady && (
          <CardConfigDock
            {...dockProps}
            className="h-full w-full max-w-none"
          />
        )}
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-28 pt-4 md:pb-4 md:pl-[calc(1.5rem+340px+1.5rem)] md:pr-6">
        <div ref={captureRef} className="w-full max-w-[560px]">
          <MemberLicenseCard
            member={displayMember}
            showcase
            config={configReady ? config : DEFAULT_CARD_CONFIG}
          />
        </div>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-20 max-h-[42dvh] md:hidden">
        {configReady && (
          <CardConfigDock {...dockProps} className="max-h-[42dvh]" />
        )}
      </div>

      <a
        href="https://github.com/nerdsbrasil"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub Nerds Brasil"
        className="group absolute bottom-16 right-[5.5rem] z-[1] hidden flex-col items-end select-none text-[#5b9fd4] transition-colors hover:text-[#7eb8e0] lg:flex"
      >
        <span
          className="block -rotate-6 pr-8 text-lg transition-transform group-hover:-rotate-3 group-hover:scale-105"
          style={{
            fontFamily: 'Virgil, "Bradley Hand", "Segoe Script", cursive',
          }}
        >
          this was made by
          <br />
          nerds brasil
        </span>
        <svg
          viewBox="0 0 48 40"
          width="48"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="-mr-4 transition-transform group-hover:translate-y-0.5"
          aria-hidden
        >
          <path d="M6 4c18 4 32 14 36 30" />
          <path d="M35 28l7 7 3-10" />
        </svg>
      </a>
      <div className="absolute bottom-4 right-10 z-[1] hidden items-center gap-0.5 rounded-full border border-white/15 bg-[#151515]/85 p-1 shadow-sm backdrop-blur lg:flex">
        <a
          href="https://github.com/nerdsbrasil"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub Nerds Brasil"
          className="flex size-8 items-center justify-center rounded-full text-white/70 transition-[color,background-color] hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 16 16"
            width="18"
            height="18"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>
    </div>
  );
}

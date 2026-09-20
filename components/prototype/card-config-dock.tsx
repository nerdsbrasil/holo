"use client";

import { useRef, useState } from "react";
import type { CardVisualConfig } from "@/lib/prototype/card-config";
import {
  DEFAULT_CARD_CONFIG,
  FINISH_OPTIONS,
  FINISH_PRESETS,
  PAPER_OPTIONS,
  WATERMARK_OPTIONS,
} from "@/lib/prototype/card-config";
import { cn } from "@/lib/utils";

const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg";
const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

type Props = {
  config: CardVisualConfig;
  onChange: (patch: Partial<CardVisualConfig>) => void;
  onReset: () => void;
  avatarUrl: string;
  defaultAvatarUrl: string;
  onAvatarChange: (dataUrl: string | null) => void;
  className?: string;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-white/8 pb-4 last:border-0">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        {title}
      </h3>
      {children}
    </section>
  );
}

function SliderRow({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format = (v) => `${Math.round(v * 100)}%`,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-white/70">{label}</span>
        <span className="tabular-nums text-[10px] text-white/35">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#5b9fd4]"
      />
    </label>
  );
}

function ChipGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[11px] transition",
            value === o.id
              ? "border-white/35 bg-white/12 text-white"
              : "border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-xs text-white/70"
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-[#5b9fd4]" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function PhotoUpload({
  avatarUrl,
  isCustom,
  onAvatarChange,
}: {
  avatarUrl: string;
  isCustom: boolean;
  onAvatarChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const okType =
      /^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) ||
      /\.(png|jpe?g|webp|svg)$/i.test(file.name);
    if (!okType) {
      setError("PNG, JPG, WebP ou SVG");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Máx. 4 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onAvatarChange(result);
    };
    reader.onerror = () => setError("Falha ao ler o arquivo");
    reader.readAsDataURL(file);
  };

  return (
    <Section title="Photo">
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed px-4 py-7 transition",
          dragging
            ? "border-white/40 bg-white/[0.06]"
            : "border-white/20 bg-transparent hover:border-white/30 hover:bg-white/[0.02]",
        )}
      >
        {isCustom ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-lg object-cover object-top ring-1 ring-white/15"
              draggable={false}
            />
            <span className="text-[13px] font-medium text-white/90">
              Replace artwork
            </span>
            <span className="text-[11px] text-white/40">
              Drop or click · SVG, PNG, JPG, WebP
            </span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              className="size-7 text-white/40"
              fill="none"
              aria-hidden
            >
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="2.25"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="8.25" cy="9.25" r="1.35" fill="currentColor" />
              <path
                d="M3.5 16.5l4.2-4.2 2.8 2.8 3.1-3.1 6.4 5.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="18.25" cy="17.25" r="3.35" fill="#141414" />
              <circle
                cx="18.25"
                cy="17.25"
                r="3.1"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M18.25 15.6v3.3M16.6 17.25h3.3"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-[13px] font-medium text-white/90">
              Upload artwork
            </span>
            <span className="text-[11px] text-white/40">
              Drop or click · SVG, PNG, JPG, WebP
            </span>
          </>
        )}
      </button>
      {isCustom && (
        <button
          type="button"
          onClick={() => {
            setError(null);
            onAvatarChange(null);
          }}
          className="w-full text-center text-[10px] text-white/40 transition hover:text-white/70"
        >
          Usar padrão
        </button>
      )}
      {error && <p className="text-[10px] text-red-300/80">{error}</p>}
    </Section>
  );
}

export function CardConfigDock({
  config,
  onChange,
  onReset,
  avatarUrl,
  defaultAvatarUrl,
  onAvatarChange,
  className,
}: Props) {
  return (
    <aside
      className={cn(
        "flex h-full max-h-full min-h-0 w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/92 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white/90">Customize</p>
          <p className="text-[10px] text-white/35">defaults = look atual</p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:bg-white/5 hover:text-white/80"
        >
          Reset
        </button>
      </div>

      <div className="card-dock-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        <PhotoUpload
          avatarUrl={avatarUrl}
          isCustom={avatarUrl !== defaultAvatarUrl}
          onAvatarChange={onAvatarChange}
        />
        <Section title="Finish">
          <ChipGroup
            value={config.finish}
            options={FINISH_OPTIONS}
            onChange={(finish) =>
              onChange({ ...FINISH_PRESETS[finish], finish })
            }
          />
          <Toggle
            label="Foil WebGL"
            checked={config.holoEnabled}
            onChange={(holoEnabled) => onChange({ holoEnabled })}
          />
          <SliderRow
            label="Intensity"
            value={config.holoIntensity}
            max={0.6}
            onChange={(holoIntensity) => onChange({ holoIntensity })}
          />
          <SliderRow
            label="Band frequency"
            value={config.holoBands}
            min={1}
            max={20}
            step={1}
            format={(v) => v.toFixed(0)}
            onChange={(holoBands) => onChange({ holoBands })}
          />
          <SliderRow
            label="Hue shift"
            value={config.holoHueShift}
            onChange={(holoHueShift) => onChange({ holoHueShift })}
          />
          <SliderRow
            label="Grain / sparkle"
            value={config.holoGrain}
            onChange={(holoGrain) => onChange({ holoGrain })}
          />
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">Pattern</p>
            <ChipGroup
              value={config.holoPattern}
              options={[
                { id: "linear", label: "Linear" },
                { id: "radial", label: "Radial" },
                { id: "patches", label: "Patches" },
              ]}
              onChange={(holoPattern) => onChange({ holoPattern })}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-white/70">Refractor overlay</p>
            <ChipGroup
              value={config.holoOverlay}
              options={[
                { id: "none", label: "None" },
                { id: "triangles", label: "△" },
                { id: "squares", label: "□" },
                { id: "stripes", label: "stripes" },
              ]}
              onChange={(holoOverlay) => onChange({ holoOverlay })}
            />
          </div>
        </Section>

        <Section title="Paper">
          <Toggle
            label="Textura ligada"
            checked={config.paperEnabled}
            onChange={(paperEnabled) => onChange({ paperEnabled })}
          />
          <ChipGroup
            value={config.paperTexture}
            options={PAPER_OPTIONS}
            onChange={(paperTexture) => onChange({ paperTexture })}
          />
          <SliderRow
            label="Grain"
            value={config.paperGrain}
            onChange={(paperGrain) => onChange({ paperGrain })}
          />
          <SliderRow
            label="Noise"
            value={config.paperNoise}
            onChange={(paperNoise) => onChange({ paperNoise })}
          />
          <SliderRow
            label="Vignette"
            value={config.paperVignette}
            onChange={(paperVignette) => onChange({ paperVignette })}
          />
        </Section>

        <Section title="Watermark">
          <ChipGroup
            value={config.watermark}
            options={WATERMARK_OPTIONS}
            onChange={(watermark) => onChange({ watermark })}
          />
          <SliderRow
            label="Brand opacity"
            value={config.watermarkOpacity}
            max={0.6}
            onChange={(watermarkOpacity) => onChange({ watermarkOpacity })}
          />
          <SliderRow
            label="Waves opacity"
            value={config.wavesOpacity}
            max={1}
            onChange={(wavesOpacity) => onChange({ wavesOpacity })}
          />
        </Section>

        <Section title="OVD / Brand">
          <Toggle
            label="OVD na foto"
            checked={config.ovdEnabled}
            onChange={(ovdEnabled) => onChange({ ovdEnabled })}
          />
          <ChipGroup
            value={config.ovdShape}
            options={[
              { id: "circle", label: "●" },
              { id: "square", label: "■" },
              { id: "triangle", label: "▲" },
            ]}
            onChange={(ovdShape) => onChange({ ovdShape })}
          />
          <SliderRow
            label="OVD opacity"
            value={config.ovdOpacity}
            onChange={(ovdOpacity) => onChange({ ovdOpacity })}
          />
          <Toggle
            label="Wordmark"
            checked={config.wordmarkEnabled}
            onChange={(wordmarkEnabled) => onChange({ wordmarkEnabled })}
          />
          <Toggle
            label="Sticker"
            checked={config.brandStickerEnabled}
            onChange={(brandStickerEnabled) => onChange({ brandStickerEnabled })}
          />
        </Section>
      </div>

      <div className="shrink-0 border-t border-white/8 px-4 py-2.5 text-[10px] text-white/30">
        {Object.keys(DEFAULT_CARD_CONFIG).length} knobs · salva no browser
      </div>
    </aside>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { QRCodeSVG } from "qrcode.react";
import type {
  CardFlavorEdits,
  MemberLicenseMock,
  OvdShape,
} from "@/lib/prototype/mock-member";
import { flavorDefaults } from "@/lib/prototype/mock-member";
import {
  DEFAULT_CARD_CONFIG,
  paperCssUrl,
  type CardVisualConfig,
} from "@/lib/prototype/card-config";
import { CardFoilWebGL } from "@/components/prototype/card-foil-webgl";
import { cn } from "@/lib/utils";

type Props = {
  member: MemberLicenseMock;
  className?: string;
  /** Modo página showcase: UI mais limpa */
  showcase?: boolean;
  /** Visual configurável — default = look atual */
  config?: CardVisualConfig;
};

const OVD_SRC: Record<OvdShape, string> = {
  circle: "/stickers/nb-ovd-circle.png?v=3",
  square: "/stickers/nb-ovd-square.png?v=3",
  triangle: "/stickers/nb-ovd-triangle.png?v=3",
};

function flavorStorageKey(id: string) {
  return `nb-card-flavor:${id}`;
}

function loadFlavor(id: string, fallback: CardFlavorEdits): CardFlavorEdits {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(flavorStorageKey(id));
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

export function MemberLicenseCard({
  member,
  className,
  showcase = false,
  config = DEFAULT_CARD_CONFIG,
}: Props) {
  const reduce = usePrefersReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const defaults = flavorDefaults(member);
  const [flavor, setFlavor] = useState<CardFlavorEdits>(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setFlavor(loadFlavor(member.id, flavorDefaults(member)));
    setHydrated(true);
  }, [member]);

  const patchFlavor = useCallback(
    (key: keyof CardFlavorEdits, value: string) => {
      setFlavor((prev) => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem(flavorStorageKey(member.id), JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [member.id],
  );

  useEffect(() => {
    const host = shellRef.current;
    const card = cardRef.current;
    if (!host || !card || reduce) return;

    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const sheet = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let touched = false;
    let idle = 0;

    const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));
    const adjust = (v: number, a: number, b: number, c: number, d: number) =>
      c + ((d - c) * (v - a)) / (b - a);

    const rainbow = (angle: string, space: string) => {
      const hues = [
        "hsl(2, 100%, 73%)",
        "hsl(53, 100%, 69%)",
        "hsl(93, 100%, 69%)",
        "hsl(176, 100%, 76%)",
        "hsl(228, 100%, 74%)",
        "hsl(283, 100%, 73%)",
      ];
      const stops = hues
        .map((c, i) => `${c} calc(${space} * ${i + 1})`)
        .concat(`${hues[0]} calc(${space} * ${hues.length + 1})`)
        .join(", ");
      return `repeating-linear-gradient(${angle}, ${stops})`;
    };

    const s = card.style;
    s.setProperty("--l1-img", rainbow("10deg", "8%"));
    s.setProperty("--l1-size", "380% 380%");
    s.setProperty("--l1-filter", "brightness(1) contrast(1.12) saturate(0.9)");
    s.setProperty("--l2-img", rainbow("104deg", "13%"));
    s.setProperty("--l2-size", "300% 300%");
    s.setProperty("--l2-filter", "brightness(1) contrast(1.08) saturate(0.95)");
    s.setProperty(
      "--l3-img",
      "repeating-linear-gradient(96deg, rgba(255,255,255,.14) 0px, rgba(255,255,255,0) 2px, rgba(0,0,0,.03) 3px, rgba(255,255,255,0) 6px)",
    );
    s.setProperty("--l3-size", "auto");
    s.setProperty("--l3-filter", "contrast(1.04)");

    const layers = [
      { rate: 1, base: 0.015, gain: 0.06 },
      { rate: -0.7, base: 0.008, gain: 0.035 },
      { rate: 1.8, base: 0.005, gain: 0.02 },
    ];
    const parallax = 0.22;
    const bloom = 0.28;
    const MAX_TILT = 10;

    const frame = () => {
      raf = 0;
      if (!touched) {
        idle += 0.004;
        tilt.tx = Math.sin(idle) * 0.18;
        tilt.ty = Math.cos(idle * 0.73) * 0.12;
      }

      tilt.x += (tilt.tx - tilt.x) * 0.16;
      tilt.y += (tilt.ty - tilt.y) * 0.16;
      sheet.tx = tilt.x;
      sheet.ty = tilt.y;
      sheet.x += (sheet.tx - sheet.x) * 0.09;
      sheet.y += (sheet.ty - sheet.y) * 0.09;

      const { x, y } = tilt;
      s.setProperty("--rx", `${(-y * MAX_TILT).toFixed(2)}deg`);
      s.setProperty("--ry", `${(x * MAX_TILT).toFixed(2)}deg`);

      const off = Math.min(1, Math.hypot(x, y));
      s.setProperty("--off", off.toFixed(3));
      s.setProperty("--gx", `${adjust(x, -1, 1, 12, 88).toFixed(1)}%`);
      s.setProperty("--gy", `${adjust(y, -1, 1, 12, 88).toFixed(1)}%`);

      layers.forEach((L, i) => {
        const n = i + 1;
        const t = parallax * L.rate;
        s.setProperty(
          `--l${n}-x`,
          `${adjust(sheet.x, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`,
        );
        s.setProperty(
          `--l${n}-y`,
          `${adjust(sheet.y, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`,
        );
        const o = Math.min(
          0.12,
          Math.max(0, L.base + off * L.gain * (bloom / 0.5)),
        );
        s.setProperty(`--l${n}-o`, o.toFixed(3));
      });

      if (
        Math.abs(tilt.tx - tilt.x) > 0.001 ||
        Math.abs(sheet.tx - sheet.x) > 0.001 ||
        !touched
      ) {
        raf = requestAnimationFrame(frame);
      }
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onPointer = (e: globalThis.PointerEvent) => {
      const rect = host.getBoundingClientRect();
      tilt.tx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
      tilt.ty = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
      touched = true;
      wake();
    };

    const onLeave = () => {
      touched = false;
      wake();
    };

    host.addEventListener("pointermove", onPointer);
    host.addEventListener("pointerleave", onLeave);
    wake();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  const flip = () => setFlipped((v) => !v);

  const viewMember: MemberLicenseMock = {
    ...member,
    nationality: flavor.nationality,
    birthLabel: flavor.birthLabel,
    sex: flavor.sex,
    height: flavor.height,
    eyes: flavor.eyes,
    street: flavor.street,
    cityLine: flavor.cityLine,
  };

  return (
    <div className={cn("flex w-full max-w-[560px] flex-col items-center gap-4", className)}>
      <div
        ref={shellRef}
        data-card-capture
        className="license-shell relative w-full cursor-pointer select-none [perspective:1100px]"
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            flip();
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? "Verso da carteira. Clique para virar."
            : "Frente da carteira. Clique para virar."
        }
      >
        <div
          ref={cardRef}
          data-card-tilt
          className="license-card relative w-full [transform-style:preserve-3d]"
          style={
            {
              transform: "rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))",
              willChange: "transform",
            } as CSSProperties
          }
        >
          <div
            data-card-inner
            className="license-inner relative aspect-[85.6/53.98] w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
            style={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
          >
            <div
              aria-hidden
              className="absolute inset-[1px] rounded-[13px] bg-[#ebe6dc]"
              style={{ transform: "translateZ(-1px)" }}
            />
            <Face
              className="[backface-visibility:hidden] [transform:translateZ(1px)]"
              dataFace="front"
            >
              <CardTexture config={config} />
              <FrontFace
                member={viewMember}
                config={config}
                onFlavorChange={patchFlavor}
                editable={hydrated}
              />
              <DirtOverlay config={config} />
              <CardFoilWebGL config={config} />
              <RefractorOverlay config={config} />
            </Face>
            <Face
              className="[backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(1px)]"
              dataFace="back"
            >
              <CardTexture back config={config} />
              <BackFace member={viewMember} config={config} />
              <DirtOverlay config={config} />
              <CardFoilWebGL config={config} subtle />
              <RefractorOverlay config={config} />
            </Face>
          </div>
        </div>
      </div>

      {showcase ? (
        <p className="text-center text-[11px] text-white/35">
          campos claros = editar · card = virar
        </p>
      ) : (
        <>
          <p className="text-center text-sm text-muted-foreground">
            Clique pra virar · move o mouse pro foil sutil
          </p>
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground hover:bg-primary/5"
            onClick={(e) => {
              e.stopPropagation();
              flip();
            }}
          >
            {flipped ? "Ver frente" : "Ver verso"}
          </button>
        </>
      )}
    </div>
  );
}

function Face({
  children,
  className,
  dataFace,
}: {
  children: React.ReactNode;
  className?: string;
  dataFace?: "front" | "back";
}) {
  return (
    <div
      data-card-face={dataFace}
      className={cn(
        "absolute inset-0 overflow-hidden rounded-[14px] border border-black/15 bg-[#ebe6dc] text-[#12141a] shadow-[0_24px_60px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Underprint: guilloché + selo gravado (atrás do conteúdo). */
function CardTexture({
  back = false,
  config,
}: {
  back?: boolean;
  config: CardVisualConfig;
}) {
  const showWaves =
    config.watermark === "waves" || config.watermark === "both";
  const showBrand =
    config.watermark === "brand" || config.watermark === "both";

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]"
    >
      <div
        className="absolute inset-0"
        style={{
          background: back
            ? "linear-gradient(145deg, #ebe6dc 0%, #e4ebf2 45%, #f0ebe3 100%)"
            : "linear-gradient(125deg, #f3efe6 0%, #e8eef5 30%, #f6f0e8 58%, #e3ebf3 100%)",
        }}
      />

      {showWaves && (
        <div
          className="absolute inset-0"
          style={{
            opacity: config.wavesOpacity,
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='40' viewBox='0 0 120 40'>
              <path d='M0 20 Q15 4 30 20 T60 20 T90 20 T120 20' fill='none' stroke='rgba(40,90,180,0.38)' stroke-width='0.8'/>
              <path d='M0 24 Q15 10 30 24 T60 24 T90 24 T120 24' fill='none' stroke='rgba(180,50,60,0.24)' stroke-width='0.65'/>
              <path d='M0 16 Q15 28 30 16 T60 16 T90 16 T120 16' fill='none' stroke='rgba(40,120,160,0.3)' stroke-width='0.55'/>
            </svg>`,
            )}")`,
            backgroundSize: "120px 40px",
          }}
        />
      )}

      {showWaves && (
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='48' viewBox='0 0 28 48'>
              <path d='M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z' fill='none' stroke='rgba(90,120,150,0.4)' stroke-width='0.65'/>
              <path d='M14 32 L28 40 L28 56 L14 64 L0 56 L0 40 Z' fill='none' stroke='rgba(90,120,150,0.28)' stroke-width='0.65'/>
            </svg>`,
            )}")`,
            backgroundSize: "28px 48px",
            WebkitMaskImage:
              "linear-gradient(90deg, black 0%, black 38%, transparent 75%)",
            maskImage:
              "linear-gradient(90deg, black 0%, black 38%, transparent 75%)",
          }}
        />
      )}

      {showBrand && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/stickers/nb-id-watermark.png?v=4"
          alt=""
          className="absolute object-contain"
          style={{
            right: "-4%",
            top: "4%",
            width: "78%",
            height: "92%",
            opacity: back
              ? config.watermarkOpacity * 0.7
              : config.watermarkOpacity,
            mixBlendMode: "multiply",
          }}
          draggable={false}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          boxShadow:
            "inset 0 0 0 1.5px rgba(40,80,140,0.16), inset 0 0 36px rgba(80,50,30,0.07)",
        }}
      />
    </div>
  );
}

/** Textura de papel por CIMA — knobs via config. */
function DirtOverlay({ config }: { config: CardVisualConfig }) {
  if (!config.paperEnabled || config.paperTexture === "none") return null;

  const paperUrl = paperCssUrl(config.paperTexture);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-[14px]"
    >
      {paperUrl && (
        <div
          className="absolute inset-0 mix-blend-multiply"
          style={{
            opacity: config.paperGrain,
            backgroundImage: paperUrl,
            backgroundSize: "cover",
          }}
        />
      )}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          opacity: config.paperNoise,
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'>
              <filter id='n'>
                <feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='3' stitchTiles='stitch'/>
              </filter>
              <rect width='100%' height='100%' filter='url(%23n)' opacity='0.75'/>
            </svg>`,
          )}")`,
          backgroundSize: "150px 150px",
        }}
      />
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          opacity: config.paperVignette,
          background:
            "radial-gradient(ellipse at center, transparent 42%, rgba(90,70,45,0.3) 100%)",
        }}
      />
    </div>
  );
}

function RefractorOverlay({ config }: { config: CardVisualConfig }) {
  if (!config.holoEnabled || config.holoOverlay === "none") return null;

  const pattern =
    config.holoOverlay === "triangles"
      ? `url("data:image/svg+xml,${encodeURIComponent(
          `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='21' viewBox='0 0 24 21'><path d='M12 1 L23 20 H1 Z' fill='none' stroke='rgba(255,255,255,0.35)' stroke-width='0.6'/></svg>`,
        )}")`
      : config.holoOverlay === "squares"
        ? `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><rect x='1' y='1' width='16' height='16' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='0.6'/></svg>`,
          )}")`
        : `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='12' height='20'><path d='M0 0 V20 M6 0 V20' stroke='rgba(255,255,255,0.28)' stroke-width='0.5'/></svg>`,
          )}")`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[7] overflow-hidden rounded-[14px] mix-blend-overlay opacity-40"
      style={{
        backgroundImage: pattern,
        backgroundSize:
          config.holoOverlay === "stripes" ? "12px 20px" : "24px 24px",
      }}
    />
  );
}

function FrontFace({
  member,
  config,
  onFlavorChange,
  editable,
}: {
  member: MemberLicenseMock;
  config: CardVisualConfig;
  onFlavorChange: (key: keyof CardFlavorEdits, value: string) => void;
  editable: boolean;
}) {
  return (
    <div className="relative z-[1] grid h-full min-h-0 grid-cols-[0.86fr_1.34fr] grid-rows-[minmax(0,1fr)_auto_auto] gap-x-2 gap-y-0.5 overflow-hidden px-2.5 pb-2 pt-2 sm:gap-x-2.5 sm:px-3 sm:pb-2.5 sm:pt-2.5">
      {config.brandStickerEnabled && (
        <BrandSticker className="pointer-events-none absolute right-2.5 top-2 z-[3] h-8 w-8 sm:right-3 sm:top-2.5 sm:h-9 sm:w-9" />
      )}

      <div className="relative row-start-1 min-h-0 w-full overflow-hidden rounded-[1px] bg-[#1e4a7a] ring-1 ring-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatarUrl}
          alt=""
          className="relative z-[1] h-full w-full object-cover object-top"
          draggable={false}
          style={{ filter: "contrast(1.08) saturate(0.82)" }}
        />
        {config.ovdEnabled && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={OVD_SRC[config.ovdShape]}
            alt=""
            className="pointer-events-none absolute bottom-1 right-1 z-[2] h-[32%] w-auto max-h-[46px] object-contain"
            draggable={false}
            style={{ opacity: config.ovdOpacity }}
          />
        )}
      </div>

      <div className="relative row-start-1 flex min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="min-w-0">
          {config.wordmarkEnabled && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/stickers/nb-wordmark.png?v=3"
              alt="Nerds Brasil"
              className="h-11 w-auto max-w-full object-contain object-left sm:h-12"
              draggable={false}
            />
          )}
          <p className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.14em] text-[#1a4f8c]/75">
            Carteira de membro / Member card
          </p>
        </div>

        <p className="mt-1.5 font-mono text-[12px] font-bold tracking-wide text-[#a3182d] sm:text-[13px]">
          {member.memberNumber}
        </p>

        <div className="mt-1.5 grid grid-cols-3 gap-x-2 gap-y-1">
          <EditablePassportField
            label="Nacionalidade"
            value={member.nationality}
            editable={editable}
            onChange={(v) => onFlavorChange("nationality", v)}
            compact
          />
          <EditablePassportField
            label="Sexo / Sex"
            value={member.sex}
            editable={editable}
            onChange={(v) => onFlavorChange("sex", v)}
            compact
          />
          <PassportField label="Classe" value={member.nerdClass.toUpperCase()} compact />
          <EditablePassportField
            label="Nasc. / DOB"
            value={member.birthLabel}
            editable={editable}
            onChange={(v) => onFlavorChange("birthLabel", v)}
            compact
          />
          <PassportField label="Emissão" value={member.issueLabel} compact />
          <PassportField label="Validade" value={member.expLabel} compact />
          <EditablePassportField
            label="Altura"
            value={member.height}
            editable={editable}
            onChange={(v) => onFlavorChange("height", v)}
            compact
          />
          <EditablePassportField
            label="Olhos"
            value={member.eyes}
            editable={editable}
            onChange={(v) => onFlavorChange("eyes", v)}
            compact
          />
          <PassportField label="Nível" value={String(member.level)} compact />
        </div>

        <div className="mt-1 grid grid-cols-3 gap-x-2">
          <PassportField label="XP" value={member.xp.toLocaleString("pt-BR")} compact />
          <PassportField label="Rank" value={`#${member.rank}`} compact />
          <PassportField label="Tempo" value={member.tenure} compact />
        </div>

        <p
          className="pointer-events-none absolute right-0 top-[28%] select-none text-[9px] font-black tracking-[0.35em] text-[#1a4f8c]/20"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          NERDS
        </p>
      </div>

      {/* Barcode — linha 2 */}
      <Barcode value={member.id} className="row-start-2 h-[16px] w-full self-center opacity-85" />

      {/* Assinatura — mesma altura do barcode */}
      <div className="row-start-2 flex min-w-0 items-center self-center">
        <div className="min-w-0 flex-1 leading-none">
          <p className="text-[6px] uppercase tracking-wider text-[#1a4f8c]/55">
            Assinatura / Signature
          </p>
          <p
            className="truncate text-[16px] leading-none text-[#12141a] sm:text-[18px]"
            style={{
              fontFamily: '"Segoe Script", "Apple Chancery", "Comic Sans MS", cursive',
              fontWeight: 600,
            }}
          >
            {member.displayName}
          </p>
          <p className="mt-0.5 text-[7px] text-black/45">@{member.username}</p>
        </div>
      </div>

      {/* Nome + endereço — linha 3, sob o barcode */}
      <div className="row-start-3 min-w-0 leading-tight">
        <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#12141a] sm:text-[11px]">
          {member.displayName}
        </p>
        <EditableLine
          value={member.street}
          editable={editable}
          onChange={(v) => onFlavorChange("street", v)}
          className="text-[7.5px] font-semibold uppercase leading-snug text-[#12141a]/90 sm:text-[8px]"
          ariaLabel="Endereço"
        />
        <EditableLine
          value={member.cityLine}
          editable={editable}
          onChange={(v) => onFlavorChange("cityLine", v)}
          className="text-[7px] font-medium uppercase leading-snug text-[#12141a]/75 sm:text-[7.5px]"
          ariaLabel="Cidade"
        />
      </div>

      {/* Mini foto fantasma — embaixo, canto direito */}
      <div className="row-start-3 flex items-end justify-end">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.avatarUrl}
          alt=""
          className="h-11 w-9 shrink-0 object-cover object-top opacity-40 grayscale contrast-125 sm:h-12 sm:w-10"
          draggable={false}
          style={{
            WebkitMaskImage: "linear-gradient(180deg, black 35%, transparent 100%)",
            maskImage: "linear-gradient(180deg, black 35%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}

function PassportField({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[5.5px] font-medium uppercase leading-none tracking-wide text-[#1a4f8c]/70 sm:text-[6px]">
        {label}
      </p>
      <p
        className={cn(
          "truncate font-bold uppercase leading-tight text-[#12141a]",
          compact ? "text-[9px] sm:text-[10px]" : "text-[11px] sm:text-[12px]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Campo passaporte com input disfarçado (hover/click). */
function EditablePassportField({
  label,
  value,
  onChange,
  editable,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editable) {
    return <PassportField label={label} value={value} compact={compact} />;
  }

  const commit = () => {
    const next = draft.trim() || value;
    setDraft(next);
    onChange(next);
    setEditing(false);
  };

  return (
    <div
      className="group/field min-w-0 rounded-[2px] outline-offset-1 hover:bg-[#1a4f8c]/06 focus-within:bg-[#1a4f8c]/08"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="truncate text-[5.5px] font-medium uppercase leading-none tracking-wide text-[#1a4f8c]/70 sm:text-[6px]">
        {label}
      </p>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className={cn(
            "w-full border-0 bg-transparent p-0 font-bold uppercase leading-tight text-[#12141a] outline-none ring-0",
            compact ? "text-[9px] sm:text-[10px]" : "text-[11px] sm:text-[12px]",
          )}
          aria-label={label}
        />
      ) : (
        <button
          type="button"
          className={cn(
            "block w-full truncate text-left font-bold uppercase leading-tight text-[#12141a] underline-offset-2 group-hover/field:underline",
            compact ? "text-[9px] sm:text-[10px]" : "text-[11px] sm:text-[12px]",
          )}
          onClick={() => setEditing(true)}
        >
          {value}
        </button>
      )}
    </div>
  );
}

/** Linha de texto editável sem label (ex.: endereço sob o nome). */
function EditableLine({
  value,
  onChange,
  editable,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  editable: boolean;
  className?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  if (!editable) {
    return <p className={cn("truncate", className)}>{value}</p>;
  }

  const commit = () => {
    const next = draft.trim() || value;
    setDraft(next);
    onChange(next);
    setEditing(false);
  };

  return (
    <div
      className="min-w-0 rounded-[2px] hover:bg-[#1a4f8c]/06 focus-within:bg-[#1a4f8c]/08"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              setDraft(value);
              setEditing(false);
            }
          }}
          className={cn(
            "w-full border-0 bg-transparent p-0 outline-none ring-0",
            className,
          )}
          aria-label={ariaLabel}
        />
      ) : (
        <button
          type="button"
          className={cn(
            "block w-full truncate text-left underline-offset-2 hover:underline",
            className,
          )}
          onClick={() => setEditing(true)}
        >
          {value}
        </button>
      )}
    </div>
  );
}

function BrandSticker({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/stickers/nerd-sticker.png?v=2"
      alt=""
      className={cn("object-contain drop-shadow-sm", className)}
      draggable={false}
    />
  );
}

function Barcode({ value, className }: { value: string; className?: string }) {
  const modules: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    modules.push(1 + (code % 3), 1 + ((code >> 2) % 2));
    modules.push(1 + ((code >> 3) % 3), 1 + ((code >> 1) % 2));
  }
  while (modules.length < 48) modules.push(...modules);
  const slice = modules.slice(0, 48);
  const total = slice.reduce((a, b) => a + b, 0);

  let x = 0;
  const bars: { x: number; w: number; key: number }[] = [];
  slice.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w, key: i });
    x += w;
  });

  return (
    <svg
      className={cn("block h-7", className)}
      viewBox={`0 0 ${total} 28`}
      preserveAspectRatio="none"
      width="100%"
      aria-hidden
    >
      <rect x="0" y="0" width={total} height="28" fill="#fff" />
      {bars.map((b) => (
        <rect key={b.key} x={b.x} y="0" width={b.w} height="28" fill="#12141a" />
      ))}
    </svg>
  );
}

function BackFace({
  member,
  config,
}: {
  member: MemberLicenseMock;
  config: CardVisualConfig;
}) {
  const roleLine = member.roles.map((r) => r.name.toUpperCase()).join(" · ");

  return (
    <div className="relative z-[1] flex h-full min-h-0 flex-col overflow-hidden text-[#12141a]">
      <div
        className="flex h-8 w-full shrink-0 items-center justify-between gap-2 px-3 sm:h-9 sm:px-3.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(26,111,181,0.85) 0%, rgba(26,111,181,0.72) 100%)",
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {config.brandStickerEnabled && (
            <BrandSticker className="h-6 w-6 shrink-0" />
          )}
          <p className="truncate text-[8px] font-black uppercase tracking-[0.14em] text-white sm:text-[9px]">
            Nerds Brasil · Member
          </p>
        </div>
        <p className="shrink-0 font-mono text-[8px] font-bold tracking-wide text-white/85 sm:text-[9px]">
          {member.memberNumber}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-3.5 sm:py-2.5">
        <p className="text-[7px] leading-snug text-[#12141a]/50">
          Identifica o portador como membro da comunidade Nerds Brasil. Não é documento
          oficial de identidade civil. Confirme em nerdsbrasil.com/c/{member.id}.
        </p>

        <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1">
          <PassportField label="Nível" value={String(member.level)} compact />
          <PassportField label="XP" value={member.xp.toLocaleString("pt-BR")} compact />
          <PassportField label="Rank" value={`#${member.rank}`} compact />
          <PassportField label="Classe" value={member.nerdClass.toUpperCase()} compact />
          <PassportField label="Emissão" value={member.issueLabel} compact />
          <PassportField label="Tempo" value={member.tenure} compact />
        </div>

        <div className="mt-2 space-y-1">
          <PassportField label="Membro" value={member.displayName} />
          <PassportField label="Handle" value={`@${member.username}`} />
          <PassportField label="Cargos" value={roleLine || "—"} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 flex-1">
            <p className="text-[7px] uppercase tracking-wider text-black/40">
              Issued by Nerds Brasil
            </p>
            <p className="mt-0.5 truncate font-mono text-[7px] text-black/50">
              nerdsbrasil.com/c/{member.id}
            </p>
          </div>
          <div className="shrink-0 rounded-[2px] border border-black/20 bg-white p-0.5">
            <QRCodeSVG
              value={`https://nerdsbrasil.com/c/${member.id}`}
              size={56}
              level="M"
              bgColor="#ffffff"
              fgColor="#12141a"
              marginSize={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


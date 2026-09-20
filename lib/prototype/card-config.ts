/** Config visual do member card — defaults = visual atual do spike. */

export type PaperTextureId = "grain" | "noise" | "fiber" | "none";
export type WatermarkId = "brand" | "waves" | "both" | "none";
export type CardFinish = "holo" | "gloss" | "matte" | "chrome" | "glitter";
export type HoloPattern = "linear" | "radial" | "patches";
export type HoloOverlay = "none" | "triangles" | "squares" | "stripes";
export type OvdShape = "circle" | "square" | "triangle";

export type CardVisualConfig = {
  /** Textura de papel por cima */
  paperEnabled: boolean;
  paperTexture: PaperTextureId;
  paperGrain: number;
  paperNoise: number;
  paperVignette: number;

  /** Underprint / watermark atrás do conteúdo */
  watermark: WatermarkId;
  watermarkOpacity: number;
  wavesOpacity: number;

  /** Foil / finish (inspirado no Holosticker) */
  finish: CardFinish;
  holoEnabled: boolean;
  holoIntensity: number;
  holoBands: number;
  holoHueShift: number;
  holoGrain: number;
  holoPattern: HoloPattern;
  holoOverlay: HoloOverlay;

  /** Selo OVD na foto */
  ovdEnabled: boolean;
  ovdShape: OvdShape;
  ovdOpacity: number;

  /** Stickers / chrome da marca */
  brandStickerEnabled: boolean;
  wordmarkEnabled: boolean;
};

/** Exato look atual do card (antes do dock). */
export const DEFAULT_CARD_CONFIG: CardVisualConfig = {
  paperEnabled: true,
  paperTexture: "grain",
  paperGrain: 0.36,
  paperNoise: 0.12,
  paperVignette: 0.22,

  watermark: "both",
  watermarkOpacity: 0.26,
  wavesOpacity: 0.5,

  finish: "holo",
  holoEnabled: true,
  holoIntensity: 0.08,
  holoBands: 1,
  holoHueShift: 0,
  holoGrain: 0.08,
  holoPattern: "linear",
  holoOverlay: "none",

  ovdEnabled: true,
  ovdShape: "circle",
  ovdOpacity: 0.85,

  brandStickerEnabled: true,
  wordmarkEnabled: true,
};

/** Presets de finish no espírito Holosticker — não mudam o default até o user clicar. */
export const FINISH_PRESETS: Record<
  CardFinish,
  Partial<CardVisualConfig>
> = {
  holo: {
    finish: "holo",
    holoEnabled: true,
    holoIntensity: 0.08,
    holoGrain: 0.08,
    holoBands: 1,
  },
  gloss: {
    finish: "gloss",
    holoEnabled: true,
    holoIntensity: 0.04,
    holoGrain: 0.02,
    holoBands: 4,
  },
  matte: {
    finish: "matte",
    holoEnabled: false,
    holoIntensity: 0,
    holoGrain: 0.05,
  },
  chrome: {
    finish: "chrome",
    holoEnabled: true,
    holoIntensity: 0.22,
    holoGrain: 0,
    holoBands: 14,
  },
  glitter: {
    finish: "glitter",
    holoEnabled: true,
    holoIntensity: 0.35,
    holoGrain: 0.85,
    holoBands: 10,
  },
};

export const PAPER_OPTIONS: { id: PaperTextureId; label: string }[] = [
  { id: "grain", label: "Grain" },
  { id: "noise", label: "Noise" },
  { id: "fiber", label: "Fiber" },
  { id: "none", label: "Nenhuma" },
];

export const WATERMARK_OPTIONS: { id: WatermarkId; label: string }[] = [
  { id: "both", label: "Brand + ondas" },
  { id: "brand", label: "Só brand" },
  { id: "waves", label: "Só ondas" },
  { id: "none", label: "Desligado" },
];

export const FINISH_OPTIONS: { id: CardFinish; label: string }[] = [
  { id: "holo", label: "Holo" },
  { id: "gloss", label: "Glossy" },
  { id: "matte", label: "Matte" },
  { id: "chrome", label: "Chrome" },
  { id: "glitter", label: "Glitter" },
];

const STORAGE_KEY = "nb-card-visual-config-v2";

export function loadCardConfig(): CardVisualConfig {
  if (typeof window === "undefined") return DEFAULT_CARD_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARD_CONFIG;
    return { ...DEFAULT_CARD_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CARD_CONFIG;
  }
}

export function saveCardConfig(config: CardVisualConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

export function paperCssUrl(id: PaperTextureId): string | null {
  if (id === "none") return null;
  if (id === "grain") return "url(/stickers/paper-grain.png)";
  if (id === "fiber") {
    return `url("data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
        <filter id='f'><feTurbulence type='turbulence' baseFrequency='0.04' numOctaves='2' stitchTiles='stitch'/></filter>
        <rect width='100%' height='100%' filter='url(%23f)' opacity='0.55'/>
      </svg>`,
    )}")`;
  }
  // noise
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'>
      <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='3' stitchTiles='stitch'/></filter>
      <rect width='100%' height='100%' filter='url(%23n)' opacity='0.75'/>
    </svg>`,
  )}")`;
}

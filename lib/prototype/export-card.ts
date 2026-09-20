/** Helpers de export do card (PNG flat + GLB simples). */

import { toPng } from "html-to-image";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export type CardFace = "front" | "back";

type CaptureOpts = {
  root: HTMLElement;
  face: CardFace;
  pixelRatio: number;
  backgroundColor?: string;
};

type StyleSnap = { el: HTMLElement; cssText: string };

function snapStyle(el: HTMLElement | null): StyleSnap | null {
  if (!el) return null;
  return { el, cssText: el.style.cssText };
}

function restore(snaps: (StyleSnap | null)[]) {
  for (const s of snaps) {
    if (s) s.el.style.cssText = s.cssText;
  }
}

/** Zera tilt/flip e isola a face pedida pra o html-to-image não pegar o verso. */
function prepareFlatFace(root: HTMLElement, face: CardFace): () => void {
  const tilt = root.querySelector<HTMLElement>("[data-card-tilt]");
  const inner = root.querySelector<HTMLElement>("[data-card-inner]");
  const front = root.querySelector<HTMLElement>('[data-card-face="front"]');
  const back = root.querySelector<HTMLElement>('[data-card-face="back"]');
  const show = face === "front" ? front : back;
  const hide = face === "front" ? back : front;

  const snaps = [snapStyle(tilt), snapStyle(inner), snapStyle(front), snapStyle(back)];

  if (tilt) {
    tilt.style.setProperty("--rx", "0deg");
    tilt.style.setProperty("--ry", "0deg");
    tilt.style.transform = "none";
    tilt.style.transition = "none";
  }
  if (inner) {
    inner.style.transition = "none";
    inner.style.transform = "rotateY(0deg)";
  }
  if (show) {
    show.style.backfaceVisibility = "visible";
    show.style.visibility = "visible";
    show.style.opacity = "1";
    show.style.transform = "none";
    show.style.zIndex = "2";
  }
  if (hide) {
    hide.style.visibility = "hidden";
    hide.style.opacity = "0";
    hide.style.pointerEvents = "none";
  }

  return () => restore(snaps);
}

export async function captureCardPng(opts: CaptureOpts): Promise<string> {
  const { root, face, pixelRatio, backgroundColor } = opts;
  const restore = prepareFlatFace(root, face);
  // deixa o browser pintar o estado flat
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    const target =
      root.querySelector<HTMLElement>(`[data-card-face="${face}"]`) ?? root;
    return await toPng(target, {
      cacheBust: true,
      pixelRatio,
      ...(backgroundColor ? { backgroundColor } : {}),
    });
  } finally {
    restore();
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadPng(dataUrl: string, filename: string) {
  downloadDataUrl(dataUrl, filename);
}

/** Card ID-1 como placa 3D fina com textura da frente (e verso se passar). */
export async function exportCardGlb(opts: {
  root: HTMLElement;
  filename: string;
}): Promise<void> {
  const frontUrl = await captureCardPng({
    root: opts.root,
    face: "front",
    pixelRatio: 2,
    backgroundColor: "#ebe6dc",
  });
  const backUrl = await captureCardPng({
    root: opts.root,
    face: "back",
    pixelRatio: 2,
    backgroundColor: "#ebe6dc",
  });

  const loader = new THREE.TextureLoader();
  const [frontTex, backTex] = await Promise.all([
    loader.loadAsync(frontUrl),
    loader.loadAsync(backUrl),
  ]);
  frontTex.colorSpace = THREE.SRGBColorSpace;
  backTex.colorSpace = THREE.SRGBColorSpace;
  frontTex.flipY = true;
  backTex.flipY = true;

  // proporção ID-1 ~ 85.6 × 53.98 mm
  const w = 0.856;
  const h = 0.5398;
  const d = 0.012;

  const geometry = new THREE.BoxGeometry(w, h, d);
  const edge = new THREE.MeshStandardMaterial({
    color: 0xc8c2b4,
    roughness: 0.85,
    metalness: 0.05,
  });
  const materials = [
    edge, // +x
    edge, // -x
    edge, // +y
    edge, // -y
    new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.55, metalness: 0.1 }), // +z frente
    new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.55, metalness: 0.1 }), // -z verso
  ];

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.name = "NerdsBrasilMemberCard";

  const scene = new THREE.Scene();
  scene.add(mesh);

  const exporter = new GLTFExporter();
  const gltf = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error("GLB esperado como ArrayBuffer"));
      },
      (err) => reject(err),
      { binary: true },
    );
  });

  const blob = new Blob([gltf], { type: "model/gltf-binary" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(url);

  geometry.dispose();
  for (const m of materials) m.dispose();
  frontTex.dispose();
  backTex.dispose();
}

"use client";

import { useEffect, useRef } from "react";
import type { CardVisualConfig } from "@/lib/prototype/card-config";
import { cn } from "@/lib/utils";

/**
 * Camada WebGL de foil (inspirada no Holosticker: diffraction + finish).
 * Lê --rx/--ry do card e uniforms do config. Não muda o layout — só overlay.
 */
export function CardFoilWebGL({
  config,
  subtle = false,
  className,
}: {
  config: CardVisualConfig;
  subtle?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config.holoEnabled) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });
    if (!gl) return;

    const vs = `
      attribute vec2 a_pos;
      varying vec2 v_uv;
      void main() {
        v_uv = a_pos * 0.5 + 0.5;
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      varying vec2 v_uv;
      uniform vec2 u_tilt;
      uniform float u_intensity;
      uniform float u_bands;
      uniform float u_hue;
      uniform float u_grain;
      uniform float u_finish; // 0 holo, 1 gloss, 2 matte, 3 chrome, 4 glitter
      uniform float u_pattern; // 0 linear, 1 radial, 2 patches
      uniform float u_time;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }

      void main() {
        vec2 uv = v_uv;
        float phase;
        if (u_pattern < 0.5) {
          phase = uv.x * u_bands + uv.y * (u_bands * 0.35) + u_tilt.x * 2.2 + u_tilt.y * 1.4;
        } else if (u_pattern < 1.5) {
          float d = length(uv - 0.5);
          phase = d * u_bands * 2.0 + u_tilt.x * 2.0;
        } else {
          vec2 cell = floor(uv * u_bands);
          phase = hash(cell) * 6.28 + u_tilt.x * 2.0 + u_tilt.y;
        }

        float rainbow = 0.5 + 0.5 * sin(phase * 6.28318 + u_hue * 6.28318);
        vec3 col = hsv2rgb(vec3(fract(rainbow + u_hue), 0.55, 1.0));

        // finish tweaks
        if (u_finish > 2.5 && u_finish < 3.5) {
          // chrome — cooler, sharper
          col = mix(vec3(0.75, 0.8, 0.9), col, 0.45);
          col *= 1.15;
        } else if (u_finish > 0.5 && u_finish < 1.5) {
          // gloss — soft highlight
          col = mix(vec3(1.0), col, 0.35);
        } else if (u_finish > 3.5) {
          // glitter
          float spark = step(0.92, hash(uv * 180.0 + u_tilt * 3.0 + u_time));
          col += spark * vec3(1.0);
        }

        float g = (hash(uv * 90.0 + u_tilt) - 0.5) * u_grain;
        col += g;

        float edge = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x)
                   * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
        float a = u_intensity * edge;
        gl_FragColor = vec4(col, a);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTilt = gl.getUniformLocation(prog, "u_tilt");
    const uInt = gl.getUniformLocation(prog, "u_intensity");
    const uBands = gl.getUniformLocation(prog, "u_bands");
    const uHue = gl.getUniformLocation(prog, "u_hue");
    const uGrain = gl.getUniformLocation(prog, "u_grain");
    const uFinish = gl.getUniformLocation(prog, "u_finish");
    const uPattern = gl.getUniformLocation(prog, "u_pattern");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const finishMap: Record<string, number> = {
      holo: 0,
      gloss: 1,
      matte: 2,
      chrome: 3,
      glitter: 4,
    };
    const patternMap: Record<string, number> = {
      linear: 0,
      radial: 1,
      patches: 2,
    };

    let raf = 0;
    const t0 = performance.now();

    const resize = () => {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.floor(r.width * dpr));
      const h = Math.max(1, Math.floor(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const readTilt = () => {
      const card = host.closest(".license-card") as HTMLElement | null;
      const style = card ? getComputedStyle(card) : null;
      const rx = parseFloat(style?.getPropertyValue("--rx") || "0") || 0;
      const ry = parseFloat(style?.getPropertyValue("--ry") || "0") || 0;
      return { x: ry / 10, y: -rx / 10 };
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      resize();
      const tilt = readTilt();
      const intensity =
        config.holoIntensity * (subtle ? 0.35 : 1) * (config.finish === "matte" ? 0 : 1);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(uTilt, tilt.x, tilt.y);
      gl.uniform1f(uInt, intensity);
      gl.uniform1f(uBands, config.holoBands);
      gl.uniform1f(uHue, config.holoHueShift);
      gl.uniform1f(uGrain, config.holoGrain);
      gl.uniform1f(uFinish, finishMap[config.finish] ?? 0);
      gl.uniform1f(uPattern, patternMap[config.holoPattern] ?? 0);
      gl.uniform1f(uTime, (performance.now() - t0) * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    frame();
    return () => cancelAnimationFrame(raf);
  }, [config, subtle]);

  if (!config.holoEnabled || config.finish === "matte") {
    return null;
  }

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[6] overflow-hidden rounded-[14px] mix-blend-soft-light",
        className,
      )}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

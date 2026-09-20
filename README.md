# holo

Carteira de membro holográfica da Nerds Brasil — tilt 3D, foil WebGL, dock de customize, export PNG/GLB.

## Rodar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → redireciona para `/c/demo`.

Qualquer id em `/c/[id]` funciona. **Sem `DISCORD_BOT_TOKEN`**, o card usa mock (nome/foto padrão). Token é opcional e **não** deve ir no repositório.

## Defaults

- Finish: **Holo**
- Intensity: **8%**
- Band frequency: **1**
- Papel / watermark / OVD: look do spike atual

## Stack

Next.js 16 · React 19 · Tailwind 4 · Three.js (foil) · html-to-image / GLTF export

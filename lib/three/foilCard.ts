"use client";

/**
 * Barajita foil en 3D: marco de metal con grosor, cara con barniz (e iridiscencia
 * en épicas y legendarias) y reverso con el sello del sobre. La cara se dibuja en un
 * canvas 2D con el mismo diseño que la carta en CSS (components/Cromo.tsx).
 */

import * as THREE from "three";
import { RARITIES, cardNumber, formatCount, langStyle, yearsOnGithub, type Card, type Rarity } from "@/lib/cards";
import type { Dict } from "@/lib/i18n/dict";

export const CARD_W = 2.6;
export const CARD_H = (CARD_W * 88) / 63;
const RADIUS = 0.17;
const BORDER = 0.065;
const DEPTH = 0.05;

type Look = {
  metal: number;
  roughness: number;
  body: string[];
  rays: string;
  ink: string;
  soft: string;
  accent: string;
  irid: number;
  rim: number;
  rimIntensity: number;
  plate: [string, string, string];
  sparks: number;
  sparkColor: number;
  raysTint: number;
  raysOpacity: number;
};

export const LOOK: Record<Rarity, Look> = {
  comun: { metal: 0xb8804e, roughness: 0.32, body: ["#1c1814", "#110f0c"], rays: "rgba(192,138,90,0.22)", ink: "#f3e9dd", soft: "#b9a894", accent: "#d9a673", irid: 0, rim: 0xc08a5a, rimIntensity: 6, plate: ["#6b4a2b", "#e3b486", "#7a5230"], sparks: 0.25, sparkColor: 0xffd84d, raysTint: 0xffffff, raysOpacity: 0.35 },
  rara: { metal: 0xe9eef3, roughness: 0.22, body: ["#151a20", "#0d1015"], rays: "rgba(120,190,255,0.26)", ink: "#eef4fa", soft: "#9fb0c2", accent: "#9fd3ff", irid: 0.25, rim: 0x78beff, rimIntensity: 26, plate: ["#7d868f", "#ffffff", "#8e98a2"], sparks: 0.45, sparkColor: 0xbfe3ff, raysTint: 0xa8d4ff, raysOpacity: 0.7 },
  epica: { metal: 0xf2c94c, roughness: 0.2, body: ["#1d1426", "#110c17"], rays: "rgba(180,120,255,0.34)", ink: "#fff6de", soft: "#c9b8d9", accent: "#ffd84d", irid: 0.7, rim: 0xa064ff, rimIntensity: 26, plate: ["#8a6a12", "#fff3c0", "#b8860b"], sparks: 0.85, sparkColor: 0xffd84d, raysTint: 0xd0a8ff, raysOpacity: 0.7 },
  legendaria: { metal: 0xffd45c, roughness: 0.16, body: ["#ffe9a3", "#c99a1c"], rays: "rgba(255,255,255,0.5)", ink: "#2a1c00", soft: "#5c4610", accent: "#2a1c00", irid: 1, rim: 0xffffff, rimIntensity: 26, plate: ["#8a6a12", "#ffffff", "#9c7414"], sparks: 0.9, sparkColor: 0xffd84d, raysTint: 0xffffff, raysOpacity: 1 },
};

const TW = 900;
const TH = Math.round((900 * 88) / 63);

/** Familias de next/font (los nombres reales se generan al compilar). */
function fonts() {
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-archivo").trim() || '"Archivo", system-ui, sans-serif';
  const mono = css.getPropertyValue("--font-mono-jb").trim() || '"JetBrains Mono", ui-monospace, monospace';
  return { display, mono };
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + v * amt)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function fitText(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

/** Dibuja la cara de la carta. Usa la foto real de GitHub si se puede cargar. */
export async function drawCardFace(card: Card, t: Dict): Promise<HTMLCanvasElement> {
  const { display, mono } = fonts();
  await Promise.all([
    document.fonts.load(`900 40px ${display}`).catch(() => null),
    document.fonts.load(`700 20px ${mono}`).catch(() => null),
  ]);
  const avatar = card.avatar_url ? await loadImage(`${card.avatar_url}${card.avatar_url.includes("?") ? "&" : "?"}s=400`) : null;

  const r = card.rarity;
  const L = LOOK[r];
  const lang = langStyle(card.top_language);
  const name = card.name?.trim() || card.login;
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const g = c.getContext("2d")!;
  const s = TW / 240;

  const bg = g.createLinearGradient(0, 0, TW * 0.3, TH);
  bg.addColorStop(0, L.body[0]);
  if (r === "legendaria") {
    bg.addColorStop(0.45, "#e8be45");
    bg.addColorStop(0.6, "#fff3c0");
  }
  bg.addColorStop(1, L.body[1]);
  g.fillStyle = bg;
  g.fillRect(0, 0, TW, TH);

  // Rayos detrás de la foto
  const artH = 175 * s;
  const cx = TW / 2;
  const cy = artH * 0.55;
  g.save();
  g.beginPath();
  g.rect(0, 0, TW, artH);
  g.clip();
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, TW * 0.75);
  rg.addColorStop(0, L.rays);
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  for (let a = 0; a < 360; a += 15) {
    const a0 = (a * Math.PI) / 180;
    const a1 = ((a + 7) * Math.PI) / 180;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a0) * TW, cy + Math.sin(a0) * TW);
    g.lineTo(cx + Math.cos(a1) * TW, cy + Math.sin(a1) * TW);
    g.closePath();
    g.fill();
  }
  if (r === "epica" || r === "legendaria") {
    g.fillStyle = r === "legendaria" ? "rgba(255,255,255,0.9)" : "rgba(255,240,190,0.85)";
    for (let i = 0; i < 70; i++) {
      const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1;
      const y = (((Math.sin(i * 78.233) * 12345.678) % 1) + 1) % 1;
      g.beginPath();
      g.arc(x * TW, y * artH, ((i % 3) + 1) * 1.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  const sh = g.createLinearGradient(0, artH - 54 * s, 0, artH);
  sh.addColorStop(0, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = sh;
  g.fillRect(0, artH - 54 * s, TW, 54 * s);
  g.restore();

  // Foto
  const av = 103 * s;
  const ax = cx - av / 2;
  const ay = 10 * s + (artH - av) / 2;
  g.save();
  g.shadowColor = "rgba(0,0,0,0.5)";
  g.shadowBlur = 26 * s;
  g.shadowOffsetY = 14 * s;
  rr(g, ax - 3 * s, ay - 3 * s, av + 6 * s, av + 6 * s, 26 * s);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.fill();
  g.restore();
  g.save();
  rr(g, ax, ay, av, av, 24 * s);
  g.clip();
  if (avatar) {
    g.drawImage(avatar, ax, ay, av, av);
  } else {
    const ag = g.createRadialGradient(ax + av * 0.35, ay + av * 0.3, 0, ax + av / 2, ay + av / 2, av * 0.75);
    ag.addColorStop(0, shade(lang.color, 0.45));
    ag.addColorStop(0.35, lang.color);
    ag.addColorStop(1, shade(lang.color, -0.35));
    g.fillStyle = ag;
    g.fillRect(ax, ay, av, av);
    g.fillStyle = "#fff";
    g.font = `900 ${40 * s}px ${display}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase(), cx, ay + av / 2 + 2 * s);
  }
  g.restore();

  // Placa con el número y etiqueta de rareza
  const metal = (x0: number, x1: number) => {
    const m = g.createLinearGradient(x0, 0, x1, 0);
    m.addColorStop(0, L.plate[0]);
    m.addColorStop(0.5, L.plate[1]);
    m.addColorStop(1, L.plate[2]);
    return m;
  };
  g.font = `700 ${11 * s}px ${mono}`;
  const numText = "#" + cardNumber(card.id);
  const nw = g.measureText(numText).width + 16 * s;
  rr(g, 10 * s, 10 * s, nw, 22 * s, 6 * s);
  g.fillStyle = metal(10 * s, 10 * s + nw);
  g.fill();
  g.fillStyle = "#1a1200";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(numText, 10 * s + nw / 2, 21.5 * s);
  const label = `${RARITIES[r].symbol} ${t.rarity[r].label.toUpperCase()}`;
  g.font = `700 ${9 * s}px ${mono}`;
  const lw = g.measureText(label).width + 16 * s;
  rr(g, TW - 10 * s - lw, 10 * s, lw, 22 * s, 11 * s);
  g.fillStyle = "rgba(0,0,0,0.45)";
  g.fill();
  g.fillStyle = r === "legendaria" ? "#fff3c0" : L.accent;
  g.fillText(label, TW - 10 * s - lw / 2, 21.5 * s);

  // Línea de metal
  g.fillStyle = metal(0, TW);
  g.fillRect(0, artH, TW, 2 * s);

  // Nombre y datos
  const px = 12 * s;
  let y = artH + 12 * s;
  g.textAlign = "left";
  g.textBaseline = "top";
  g.fillStyle = L.ink;
  g.font = `900 ${28 * s}px ${display}`;
  g.save();
  g.scale(0.72, 1);
  g.fillText(fitText(g, name.toUpperCase(), (TW - 2 * px) / 0.72), px / 0.72, y);
  g.restore();
  y += 31 * s;
  g.font = `500 ${10 * s}px ${mono}`;
  g.fillStyle = L.soft;
  const login = fitText(g, "@" + card.login, 90 * s);
  g.fillText(login, px, y);
  const x = px + g.measureText(login).width + 8 * s;
  g.beginPath();
  g.arc(x + 4 * s, y + 6 * s, 4 * s, 0, Math.PI * 2);
  g.fillStyle = lang.color;
  g.fill();
  g.fillStyle = L.ink;
  g.fillText(card.top_language ?? t.card.polyglot, x + 11 * s, y);
  g.textAlign = "right";
  g.fillStyle = L.soft;
  g.fillText(`${t.card.level} ${yearsOnGithub(card.github_created_at)}${card.country ? " · " + card.country : ""}`, TW - px, y);
  y += 22 * s;

  // Estadísticas
  const sw = (TW - 2 * px - 12 * s) / 3;
  const shh = 38 * s;
  (
    [
      [t.card.stars, formatCount(card.stars)],
      [t.card.fans, formatCount(card.followers)],
      [t.card.commits, formatCount(card.commits)],
    ] as const
  ).forEach(([lab, val], i) => {
    const bx = px + i * (sw + 6 * s);
    rr(g, bx, y, sw, shh, 7 * s);
    g.fillStyle = r === "legendaria" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
    g.fill();
    g.strokeStyle = r === "legendaria" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)";
    g.lineWidth = 1.5;
    g.stroke();
    g.textAlign = "center";
    g.fillStyle = L.ink;
    g.font = `900 ${16 * s}px ${display}`;
    g.fillText(val, bx + sw / 2, y + 6 * s);
    g.fillStyle = L.soft;
    g.font = `700 ${7.5 * s}px ${mono}`;
    g.fillText(lab, bx + sw / 2, y + 25 * s);
  });
  y += shh + 8 * s;

  // Repo destacado
  const repo = card.top_repos[0];
  rr(g, px, y, TW - 2 * px, 26 * s, 7 * s);
  const rgb = g.createLinearGradient(px, 0, TW - px, 0);
  rgb.addColorStop(0, "rgba(255,216,77,0.20)");
  rgb.addColorStop(1, "rgba(255,216,77,0.04)");
  g.fillStyle = rgb;
  g.fill();
  g.strokeStyle = "rgba(255,216,77,0.35)";
  g.stroke();
  g.font = `700 ${10.5 * s}px ${mono}`;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillStyle = L.ink;
  g.fillText(fitText(g, "▸ " + (repo?.name ?? "hola-mundo"), 140 * s), px + 9 * s, y + 13 * s);
  g.textAlign = "right";
  g.fillStyle = L.accent;
  g.fillText("★ " + formatCount(repo?.stars ?? 0), TW - px - 9 * s, y + 13 * s);

  // Pie
  g.font = `700 ${8 * s}px ${mono}`;
  g.fillStyle = L.soft;
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  g.fillText("CROMOS DE DEVS", px, TH - 12 * s);
  g.textAlign = "right";
  g.fillText("{ } T1", TW - px, TH - 12 * s);
  return c;
}

export function drawCardBack(): HTMLCanvasElement {
  const { display, mono } = fonts();
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0d0b08";
  g.fillRect(0, 0, TW, TH);
  g.strokeStyle = "rgba(255,199,44,0.08)";
  g.lineWidth = 2;
  for (let i = -TH; i < TW + TH; i += 40) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + TH, TH);
    g.stroke();
  }
  const cx = TW / 2;
  const cy = TH / 2 - 60;
  const rg = g.createRadialGradient(cx, cy, 0, cx, cy, 380);
  rg.addColorStop(0, "rgba(255,199,44,0.35)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, TW, TH);
  const sg = g.createRadialGradient(cx - 50, cy - 50, 10, cx, cy, 170);
  sg.addColorStop(0, "#ffe08a");
  sg.addColorStop(0.5, "#ffc72c");
  sg.addColorStop(1, "#b88a00");
  g.beginPath();
  g.arc(cx, cy, 160, 0, Math.PI * 2);
  g.fillStyle = sg;
  g.fill();
  g.lineWidth = 14;
  g.strokeStyle = "#111";
  g.stroke();
  g.fillStyle = "#111";
  g.font = `700 120px ${mono}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("{}", cx, cy + 6);
  g.fillStyle = "#ffc72c";
  g.font = `900 110px ${display}`;
  g.save();
  g.scale(0.7, 1);
  g.fillText("CROMOS", cx / 0.7, cy + 300);
  g.fillText("DE DEVS", cx / 0.7, cy + 400);
  g.restore();
  return c;
}

function roundedShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function planeUV(geo: THREE.BufferGeometry, w: number, h: number) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  uv.needsUpdate = true;
}

export type FoilCard = { group: THREE.Group; dispose: () => void };

/** Monta la carta 3D a partir de los canvas de cara y reverso. */
export function createFoilCard(
  renderer: THREE.WebGLRenderer,
  faceCanvas: HTMLCanvasElement,
  backCanvas: HTMLCanvasElement,
  rarity: Rarity,
): FoilCard {
  const L = LOOK[rarity];
  const frameGeo = new THREE.ExtrudeGeometry(roundedShape(CARD_W, CARD_H, RADIUS), {
    depth: DEPTH,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 3,
    curveSegments: 12,
  });
  frameGeo.translate(0, 0, -DEPTH / 2);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: L.metal, metalness: 1, roughness: L.roughness, clearcoat: 0.6, clearcoatRoughness: 0.15 });
  const frame = new THREE.Mesh(frameGeo, frameMat);

  const fw = CARD_W - BORDER * 2;
  const fh = CARD_H - BORDER * 2;
  const faceGeo = new THREE.ShapeGeometry(roundedShape(fw, fh, RADIUS * 0.7), 12);
  planeUV(faceGeo, fw, fh);
  const faceTex = new THREE.CanvasTexture(faceCanvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: faceTex,
    roughness: 0.4,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    iridescence: L.irid,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [150, 520],
  });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.z = DEPTH / 2 + 0.014;

  const backTex = new THREE.CanvasTexture(backCanvas);
  backTex.colorSpace = THREE.SRGBColorSpace;
  const backMat = new THREE.MeshPhysicalMaterial({ map: backTex, roughness: 0.35, clearcoat: 1, metalness: 0.1 });
  const back = new THREE.Mesh(faceGeo, backMat);
  back.rotation.y = Math.PI;
  back.position.z = -DEPTH / 2 - 0.014;

  const group = new THREE.Group();
  group.add(frame, face, back);
  return {
    group,
    dispose: () => {
      frameGeo.dispose();
      faceGeo.dispose();
      [frameMat, faceMat, backMat].forEach((m) => m.dispose());
      [faceTex, backTex].forEach((t) => t.dispose());
    },
  };
}

/** Rayos de luz girando y destellos flotando detrás de la carta. */
export function createAmbience(rarity: Rarity) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(512, 512, 0, 512, 512, 512);
  rg.addColorStop(0, "rgba(255,230,150,0.55)");
  rg.addColorStop(0.5, "rgba(255,200,80,0.12)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  for (let a = 0; a < 360; a += 12) {
    const a0 = (a * Math.PI) / 180;
    const a1 = ((a + 5) * Math.PI) / 180;
    g.beginPath();
    g.moveTo(512, 512);
    g.lineTo(512 + Math.cos(a0) * 720, 512 + Math.sin(a0) * 720);
    g.lineTo(512 + Math.cos(a1) * 720, 512 + Math.sin(a1) * 720);
    g.closePath();
    g.fill();
  }
  const raysTex = new THREE.CanvasTexture(c);
  raysTex.colorSpace = THREE.SRGBColorSpace;
  const raysMat = new THREE.MeshBasicMaterial({ map: raysTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const raysGeo = new THREE.PlaneGeometry(12, 12);
  const rays = new THREE.Mesh(raysGeo, raysMat);
  rays.position.z = -2.5;

  const N = 90;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 3;
    seed[i] = Math.random() * 10;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dot = document.createElement("canvas");
  dot.width = dot.height = 64;
  const dg = dot.getContext("2d")!;
  const dgr = dg.createRadialGradient(32, 32, 0, 32, 32, 32);
  dgr.addColorStop(0, "rgba(255,245,210,1)");
  dgr.addColorStop(1, "rgba(255,245,210,0)");
  dg.fillStyle = dgr;
  dg.fillRect(0, 0, 64, 64);
  const dotTex = new THREE.CanvasTexture(dot);
  const sparkMat = new THREE.PointsMaterial({ size: 0.09, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sparks = new THREE.Points(sparkGeo, sparkMat);

  const group = new THREE.Group();
  group.add(rays, sparks);

  let baseOpacity = 0.5;
  const setRarity = (r: Rarity) => {
    const L = LOOK[r];
    raysMat.color.setHex(L.raysTint);
    baseOpacity = L.raysOpacity;
    raysMat.opacity = baseOpacity;
    sparkMat.color.setHex(L.sparkColor);
    sparkMat.opacity = L.sparks;
  };
  setRarity(rarity);

  let t = 0;
  return {
    group,
    setRarity,
    /** Intensidad extra (0..1) para el momento de revelar. */
    boost(k: number) {
      raysMat.opacity = Math.min(1, baseOpacity + k);
      rays.scale.setScalar(1 + k * 0.3);
    },
    update(dt: number, reduce: boolean) {
      t += dt;
      if (!reduce) rays.rotation.z += dt * 0.08;
      for (let i = 0; i < N; i++) pos[i * 3 + 1] += Math.sin(t + seed[i]) * 0.0015;
      sparkGeo.attributes.position.needsUpdate = true;
    },
    dispose() {
      raysGeo.dispose();
      sparkGeo.dispose();
      raysMat.dispose();
      sparkMat.dispose();
      raysTex.dispose();
      dotTex.dispose();
    },
  };
}

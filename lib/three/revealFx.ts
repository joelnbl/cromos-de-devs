"use client";

/**
 * Efectos del momento de revelar una carta: explosión de partículas, rayos de luz,
 * flash de fondo y anillo arcoíris. Todo con geometrías pequeñas y sin postprocesado.
 */

import * as THREE from "three";
import type { Rarity } from "@/lib/cards";

const COUNT: Record<Rarity, number> = { comun: 40, rara: 80, epica: 160, legendaria: 300, icono: 500 };
const COLORS: Record<Exclude<Rarity, "icono">, number[]> = {
  comun: [0xd08a4e, 0xe3b486, 0xb8804e],
  rara: [0xcfe6ff, 0x9fd3ff, 0xe9eef3],
  epica: [0xffd84d, 0xb07cff, 0xfff3c0],
  legendaria: [0xffd84d, 0xfff3c0, 0xffffff, 0xffc233],
};
const LIFE = 1.2;

function glowTexture(inner = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(255,255,255,${inner})`);
  gr.addColorStop(0.4, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function beamsTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  rg.addColorStop(0, "rgba(255,255,255,0.9)");
  rg.addColorStop(0.55, "rgba(255,255,255,0.28)");
  rg.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = rg;
  const beams = 14;
  for (let i = 0; i < beams; i++) {
    const a = (i / beams) * Math.PI * 2 + (i % 3) * 0.05;
    const w = 0.07 + (i % 4) * 0.025;
    g.beginPath();
    g.moveTo(256, 256);
    g.lineTo(256 + Math.cos(a - w) * 400, 256 + Math.sin(a - w) * 400);
    g.lineTo(256 + Math.cos(a + w) * 400, 256 + Math.sin(a + w) * 400);
    g.closePath();
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ringTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 128, 70, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0)");
  gr.addColorStop(0.7, "rgba(255,255,255,0.9)");
  gr.addColorStop(0.85, "rgba(255,255,255,0.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Burst = { geo: THREE.BufferGeometry; mat: THREE.PointsMaterial; pts: THREE.Points; vel: Float32Array; age: number };

export function createRevealFx(scene: THREE.Scene, reduce: boolean) {
  const group = new THREE.Group();
  scene.add(group);
  const dotTex = glowTexture();
  const beamTex = beamsTexture();
  const ringTex = ringTexture();

  // Rayos: dos capas girando en sentidos opuestos detrás de la carta
  const beamGeo = new THREE.PlaneGeometry(15, 15);
  const mkBeam = (z: number) => {
    const m = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(beamGeo, m);
    mesh.position.z = z;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  };
  const beamA = mkBeam(-1.4);
  const beamB = mkBeam(-1.2);
  let beamTarget = 0;
  let beamLevel = 0;
  let rainbow = false;

  // Flash de fondo
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const flashGeo = new THREE.PlaneGeometry(40, 40);
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.z = -2.2;
  flash.visible = false;
  group.add(flash);
  let flashT = 0;
  let flashPeak = 0;

  // Anillo arcoíris
  const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const ringGeo = new THREE.PlaneGeometry(2, 2);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.z = 0.9;
  ring.visible = false;
  group.add(ring);
  let ringT = -1;

  // Temblor
  let shakeT = 0;
  let shakeAmp = 0;
  const shakeOff = new THREE.Vector3();

  const bursts: Burst[] = [];
  const killBurst = (b: Burst) => {
    group.remove(b.pts);
    b.geo.dispose();
    b.mat.dispose();
  };

  const burst = (rarity: Rarity, origin: THREE.Vector3) => {
    const n = reduce ? 12 : COUNT[rarity];
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const vel = new Float32Array(n * 3);
    const tmp = new THREE.Color();
    const power = 1 + ["comun", "rara", "epica", "legendaria", "icono"].indexOf(rarity) * 0.25;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      // Dirección radial en esfera, con sesgo hacia el plano de la pantalla
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = (1.6 + Math.random() * 3.2) * power * (reduce ? 0.4 : 1);
      vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp;
      vel[i * 3 + 1] = Math.sin(ph) * Math.sin(th) * sp + 0.8;
      vel[i * 3 + 2] = Math.cos(ph) * sp * 0.5;
      if (rarity === "icono") tmp.setHSL(Math.random(), 1, 0.62);
      else {
        const list = COLORS[rarity];
        tmp.setHex(list[(Math.random() * list.length) | 0]);
      }
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: rarity === "comun" ? 0.14 : 0.2,
      map: dotTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    group.add(pts);
    bursts.push({ geo, mat, pts, vel, age: 0 });
  };

  return {
    /** Revelado: partículas + rayos + (sin reduce) flash, temblor y anillo. */
    reveal(rarity: Rarity, origin: THREE.Vector3) {
      burst(rarity, origin);
      rainbow = rarity === "icono";
      const strong = rarity === "legendaria" || rarity === "icono";
      beamTarget = rarity === "icono" ? 1 : rarity === "legendaria" ? 0.85 : rarity === "epica" ? 0.5 : 0;
      if (reduce) return;
      if (strong) {
        flashPeak = rarity === "icono" ? 0.9 : 0.75;
        flashT = 0.3;
        shakeAmp = rarity === "icono" ? 0.1 : 0.07;
        shakeT = 0.6;
      } else if (rarity === "epica") {
        flashPeak = 0.25;
        flashT = 0.3;
      }
      if (rarity === "icono") ringT = 0;
    },
    /** Al cambiar de carta, los rayos se apagan. */
    calm() {
      beamTarget = 0;
    },
    /** Desplazamiento de cámara; sumarlo a su posición base cada frame. */
    shake: shakeOff,
    update(dt: number, time: number) {
      beamLevel += (beamTarget - beamLevel) * (1 - Math.pow(0.02, dt));
      const vis = beamLevel > 0.01;
      beamA.visible = beamB.visible = vis;
      if (vis) {
        const pulse = reduce ? 1 : 0.85 + Math.sin(time * 3) * 0.15;
        const o = Math.min(1, beamLevel * pulse);
        (beamA.material as THREE.MeshBasicMaterial).opacity = o * 0.6;
        (beamB.material as THREE.MeshBasicMaterial).opacity = o * 0.4;
        if (!reduce) {
          beamA.rotation.z += dt * 0.25;
          beamB.rotation.z -= dt * 0.17;
        }
        const col = rainbow ? new THREE.Color().setHSL((time * 0.12) % 1, 0.85, 0.7) : new THREE.Color(0xffe9a8);
        (beamA.material as THREE.MeshBasicMaterial).color.copy(col);
        (beamB.material as THREE.MeshBasicMaterial).color.copy(rainbow ? col.offsetHSL(0.4, 0, 0) : new THREE.Color(0xffffff));
      }

      if (flashT > 0) {
        flashT = Math.max(0, flashT - dt);
        flashMat.opacity = flashPeak * (flashT / 0.3);
        flash.visible = flashT > 0;
      }

      if (ringT >= 0) {
        ringT += dt;
        const k = ringT / 1.1;
        if (k >= 1) {
          ringT = -1;
          ring.visible = false;
        } else {
          ring.visible = true;
          ring.scale.setScalar(2.2 + k * 7);
          ringMat.opacity = (1 - k) * 0.9;
          ringMat.color.setHSL((time * 0.5 + k) % 1, 1, 0.62);
        }
      }

      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const a = shakeAmp * (shakeT / 0.6) * (shakeT / 0.6);
        shakeOff.set(Math.sin(time * 70) * a, Math.cos(time * 83) * a, 0);
      } else shakeOff.set(0, 0, 0);

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.age += dt;
        if (b.age >= LIFE) {
          killBurst(b);
          bursts.splice(i, 1);
          continue;
        }
        const p = b.geo.attributes.position as THREE.BufferAttribute;
        const a = p.array as Float32Array;
        const drag = Math.pow(0.35, dt);
        for (let j = 0; j < a.length; j += 3) {
          b.vel[j + 1] -= 3.2 * dt;
          b.vel[j] *= drag;
          b.vel[j + 1] *= drag;
          b.vel[j + 2] *= drag;
          a[j] += b.vel[j] * dt;
          a[j + 1] += b.vel[j + 1] * dt;
          a[j + 2] += b.vel[j + 2] * dt;
        }
        p.needsUpdate = true;
        const k = b.age / LIFE;
        b.mat.opacity = 1 - k * k;
      }
    },
    dispose() {
      bursts.forEach(killBurst);
      bursts.length = 0;
      scene.remove(group);
      beamGeo.dispose();
      flashGeo.dispose();
      ringGeo.dispose();
      [beamA, beamB].forEach((m) => (m.material as THREE.Material).dispose());
      flashMat.dispose();
      ringMat.dispose();
      dotTex.dispose();
      beamTex.dispose();
      ringTex.dispose();
    },
  };
}

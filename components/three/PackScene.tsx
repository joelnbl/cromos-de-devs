"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sfx } from "@/lib/sound";

type Props = {
  /** Primer contacto con el sobre: buen momento para pedir las cartas al servidor. */
  onInteract: () => void;
  /** null mientras no se sabe; true si en el sobre hay una legendaria. */
  getLegendary: () => boolean | null;
  /** Se llama cuando termina la animación de apertura. */
  onTorn: () => void;
  /** Si no hay WebGL, el componente padre usa el sobre en CSS. */
  onFail: () => void;
  /** Cambia este número para abrir el sobre sin gesto (botón accesible). */
  tearSignal: number;
  /** El arrastre avanza el rasgado (0..1); útil para la pista visual. */
  onProgress?: (p: number) => void;
  /** Texto de la etiqueta del sobre («5 CROMOS · T1»). */
  label?: string;
};

const W = 2;
const H = 3.2;
const STRIP = 0.42;
const D = 0.06;

function makeFoilCanvas(withText: boolean, label = "5 CROMOS · T1") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round((512 * H) / W);
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, c.width, c.height);
  grad.addColorStop(0, "#C99000");
  grad.addColorStop(0.25, "#FFD45C");
  grad.addColorStop(0.45, "#FFF1B8");
  grad.addColorStop(0.6, "#FFC72C");
  grad.addColorStop(1, "#B88A00");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);

  g.save();
  g.globalAlpha = 0.18;
  g.strokeStyle = "#ffffff";
  g.lineWidth = 26;
  for (let x = -c.height; x < c.width + c.height; x += 70) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + c.height, c.height);
    g.stroke();
  }
  g.restore();

  const stripPx = (STRIP / H) * c.height;
  // Zonas de cierre (arriba y abajo) con estrías
  g.fillStyle = "rgba(0,0,0,0.18)";
  for (let x = 0; x < c.width; x += 10) {
    g.fillRect(x, 0, 4, stripPx * 0.55);
    g.fillRect(x, c.height - 34, 4, 34);
  }
  // Línea de corte
  g.setLineDash([16, 12]);
  g.strokeStyle = "rgba(17,17,17,0.75)";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(0, stripPx);
  g.lineTo(c.width, stripPx);
  g.stroke();
  g.setLineDash([]);

  if (withText) {
    const cx = c.width / 2;
    const cy = c.height * 0.48;
    g.fillStyle = "#111111";
    g.beginPath();
    g.arc(cx, cy - 150, 72, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = "#FFF4C2";
    g.stroke();
    g.fillStyle = "#FFC72C";
    g.font = "700 64px ui-monospace, Menlo, monospace";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("{ }", cx, cy - 146);

    g.fillStyle = "#111111";
    g.font = "900 104px Archivo, 'Arial Narrow', Impact, sans-serif";
    g.fillText("CROMOS", cx, cy + 10);
    g.fillText("DE DEVS", cx, cy + 112);

    g.fillStyle = "#111111";
    const pillW = 270;
    g.beginPath();
    g.roundRect(cx - pillW / 2, cy + 190, pillW, 56, 28);
    g.fill();
    g.fillStyle = "#FFC72C";
    g.font = "700 30px ui-monospace, Menlo, monospace";
    g.fillText(label, cx, cy + 219);
  }
  return c;
}

/** Mapa de normales con arrugas de papel de aluminio. */
function makeCrinkleNormal() {
  const size = 256;
  const h = document.createElement("canvas");
  h.width = h.height = size;
  const g = h.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 60;
    const a = Math.random() * Math.PI;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    const lg = g.createLinearGradient(-r, 0, r, 0);
    const v = 100 + Math.random() * 60;
    lg.addColorStop(0, `rgba(${v},${v},${v},0)`);
    lg.addColorStop(0.5, `rgba(${v + 60},${v + 60},${v + 60},0.5)`);
    lg.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = lg;
    g.fillRect(-r, -r * 0.35, r * 2, r * 0.7);
    g.restore();
  }
  const src = g.getImageData(0, 0, size, size).data;
  const out = g.createImageData(size, size);
  const hAt = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * 3;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(h);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  return tex;
}

function makeGlowTexture(color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, color);
  rg.addColorStop(0.35, color.replace("1)", "0.45)"));
  rg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function PackScene({ onInteract, getLegendary, onTorn, onFail, tearSignal, onProgress, label }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<{ tear: () => void } | null>(null);
  const cb = useRef({ onInteract, getLegendary, onTorn, onFail, onProgress });
  useEffect(() => {
    cb.current = { onInteract, getLegendary, onTorn, onFail, onProgress };
  });

  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      cb.current.onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.95;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2, 3, 4);
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.35));
    const goldLight = new THREE.PointLight(0xffc72c, 0, 8);
    goldLight.position.set(0, 0, 2);
    scene.add(goldLight);

    // --- Texturas y materiales
    const frontCanvas = makeFoilCanvas(true, label);
    const plainCanvas = makeFoilCanvas(false);
    const normal = makeCrinkleNormal();
    const frontTex = new THREE.CanvasTexture(frontCanvas);
    frontTex.colorSpace = THREE.SRGBColorSpace;
    frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const plainTex = new THREE.CanvasTexture(plainCanvas);
    plainTex.colorSpace = THREE.SRGBColorSpace;

    const bodyFrontTex = frontTex.clone();
    bodyFrontTex.repeat.set(1, (H - STRIP) / H);
    bodyFrontTex.offset.set(0, 0);
    bodyFrontTex.needsUpdate = true;
    const stripFrontTex = frontTex.clone();
    stripFrontTex.repeat.set(1, STRIP / H);
    stripFrontTex.offset.set(0, (H - STRIP) / H);
    stripFrontTex.needsUpdate = true;

    const foil = (map: THREE.Texture) =>
      new THREE.MeshPhysicalMaterial({
        map,
        normalMap: normal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        metalness: 0.62,
        roughness: 0.34,
        envMapIntensity: 0.75,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25,
        iridescence: 0.25,
        iridescenceIOR: 1.35,
        emissive: new THREE.Color(0xffb300),
        emissiveIntensity: 0,
      });
    const sideMat = foil(plainTex);
    const bodyMat = foil(bodyFrontTex);
    const stripMat = foil(stripFrontTex);
    const backMat = foil(plainTex);
    // La tira usa materiales propios para poder desvanecerse sin afectar al cuerpo
    const stripSideMat = foil(plainTex);
    const stripBackMat = foil(plainTex);
    const stripMats = [stripSideMat, stripMat, stripBackMat];
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pack = new THREE.Group();
    scene.add(pack);
    const bodyGeo = new THREE.BoxGeometry(W, H - STRIP, D);
    const body = new THREE.Mesh(bodyGeo, [sideMat, sideMat, sideMat, sideMat, bodyMat, backMat]);
    body.position.y = -STRIP / 2;
    const stripGeo = new THREE.BoxGeometry(W, STRIP, D);
    const strip = new THREE.Mesh(stripGeo, [stripSideMat, stripSideMat, stripSideMat, stripSideMat, stripMat, stripBackMat]);
    const stripPivot = new THREE.Group();
    stripPivot.position.set(-W / 2, H / 2 - STRIP, 0);
    strip.position.set(W / 2, STRIP / 2, 0);
    stripPivot.add(strip);
    pack.add(body, stripPivot);

    // Destello detrás del sobre
    const glowTex = makeGlowTexture("rgba(255,230,150,1)");
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(5, 5, 1);
    glow.position.z = -0.4;
    scene.add(glow);

    // Chispas
    const N = 160;
    const sparkGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const sparkTex = makeGlowTexture("rgba(255,240,190,1)");
    const sparkMat = new THREE.PointsMaterial({ size: 0.12, map: sparkTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe08a });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);
    const burstSparks = (gold: boolean) => {
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * W;
        pos[i * 3 + 1] = H / 2 - STRIP + (Math.random() - 0.5) * 0.2;
        pos[i * 3 + 2] = 0.1;
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * (gold ? 4.5 : 3);
        vel[i * 3] = Math.cos(a) * s;
        vel[i * 3 + 1] = Math.abs(Math.sin(a)) * s + 1;
        vel[i * 3 + 2] = (Math.random() - 0.2) * 2;
      }
      sparkMat.color.set(gold ? 0xffd84d : 0xfff3c0);
      sparkMat.opacity = 1;
      sparkGeo.attributes.position.needsUpdate = true;
    };

    // Luz que escapa por la abertura
    const gapY = H / 2 - STRIP;
    const gapLight = new THREE.PointLight(0xfff0c0, 0, 7);
    gapLight.position.set(0, gapY, 0.6);
    scene.add(gapLight);
    const beamTex = makeGlowTexture("rgba(255,236,170,1)");
    const beamMat = new THREE.SpriteMaterial({ map: beamTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const beam = new THREE.Sprite(beamMat);
    beam.position.set(0, gapY, 0.35);
    beam.scale.set(W * 1.7, 1.1, 1);
    scene.add(beam);

    // Fibras de papel al rasgar
    const FN = 90;
    const fibGeo = new THREE.BufferGeometry();
    const fibPos = new Float32Array(FN * 3).fill(-50);
    const fibVel = new Float32Array(FN * 3);
    fibGeo.setAttribute("position", new THREE.BufferAttribute(fibPos, 3));
    const fibTex = makeGlowTexture("rgba(255,248,225,1)");
    const fibMat = new THREE.PointsMaterial({ size: 0.075, map: fibTex, transparent: true, opacity: 0.95, depthWrite: false, color: 0xfff4d6 });
    const fibers = new THREE.Points(fibGeo, fibMat);
    fibers.frustumCulled = false;
    scene.add(fibers);
    let fibNext = 0;
    const spawnFiber = (x: number) => {
      const v = new THREE.Vector3(x, gapY, 0.05);
      pack.localToWorld(v);
      const i = fibNext++ % FN;
      fibPos[i * 3] = v.x + (Math.random() - 0.5) * 0.05;
      fibPos[i * 3 + 1] = v.y + (Math.random() - 0.5) * 0.04;
      fibPos[i * 3 + 2] = v.z + 0.05;
      fibVel[i * 3] = (Math.random() - 0.5) * 0.7;
      fibVel[i * 3 + 1] = Math.random() * 0.5;
      fibVel[i * 3 + 2] = (Math.random() - 0.3) * 0.5;
    };

    // Confeti de foil
    const CN = 40;
    const confGeo = new THREE.PlaneGeometry(0.17, 0.11);
    const confMat = foil(plainTex);
    confMat.side = THREE.DoubleSide;
    const confetti = new THREE.InstancedMesh(confGeo, confMat, CN);
    confetti.frustumCulled = false;
    confetti.visible = false;
    confetti.count = 0;
    scene.add(confetti);
    const cPos = new Float32Array(CN * 3);
    const cVel = new Float32Array(CN * 3);
    const cRot = new Float32Array(CN * 3);
    const cSpin = new Float32Array(CN * 3);
    const cPhase = new Float32Array(CN);
    const cScale = new Float32Array(CN).fill(1);
    const cDummy = new THREE.Object3D();
    const cColor = new THREE.Color();
    let confAge = -1;
    const burstConfetti = (legendary: boolean) => {
      const n = legendary ? 40 : 28;
      confetti.count = n;
      confetti.visible = true;
      for (let i = 0; i < n; i++) {
        cPos[i * 3] = (Math.random() - 0.5) * W * 0.9;
        cPos[i * 3 + 1] = gapY + Math.random() * 0.1;
        cPos[i * 3 + 2] = 0.15 + Math.random() * 0.2;
        const a = Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const sp = 2.5 + Math.random() * 3.5;
        cVel[i * 3] = Math.cos(a) * sp;
        cVel[i * 3 + 1] = Math.sin(a) * sp;
        cVel[i * 3 + 2] = Math.random() * 1.8;
        for (let k = 0; k < 3; k++) {
          cRot[i * 3 + k] = Math.random() * Math.PI * 2;
          cSpin[i * 3 + k] = (Math.random() - 0.5) * 16;
        }
        cPhase[i] = Math.random() * 6.28;
        cScale[i] = 0.7 + Math.random() * 0.9;
        if (legendary) cColor.setHSL(Math.random(), 0.85, 0.62);
        else cColor.setRGB(0.85 + Math.random() * 0.25, 0.85 + Math.random() * 0.2, 0.7 + Math.random() * 0.3);
        confetti.setColorAt(i, cColor);
      }
      if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;
      confAge = 0;
    };

    // Física de la tira arrancada
    const sv = { vx: 0, vy: 0, vz: 0, wz: 0, wx: 0, wy: 0 };
    let gapK = 0;

    // --- Estado
    const s = {
      phase: "idle" as "idle" | "dragging" | "strip" | "waiting" | "suspense" | "burst" | "done",
      t: 0,
      phaseT: 0,
      tilt: new THREE.Vector2(),
      tiltTarget: new THREE.Vector2(),
      progress: 0,
      dragStart: null as null | { x: number; y: number },
      lastCrinkle: 0,
      interacted: false,
      legendary: false,
    };

    const interact = () => {
      if (!s.interacted) {
        s.interacted = true;
        cb.current.onInteract();
      }
    };

    const startTear = () => {
      if (s.phase !== "idle" && s.phase !== "dragging") return;
      interact();
      sfx.tear();
      if (reduceMotion) {
        // Sin movimiento: apertura directa
        stripPivot.visible = false;
        s.phase = "waiting";
        s.phaseT = 0;
        return;
      }
      s.phase = "strip";
      s.phaseT = 0;
      // Pasar el pivote al centro de la tira para que gire sobre sí misma
      const rz = stripPivot.rotation.z;
      const ox = W / 2;
      const oy = STRIP / 2;
      stripPivot.position.x += ox * Math.cos(rz) - oy * Math.sin(rz);
      stripPivot.position.y += ox * Math.sin(rz) + oy * Math.cos(rz);
      strip.position.set(0, 0, 0);
      sv.vx = 1.4 + Math.random() * 0.6;
      sv.vy = 4.2;
      sv.vz = 2.2;
      sv.wz = 5 + Math.random() * 3;
      sv.wx = (Math.random() - 0.5) * 6;
      sv.wy = (Math.random() - 0.5) * 6;
      burstSparks(false);
      burstConfetti(cb.current.getLegendary() === true);
    };
    api.current = { tear: startTear };

    // --- Entrada
    const canvas = renderer.domElement;
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width };
    };
    const onDown = (e: PointerEvent) => {
      if (s.phase !== "idle") return;
      interact();
      const p = local(e);
      s.dragStart = { x: p.x, y: p.y };
      s.phase = "dragging";
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      s.tiltTarget.set((p.x - 0.5) * 0.9, (p.y - 0.5) * 0.6);
      if (s.phase === "dragging" && s.dragStart) {
        const dx = p.x - s.dragStart.x;
        s.progress = Math.min(1, Math.abs(dx) / 0.45);
        cb.current.onProgress?.(s.progress);
        if (s.t - s.lastCrinkle > 0.07 && Math.abs(dx) > 0.02) {
          s.lastCrinkle = s.t;
          sfx.crinkle();
        }
        if (!reduceMotion && Math.abs(dx) > 0.02) {
          const x = -W / 2 + s.progress * W;
          for (let k = 0; k < 2; k++) spawnFiber(x);
        }
        if (s.progress >= 1) startTear();
      }
    };
    const onUp = () => {
      if (s.phase === "dragging") {
        s.phase = "idle";
        s.dragStart = null;
      }
    };
    const onLeave = () => s.tiltTarget.set(0, 0);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);

    // Inclinar el móvil también mueve el sobre
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      s.tiltTarget.set(Math.max(-1, Math.min(1, e.gamma / 35)) * 0.45, Math.max(-1, Math.min(1, (e.beta - 45) / 35)) * 0.3);
    };
    window.addEventListener("deviceorientation", onOrient);

    // --- Tamaño
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      camera.aspect = w / h;
      // En pantallas estrechas, alejar para que quepa el sobre
      camera.position.z = w / h < 0.62 ? 8.6 : 7.2;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // --- Bucle
    let last = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      s.t += dt;
      s.phaseT += dt;

      s.tilt.lerp(s.tiltTarget, 0.08);
      key.position.set(2 + s.tilt.x * 4, 3 - s.tilt.y * 4, 4);

      let shake = 0;
      if (s.phase === "idle" || s.phase === "dragging") {
        pack.position.y = Math.sin(s.t * 1.6) * 0.06;
        pack.rotation.set(s.tilt.y * 0.5 + 0.05, s.tilt.x * 0.9 + Math.sin(s.t * 0.7) * 0.08, Math.sin(s.t * 1.1) * 0.02);
        const p = s.phase === "dragging" ? s.progress : Math.max(0, s.progress - dt * 3);
        if (s.phase === "idle") s.progress = p;
        // La parte rasgada se levanta y se dobla; el resto sigue pegado
        stripPivot.rotation.z = p * 0.42;
        stripPivot.rotation.x = -p * 0.3;
        stripPivot.rotation.y = p * 0.12;
        stripPivot.position.y = H / 2 - STRIP + p * 0.1;
        stripPivot.position.z = p * 0.2;
        gapK = p * 0.35;
      }

      if (s.phase === "strip") {
        // La tira sale volando: velocidad, gravedad y giro
        sv.vy -= 9 * dt;
        stripPivot.position.x += sv.vx * dt;
        stripPivot.position.y += sv.vy * dt;
        stripPivot.position.z += sv.vz * dt;
        stripPivot.rotation.z += sv.wz * dt;
        stripPivot.rotation.x += sv.wx * dt;
        stripPivot.rotation.y += sv.wy * dt;
        const fade = Math.max(0, Math.min(1, (s.phaseT - 0.35) / 0.3));
        stripMats.forEach((m) => (m.opacity = 1 - fade));
        gapK = Math.min(0.7, s.phaseT / 0.5 * 0.7);
        shake = 0.02;
        if (s.phaseT >= 0.7) {
          stripPivot.visible = false;
          s.phase = "waiting";
          s.phaseT = 0;
        }
      }

      if (s.phase === "waiting") {
        shake = 0.015;
        const leg = cb.current.getLegendary();
        if (leg !== null || s.phaseT > 8) {
          s.legendary = leg === true;
          s.phase = s.legendary ? "suspense" : "burst";
          s.phaseT = 0;
          if (s.legendary) sfx.rumble();
          else sfx.whoosh();
        }
      }

      if (s.phase === "suspense") {
        const k = Math.min(1, s.phaseT / 1.5);
        shake = 0.02 + k * 0.08;
        const em = k * 0.9;
        [bodyMat, sideMat, backMat].forEach((m) => (m.emissiveIntensity = em));
        goldLight.intensity = k * 30;
        gapK = 0.7 + k * 0.3;
        glowMat.opacity = k * 0.8;
        glow.scale.setScalar(4 + k * 2);
        if (k >= 1) {
          s.phase = "burst";
          s.phaseT = 0;
          burstSparks(true);
          sfx.whoosh();
        }
      }

      if (s.phase === "burst") {
        const k = Math.min(1, s.phaseT / 0.7);
        pack.position.y = -k * k * 5;
        pack.rotation.x = k * 0.6;
        glowMat.opacity = Math.max(glowMat.opacity, (1 - k) * 1);
        gapK = (s.legendary ? 1 : 0.8) * (1 - k * k);
        glow.scale.setScalar(5 + k * 6);
        if (k >= 1) {
          s.phase = "done";
          cb.current.onTorn();
        }
      }

      if (shake) {
        pack.position.x = (Math.random() - 0.5) * shake * 2;
        pack.rotation.z = (Math.random() - 0.5) * shake * 1.5;
      } else if (s.phase !== "burst") {
        pack.position.x *= 0.8;
      }

      // Luz por la abertura (sin parpadeos con movimiento reducido)
      if (s.phase === "done" || reduceMotion) gapK = 0;
      const gk = s.legendary ? 1 : 0.65;
      gapLight.intensity = gapK * gk * (s.legendary ? 45 : 16);
      beamMat.opacity = Math.min(1, gapK * gk * (s.legendary ? 1.2 : 0.9));
      beam.scale.set(W * (1.5 + gapK * 0.7), 0.7 + gapK * (s.legendary ? 1.6 : 0.9), 1);
      if (s.legendary) {
        const hue = (s.t * 0.6) % 1;
        gapLight.color.setHSL(hue, 0.9, 0.62);
        beamMat.color.setHSL(hue, 0.85, 0.72);
      } else {
        gapLight.color.set(0xfff0c0);
        beamMat.color.set(0xffffff);
      }

      // Fibras de papel
      for (let i = 0; i < FN; i++) {
        if (fibPos[i * 3 + 1] < -40) continue;
        fibVel[i * 3 + 1] -= 3.2 * dt;
        fibVel[i * 3] *= 1 - 1.5 * dt;
        fibPos[i * 3] += fibVel[i * 3] * dt;
        fibPos[i * 3 + 1] += fibVel[i * 3 + 1] * dt;
        fibPos[i * 3 + 2] += fibVel[i * 3 + 2] * dt;
        if (fibPos[i * 3 + 1] < -3) fibPos[i * 3 + 1] = -50;
      }
      fibGeo.attributes.position.needsUpdate = true;

      // Confeti de foil
      if (confAge >= 0) {
        confAge += dt;
        for (let i = 0; i < confetti.count; i++) {
          cVel[i * 3 + 1] -= 6 * dt;
          const drag = 1 - 1.3 * dt;
          cVel[i * 3] = cVel[i * 3] * drag + Math.sin(confAge * 4 + cPhase[i]) * 0.8 * dt;
          cVel[i * 3 + 1] *= drag;
          cVel[i * 3 + 2] *= drag;
          cPos[i * 3] += cVel[i * 3] * dt;
          cPos[i * 3 + 1] += cVel[i * 3 + 1] * dt;
          cPos[i * 3 + 2] += cVel[i * 3 + 2] * dt;
          for (let k = 0; k < 3; k++) cRot[i * 3 + k] += cSpin[i * 3 + k] * dt;
          cDummy.position.set(cPos[i * 3], cPos[i * 3 + 1], cPos[i * 3 + 2]);
          cDummy.rotation.set(cRot[i * 3], cRot[i * 3 + 1], cRot[i * 3 + 2]);
          cDummy.scale.setScalar(cScale[i] * Math.max(0, Math.min(1, (3 - confAge) / 0.8)));
          cDummy.updateMatrix();
          confetti.setMatrixAt(i, cDummy.matrix);
        }
        confetti.instanceMatrix.needsUpdate = true;
        if (confAge > 3) {
          confAge = -1;
          confetti.visible = false;
        }
      }

      // Chispas
      if (sparkMat.opacity > 0) {
        for (let i = 0; i < N; i++) {
          vel[i * 3 + 1] -= 4.5 * dt;
          pos[i * 3] += vel[i * 3] * dt;
          pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
          pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        }
        sparkGeo.attributes.position.needsUpdate = true;
        sparkMat.opacity = Math.max(0, sparkMat.opacity - dt * 0.7);
      }
      if (s.phase === "burst" || s.phase === "done") glowMat.opacity = Math.max(0, glowMat.opacity - dt * 1.4);

      renderer.render(scene, camera);
    };
    // Las tiras usan transparencia para desvanecerse
    stripMats.forEach((m) => (m.transparent = true));
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("deviceorientation", onOrient);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      api.current = null;
      [bodyGeo, stripGeo, sparkGeo, fibGeo, confGeo].forEach((g) => g.dispose());
      confetti.dispose();
      [sideMat, bodyMat, stripMat, backMat, stripSideMat, stripBackMat, confMat, glowMat, sparkMat, beamMat, fibMat].forEach((m) => m.dispose());
      [frontTex, plainTex, bodyFrontTex, stripFrontTex, normal, glowTex, sparkTex, beamTex, fibTex, envTex].forEach((t) => t.dispose());
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, [label]);

  useEffect(() => {
    if (tearSignal > 0) api.current?.tear();
  }, [tearSignal]);

  return <div ref={mount} className="absolute inset-0" />;
}

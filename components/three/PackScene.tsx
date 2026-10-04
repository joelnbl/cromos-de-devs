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
};

const W = 2;
const H = 3.2;
const STRIP = 0.42;
const D = 0.06;

function makeFoilCanvas(withText: boolean) {
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
    g.fillText("5 CROMOS · T1", cx, cy + 219);
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

export default function PackScene({ onInteract, getLegendary, onTorn, onFail, tearSignal, onProgress }: Props) {
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
    const frontCanvas = makeFoilCanvas(true);
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

    const pack = new THREE.Group();
    scene.add(pack);
    const bodyGeo = new THREE.BoxGeometry(W, H - STRIP, D);
    const body = new THREE.Mesh(bodyGeo, [sideMat, sideMat, sideMat, sideMat, bodyMat, backMat]);
    body.position.y = -STRIP / 2;
    const stripGeo = new THREE.BoxGeometry(W, STRIP, D);
    const strip = new THREE.Mesh(stripGeo, [sideMat, sideMat, sideMat, sideMat, stripMat, backMat]);
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
      s.phase = "strip";
      s.phaseT = 0;
      sfx.tear();
      burstSparks(false);
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
        stripPivot.rotation.z = p * 0.35;
        stripPivot.position.y = H / 2 - STRIP + p * 0.08;
      }

      if (s.phase === "strip") {
        // La tira sale volando
        const k = Math.min(1, s.phaseT / 0.55);
        stripPivot.rotation.z = 0.35 + k * 1.4;
        stripPivot.position.set(-W / 2 + k * 1.6, H / 2 - STRIP + k * 2.4, k * 0.8);
        strip.material.forEach((m: THREE.Material) => ((m as THREE.MeshPhysicalMaterial).opacity = 1 - k));
        shake = 0.02;
        if (k >= 1) {
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
    strip.material.forEach((m: THREE.Material) => (m.transparent = true));
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
      [bodyGeo, stripGeo, sparkGeo].forEach((g) => g.dispose());
      [sideMat, bodyMat, stripMat, backMat, glowMat, sparkMat].forEach((m) => m.dispose());
      [frontTex, plainTex, bodyFrontTex, stripFrontTex, normal, glowTex, sparkTex, envTex].forEach((t) => t.dispose());
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  useEffect(() => {
    if (tearSignal > 0) api.current?.tear();
  }, [tearSignal]);

  return <div ref={mount} className="absolute inset-0" />;
}

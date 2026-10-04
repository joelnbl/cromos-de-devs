"use client";

/**
 * «Su mundo»: isla flotante generada con los datos reales del dev.
 * Torres de cristal = repos destacados, cielo = estrellas, espiral = commits,
 * anillos del suelo = años en GitHub, holograma central = su foto.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Cromo } from "@/components/Cromo";
import { formatCount, langStyle, yearsOnGithub, type Card } from "@/lib/cards";
import { useT } from "@/lib/i18n/client";
import { LOOK } from "@/lib/three/foilCard";

type Props = { card: Card; onClose?: () => void };

const ISLAND_R = 5.2;
const TOWER_R = 3.3;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function fitText(g: CanvasRenderingContext2D, text: string, max: number) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function labelTexture(title: string, sub: string, color: string, mono: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 144;
  const g = c.getContext("2d")!;
  g.beginPath();
  g.roundRect(8, 8, 496, 128, 36);
  g.fillStyle = "rgba(8,10,24,0.72)";
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = color;
  g.stroke();
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ffffff";
  g.font = `800 50px ${mono}`;
  g.fillText(fitText(g, title, 450), 256, 58);
  g.fillStyle = color;
  g.font = `700 34px ${mono}`;
  g.fillText(sub, 256, 104);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function initialTexture(letter: string, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#fff";
  g.font = "900 150px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(letter.toUpperCase(), 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyTexture() {
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d")!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#02030a");
  gr.addColorStop(0.55, "#0b0b22");
  gr.addColorStop(0.85, "#241346");
  gr.addColorStop(1, "#3a1d52");
  g.fillStyle = gr;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Status = "loading" | "ready" | "failed";

export default function DevWorld({ card, onClose }: Props) {
  const t = useT();
  const mount = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const name = card.name?.trim() || card.login;

  useEffect(() => {
    closeBtn.current?.focus();
  }, []);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      queueMicrotask(() => setStatus("failed"));
      return;
    }
    if (!renderer.getContext()) {
      renderer.dispose();
      queueMicrotask(() => setStatus("failed"));
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    el.appendChild(canvas);

    const css = getComputedStyle(document.documentElement);
    const mono = css.getPropertyValue("--font-mono-jb").trim() || '"JetBrains Mono", ui-monospace, monospace';

    const scene = new THREE.Scene();
    const sky = skyTexture();
    scene.background = sky;
    scene.fog = new THREE.FogExp2(0x120d2c, 0.016);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);

    const L = LOOK[card.rarity];
    const rarityColor = new THREE.Color(L.rim);
    const lang = langStyle(card.top_language);
    const langColor = new THREE.Color(lang.color);
    const isIcon = card.rarity === "icono";

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 12, 8);
    const fill = new THREE.PointLight(rarityColor, 60, 30, 1.6);
    fill.position.set(-5, 5, -4);
    const glow = new THREE.PointLight(0xffffff, 30, 14, 1.8);
    glow.position.set(0, 3.2, 0);
    scene.add(key, fill, glow);

    const world = new THREE.Group();
    scene.add(world);

    // Isla: tapa + roca en cristal facetado
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.15, 0.5, 72),
      new THREE.MeshStandardMaterial({ color: 0x1a1d30, metalness: 0.1, roughness: 0.85 }),
    );
    top.position.y = -0.25;
    world.add(top);
    const rockProfile = [
      [ISLAND_R - 0.15, 0], [ISLAND_R - 0.55, -0.9], [ISLAND_R - 1.5, -1.7], [3.1, -2.9], [2.3, -3.8],
      [1.5, -4.9], [0.8, -5.9], [0, -7],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const rock = new THREE.Mesh(
      new THREE.LatheGeometry(rockProfile, 11),
      new THREE.MeshStandardMaterial({ color: 0x23233a, metalness: 0.2, roughness: 0.7, flatShading: true }),
    );
    rock.position.y = -0.5;
    world.add(rock);
    const edgeMat = new THREE.MeshBasicMaterial({ color: rarityColor });
    const edge = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_R - 0.05, 0.05, 8, 128), edgeMat);
    edge.rotation.x = Math.PI / 2;
    edge.position.y = -0.02;
    world.add(edge);

    // Anillos del suelo: uno por año en GitHub
    const years = Math.min(yearsOnGithub(card.github_created_at), 16);
    const yearRings: THREE.Mesh[] = [];
    const ringColor = new THREE.Color(lang.color).lerp(new THREE.Color(0xffffff), 0.35);
    for (let i = 0; i < years; i++) {
      const r = 1.55 + i * 0.2;
      const m = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.02, r + 0.02, 128),
        new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      world.add(m);
      yearRings.push(m);
    }

    // Torres de cristal
    const disposables: { dispose(): void }[] = [sky, env, pmrem, edgeMat];
    const towers: THREE.Group[] = [];
    const repos = (card.top_repos ?? []).slice(0, 6);
    const addLabel = (title: string, sub: string, color: string, y: number) => {
      const tex = labelTexture(title, sub, color, mono);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(3.4, 0.956, 1);
      sp.position.y = y;
      disposables.push(tex, mat);
      return sp;
    };
    const glassGeo = new THREE.CylinderGeometry(0.62, 0.78, 1, 6, 1);
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, 1, 8);
    const capGeo = new THREE.ConeGeometry(0.62, 0.8, 6);
    disposables.push(glassGeo, coreGeo, capGeo);

    if (repos.length === 0) {
      const g = new THREE.Group();
      const geo = new THREE.BoxGeometry(1.1, 4.4, 0.55);
      const mat = new THREE.MeshPhysicalMaterial({
        color: langColor, metalness: 0.9, roughness: 0.12, iridescence: 1, clearcoat: 1, emissive: langColor, emissiveIntensity: 0.12,
      });
      const mono3 = new THREE.Mesh(geo, mat);
      mono3.position.y = 2.2;
      g.add(mono3, addLabel(`@${card.login}`, t.world.noRepos, lang.color, 5.2));
      g.position.set(TOWER_R, 0, 0);
      world.add(g);
      towers.push(g);
      disposables.push(geo, mat);
    }
    repos.forEach((repo, i) => {
      const col = new THREE.Color(langStyle(repo.language).color);
      const h = 1.3 + Math.log(repo.stars + 1) * 0.62;
      const ang = (i / repos.length) * Math.PI * 2 + 0.5;
      const g = new THREE.Group();
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: col.clone().lerp(new THREE.Color(0xffffff), 0.25),
        transmission: 0.85, thickness: 1.4, roughness: 0.06, ior: 1.45, iridescence: 1, iridescenceIOR: 1.6,
        metalness: 0, clearcoat: 1, transparent: true, opacity: 0.92, attenuationColor: col, attenuationDistance: 1.4,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.scale.set(1, h, 1);
      glass.position.y = h / 2;
      const coreMat = new THREE.MeshBasicMaterial({ color: col });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.scale.set(1, h * 0.92, 1);
      core.position.y = h / 2;
      const capMat = new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.2 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = h + 0.4;
      const base = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.05, 6), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.02;
      const tl = new THREE.PointLight(col, 8, 5, 1.8);
      tl.position.y = h * 0.5;
      g.add(glass, core, cap, base, tl, addLabel(repo.name, `★ ${formatCount(repo.stars)}`, `#${col.getHexString()}`, h + 1.5));
      g.position.set(Math.cos(ang) * TOWER_R, 0, Math.sin(ang) * TOWER_R);
      g.rotation.y = hashStr(repo.name) % 6;
      world.add(g);
      towers.push(g);
      disposables.push(glassMat, coreMat, capMat, base.geometry, base.material as THREE.Material);
    });

    // Holograma central con la foto
    const holo = new THREE.Group();
    holo.position.y = 2.1;
    const discMat = new THREE.MeshBasicMaterial({ map: initialTexture((card.login[0] ?? "?"), lang.color), side: THREE.DoubleSide, toneMapped: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), discMat);
    const ringMat = new THREE.MeshBasicMaterial({ color: rarityColor, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.08, 12, 96), ringMat);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.25, 0.018, 8, 96),
      new THREE.MeshBasicMaterial({ color: rarityColor, transparent: true, opacity: 0.6 }),
    );
    ring2.rotation.x = Math.PI / 2.4;
    holo.add(disc, ring, ring2);
    world.add(holo);
    const beamMat = new THREE.MeshBasicMaterial({
      color: rarityColor, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.15, 2.1, 40, 1, true), beamMat);
    beam.position.y = 1.0;
    world.add(beam);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x0c0e1a, metalness: 0.8, roughness: 0.25 }));
    pad.position.y = 0.04;
    world.add(pad);
    disposables.push(discMat, disc.geometry, ringMat, ring.geometry, ring2.geometry, ring2.material as THREE.Material, beam.geometry, beamMat, pad.geometry, pad.material as THREE.Material);

    let disposed = false;
    if (card.avatar_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (disposed) return;
        const c = document.createElement("canvas");
        c.width = c.height = 256;
        c.getContext("2d")!.drawImage(img, 0, 0, 256, 256);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const old = discMat.map;
        discMat.map = tex;
        discMat.needsUpdate = true;
        old?.dispose();
      };
      img.src = `${card.avatar_url}${card.avatar_url.includes("?") ? "&" : "?"}s=256`;
    }

    // Cielo: estrellas ~ stars de GitHub (con tope)
    const nStars = Math.min(3000, Math.floor(200 + card.stars / 10));
    const rnd = mulberry(hashStr(card.login));
    const sp = new Float32Array(nStars * 3);
    const sc = new Float32Array(nStars * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < nStars; i++) {
      const u = rnd() * Math.PI * 2;
      const v = Math.acos(1 - rnd() * 1.75); // sesgo hacia arriba
      const r = 60 + rnd() * 90;
      sp[i * 3] = Math.sin(v) * Math.cos(u) * r;
      sp[i * 3 + 1] = Math.cos(v) * r - 8;
      sp[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
      tmp.setHSL(rnd() < 0.3 ? 0.08 : 0.6, 0.5, 0.65 + rnd() * 0.3);
      sc.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
    const starMat = new THREE.PointsMaterial({ size: 0.5, sizeAttenuation: true, vertexColors: true, fog: false, transparent: true, opacity: 0.95, depthWrite: false });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // Commits: partículas que suben en espiral
    const nCom = Math.min(700, Math.floor(50 + Math.sqrt(card.commits) * 6));
    const comPhase = new Float32Array(nCom);
    const comAng = new Float32Array(nCom);
    const comRad = new Float32Array(nCom);
    const comSpeed = new Float32Array(nCom);
    const cp = new Float32Array(nCom * 3);
    const cc = new Float32Array(nCom * 3);
    for (let i = 0; i < nCom; i++) {
      comPhase[i] = rnd();
      comAng[i] = rnd() * Math.PI * 2;
      comRad[i] = ISLAND_R + 0.4 + rnd() * 1.6;
      comSpeed[i] = 0.025 + rnd() * 0.03;
      tmp.copy(langColor).lerp(new THREE.Color(0xffffff), rnd() * 0.6);
      cc.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    const comGeo = new THREE.BufferGeometry();
    const comAttr = new THREE.BufferAttribute(cp, 3);
    comAttr.setUsage(THREE.DynamicDrawUsage);
    comGeo.setAttribute("position", comAttr);
    comGeo.setAttribute("color", new THREE.BufferAttribute(cc, 3));
    const comMat = new THREE.PointsMaterial({ size: 0.11, sizeAttenuation: true, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const commits = new THREE.Points(comGeo, comMat);
    commits.frustumCulled = false;
    world.add(commits);
    disposables.push(comGeo, comMat);
    const placeCommits = (time: number) => {
      for (let i = 0; i < nCom; i++) {
        const p = reduce ? comPhase[i] : (comPhase[i] + time * comSpeed[i]) % 1;
        const a = comAng[i] + p * Math.PI * 6;
        const r = comRad[i] * (1 - p * 0.45);
        cp[i * 3] = Math.cos(a) * r;
        cp[i * 3 + 1] = -0.5 + p * 15;
        cp[i * 3 + 2] = Math.sin(a) * r;
      }
      comAttr.needsUpdate = true;
    };
    placeCommits(0);

    // Cámara orbital propia
    const target = new THREE.Vector3(0, 1.6, 0);
    const cam = { theta: 0.6, phi: 1.22, dist: 19, tTheta: 0.6, tPhi: 1.22, tDist: 19, vTheta: 0, idle: 99, drag: false };
    const MIN_D = 7;
    const MAX_D = 42;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
      cam.drag = true;
      cam.idle = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      cam.idle = 0;
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) cam.tDist = THREE.MathUtils.clamp(cam.tDist * (pinch / d), MIN_D, MAX_D);
        pinch = d;
        return;
      }
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      cam.tTheta -= dx * 0.008;
      cam.vTheta = -dx * 0.008;
      cam.tPhi = THREE.MathUtils.clamp(cam.tPhi - dy * 0.006, 0.35, 1.5);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      pinch = 0;
      if (pointers.size === 0) {
        cam.drag = false;
        canvas.style.cursor = "grab";
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.tDist = THREE.MathUtils.clamp(cam.tDist * Math.exp(e.deltaY * 0.0012), MIN_D, MAX_D);
      cam.idle = 0;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const resize = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      renderer.setSize(w, h, false);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      camera.aspect = w / h;
      // En vertical (móvil) hay que alejar más para que quepa toda la isla
      const fit = camera.aspect < 1 ? 1 + (1 - camera.aspect) * 0.9 : 1;
      camera.userData.fit = fit;
      camera.updateProjectionMatrix();
      render();
    };

    const bgColor = new THREE.Color();
    let clock = 0;
    const render = () => {
      const fit = (camera.userData.fit as number) ?? 1;
      const d = cam.dist * fit;
      const sp2 = Math.sin(cam.phi);
      camera.position.set(
        target.x + d * sp2 * Math.sin(cam.theta),
        target.y + d * Math.cos(cam.phi),
        target.z + d * sp2 * Math.cos(cam.theta),
      );
      camera.lookAt(target);
      renderer.render(scene, camera);
    };

    let last = performance.now();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      clock += dt;
      cam.idle += dt;
      if (!cam.drag) {
        if (!reduce && cam.idle > 2) cam.tTheta += dt * 0.12;
        else {
          cam.tTheta += cam.vTheta;
          cam.vTheta *= 0.92;
        }
      }
      const k = reduce ? 1 : 1 - Math.pow(0.0015, dt);
      cam.theta += (cam.tTheta - cam.theta) * k;
      cam.phi += (cam.tPhi - cam.phi) * k;
      cam.dist += (cam.tDist - cam.dist) * k;

      if (!reduce) {
        world.position.y = Math.sin(clock * 0.8) * 0.18;
        holo.rotation.y += dt * 0.5;
        ring2.rotation.z += dt * 0.6;
        stars.rotation.y += dt * 0.004;
        placeCommits(clock);
        yearRings.forEach((m, i) => {
          (m.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(clock * 1.6 - i * 0.45));
        });
        towers.forEach((tw, i) => {
          tw.position.y = Math.sin(clock * 0.9 + i) * 0.03;
        });
      }
      if (isIcon) {
        bgColor.setHSL((clock * 0.08) % 1, 0.85, 0.62);
        ringMat.color.copy(bgColor);
        edgeMat.color.copy(bgColor);
        fill.color.copy(bgColor);
        beamMat.color.copy(bgColor);
      }
      render();
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible") {
        last = performance.now();
        loop();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    if (document.visibilityState === "visible") loop();
    queueMicrotask(() => setStatus("ready"));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
      discMat.map?.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, [card, t]);

  const year = card.github_created_at ? new Date(card.github_created_at).getFullYear() : new Date().getFullYear();

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05060f] text-white">
      <div ref={mount} className="absolute inset-0" role="img" aria-label={t.world.aria(name)} />
      {status === "failed" && (
        <div className="absolute inset-0 grid place-items-center gap-4 p-6 text-center">
          <div className="flex flex-col items-center gap-5">
            <Cromo card={card} className="[--w:min(70vw,280px)]" />
            <p role="alert" className="max-w-sm text-base font-bold">
              {t.world.failed}
            </p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4 pb-10 sm:p-6">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-wider text-sun">{t.world.title}</p>
          <h2 className="display mt-1 truncate text-3xl sm:text-4xl">{name}</h2>
          <p className="font-mono text-base font-bold text-white/80">@{card.login}</p>
          <p className="mt-1 font-mono text-sm font-bold text-white/90">
            {t.world.stats(formatCount(card.stars), formatCount(card.commits), formatCount(card.public_repos), String(year))}
          </p>
        </div>
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label={t.world.close}
          className="pointer-events-auto grid h-11 min-w-11 shrink-0 place-items-center gap-2 rounded-full border-2 border-white/80 bg-black/50 px-3 text-sm font-extrabold text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-sun"
        >
          <span className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <span className="hidden sm:inline">{t.world.close}</span>
          </span>
        </button>
      </div>
      {status !== "failed" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-center text-sm font-bold text-white/85">
          {t.world.help}
        </p>
      )}
    </div>
  );
}

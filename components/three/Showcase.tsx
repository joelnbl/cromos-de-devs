"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { toCanvas } from "html-to-image";
import { Cromo } from "@/components/Cromo";
import type { Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";

const CW = 2.4;
const CH = (CW * 88) / 63;

const RARITY_LOOK: Record<Card["rarity"], { iridescence: number; rim: number; rimIntensity: number }> = {
  comun: { iridescence: 0, rim: 0x777777, rimIntensity: 6 },
  rara: { iridescence: 0.35, rim: 0x3291ff, rimIntensity: 14 },
  epica: { iridescence: 0.8, rim: 0x9b4dff, rimIntensity: 18 },
  legendaria: { iridescence: 1, rim: 0xffffff, rimIntensity: 16 },
};

function backTexture() {
  const c = document.createElement("canvas");
  c.width = 630;
  c.height = 880;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0a0a0a";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "rgba(255,255,255,0.06)";
  g.lineWidth = 2;
  for (let x = 0; x < c.width; x += 36) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, c.height);
    g.stroke();
  }
  for (let y = 0; y < c.height; y += 36) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
  }
  g.fillStyle = "#ededed";
  g.beginPath();
  g.roundRect(c.width / 2 - 90, c.height / 2 - 140, 180, 180, 44);
  g.fill();
  g.fillStyle = "#0a0a0a";
  g.font = "600 76px ui-monospace, Menlo, monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("{ }", c.width / 2, c.height / 2 - 48);
  g.fillStyle = "#ededed";
  g.font = "600 46px system-ui, sans-serif";
  g.fillText("Cromos de devs", c.width / 2, c.height / 2 + 110);
  g.fillStyle = "#a1a1a1";
  g.font = "500 22px ui-monospace, Menlo, monospace";
  g.fillText("TEMPORADA 1", c.width / 2, c.height / 2 + 165);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pickMime() {
  const options = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? null;
}

type Status = "loading" | "ready" | "recording" | "failed";

export default function Showcase({ card }: { card: Card }) {
  const mount = useRef<HTMLDivElement>(null);
  const snap = useRef<HTMLDivElement>(null);
  const record = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [video, setVideo] = useState<{ url: string; file: File } | null>(null);

  useEffect(() => {
    const el = mount.current;
    const snapEl = snap.current;
    if (!el || !snapEl) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      } catch {
        setStatus("failed");
        return;
      }

      // Foto de la cara de la carta tal y como se ve en la web
      let frontCanvas: HTMLCanvasElement;
      try {
        await document.fonts.ready;
        const imgs = Array.from(snapEl.querySelectorAll("img"));
        await Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : new Promise((r) => (i.onload = i.onerror = r)))));
        const face = snapEl.querySelector(".cromo-front") as HTMLElement;
        frontCanvas = await toCanvas(face, { pixelRatio: 2, cacheBust: true });
      } catch {
        renderer.dispose();
        setStatus("failed");
        return;
      }
      if (disposed) {
        renderer.dispose();
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      el.appendChild(renderer.domElement);
      const canvas = renderer.domElement;
      canvas.style.display = "block";
      canvas.style.touchAction = "pan-y";

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0.3, 9);

      const look = RARITY_LOOK[card.rarity];
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 4, 5);
      const rim = new THREE.PointLight(look.rim, look.rimIntensity, 10);
      rim.position.set(-2.5, 1.5, -2);
      scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.25));

      const frontTex = new THREE.CanvasTexture(frontCanvas);
      frontTex.colorSpace = THREE.SRGBColorSpace;
      frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const backTex = backTexture();

      const faceMat = (map: THREE.Texture, irid: number) =>
        new THREE.MeshPhysicalMaterial({
          map,
          roughness: 0.42,
          metalness: 0.05,
          clearcoat: 1,
          clearcoatRoughness: 0.12,
          iridescence: irid,
          iridescenceIOR: 1.4,
          iridescenceThicknessRange: [180, 520],
          envMapIntensity: 0.6,
        });
      const frontMat = faceMat(frontTex, look.iridescence);
      const backMat = faceMat(backTex, 0.2);
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3 });
      const cardGeo = new THREE.BoxGeometry(CW, CH, 0.035);
      const cardMesh = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]);

      const holder = new THREE.Group();
      holder.add(cardMesh);
      holder.position.y = 0.45;
      scene.add(holder);

      const pedGeo = new THREE.CylinderGeometry(1.45, 1.65, 0.28, 64);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x121212, metalness: 0.7, roughness: 0.35 });
      const pedestal = new THREE.Mesh(pedGeo, pedMat);
      pedestal.position.y = -CH / 2 - 0.25;
      const ringGeo = new THREE.TorusGeometry(1.47, 0.02, 8, 96);
      const ringMat = new THREE.MeshBasicMaterial({ color: look.rim });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = pedestal.position.y + 0.15;
      scene.add(pedestal, ring);

      // --- Interacción: arrastrar para girar, con inercia
      const s = { angle: -0.35, vel: 0.35, dragging: false, lastX: 0, t: 0, recording: false, recT: 0 };
      const onDown = (e: PointerEvent) => {
        s.dragging = true;
        s.lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!s.dragging || s.recording) return;
        const dx = e.clientX - s.lastX;
        s.lastX = e.clientX;
        s.angle += dx * 0.012;
        s.vel = dx * 0.6;
      };
      const onUp = () => (s.dragging = false);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        camera.aspect = w / h;
        // Que la carta quepa a lo ancho también en pantallas estrechas
        camera.position.z = Math.max(9, 3.4 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * camera.aspect));
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // --- Grabación de vídeo (5 s, una vuelta completa)
      let recorder: MediaRecorder | null = null;
      record.current = () => {
        const mime = pickMime();
        if (!mime || !("captureStream" in canvas)) {
          alert("Tu navegador no permite grabar vídeo. Prueba con Chrome o Safari actualizados.");
          return;
        }
        const stream = canvas.captureStream(30);
        recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = () => {
          const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
          const blob = new Blob(chunks, { type: mime.split(";")[0] });
          const file = new File([blob], `cromo-${card.login}.${ext}`, { type: blob.type });
          setVideo({ url: URL.createObjectURL(blob), file });
          setStatus("ready");
          sfx.reveal(card.rarity);
        };
        s.recording = true;
        s.recT = 0;
        setStatus("recording");
        recorder.start();
      };

      let last = performance.now();
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        s.t += dt;
        if (s.recording) {
          s.recT += dt;
          s.angle = -0.35 + (s.recT / 5) * Math.PI * 2;
          if (s.recT >= 5) {
            s.recording = false;
            s.vel = 0.35;
            recorder?.stop();
          }
        } else if (!s.dragging) {
          s.vel += (0.35 - s.vel) * 0.02;
          s.angle += s.vel * dt;
        }
        holder.rotation.y = s.angle;
        holder.rotation.x = Math.sin(s.t * 0.8) * 0.04;
        holder.position.y = 0.45 + Math.sin(s.t * 1.4) * 0.06;
        renderer.render(scene, camera);
      };
      loop();
      setStatus("ready");

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        if (recorder && recorder.state !== "inactive") recorder.stop();
        record.current = null;
        [cardGeo, pedGeo, ringGeo].forEach((g) => g.dispose());
        [frontMat, backMat, edgeMat, pedMat, ringMat].forEach((m) => m.dispose());
        [frontTex, backTex, env].forEach((t) => t.dispose());
        pmrem.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [card]);

  useEffect(() => () => {
    if (video) URL.revokeObjectURL(video.url);
  }, [video]);

  const canShareFile =
    video && typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare?.({ files: [video.file] });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[460px] w-[min(88vw,380px)]">
        <div ref={mount} className="absolute inset-0" aria-label={`Tu cromo en 3D. Arrastra para girarlo.`} role="img" />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center">
            <Cromo card={card} width={230} interactive={false} />
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 grid place-items-center">
            <Cromo card={card} className="[--w:min(82vw,300px)]" />
          </div>
        )}
      </div>

      {/* Copia fuera de pantalla para sacar la textura de la carta */}
      <div ref={snap} aria-hidden="true" className="pointer-events-none fixed -left-[2000px] top-0">
        <Cromo card={card} width={315} interactive={false} />
      </div>

      {status !== "failed" && (
        <>
          <p className="text-sm font-bold text-ink-soft">Arrastra para girarla</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-dark"
              disabled={status !== "ready"}
              onClick={() => record.current?.()}
            >
              {status === "recording" ? "Grabando… 5 s" : "Grabar vídeo de 5 s"}
            </button>
            {video && (
              <a className="btn btn-ghost" href={video.url} download={video.file.name}>
                Descargar vídeo
              </a>
            )}
            {video && canShareFile && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigator.share({ files: [video.file], text: "¿Quién me tiene? Mi cromo de dev" }).catch(() => {})}
              >
                Compartir vídeo
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

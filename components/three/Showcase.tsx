"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Cromo } from "@/components/Cromo";
import type { Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";
import { CARD_H, CARD_W, LOOK, createAmbience, createFoilCard, drawCardBack, drawCardFace } from "@/lib/three/foilCard";

function pickMime() {
  const options = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? null;
}

type Status = "loading" | "ready" | "recording" | "failed";

/** Vitrina 3D de tu cromo, con grabación de un vídeo de 5 s. */
export default function Showcase({ card }: { card: Card }) {
  const t = useT();
  const mount = useRef<HTMLDivElement>(null);
  const record = useRef<(() => void) | null>(null);
  const flip = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [video, setVideo] = useState<{ url: string; file: File } | null>(null);
  const [noVideo, setNoVideo] = useState(false);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
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
      const faceCanvas = await drawCardFace(card, t);
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

      const L = LOOK[card.rarity];
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(3, 4, 5);
      const rim = new THREE.PointLight(L.rim, L.rimIntensity, 12);
      rim.position.set(-3, 2, -2);
      scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.2));

      const ambience = createAmbience(card.rarity);
      scene.add(ambience.group);
      const foil = createFoilCard(renderer, faceCanvas, drawCardBack(), card.rarity);
      scene.add(foil.group);

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const s = { ry: -0.35, rx: 0.05, vy: 0, drag: false, lx: 0, ly: 0, t: 0, idle: 0, target: null as number | null, recording: false, recT: 0, recFrom: 0 };

      const onDown = (e: PointerEvent) => {
        if (s.recording) return;
        s.drag = true;
        s.lx = e.clientX;
        s.ly = e.clientY;
        s.target = null;
        canvas.setPointerCapture(e.pointerId);
      };
      const onMove = (e: PointerEvent) => {
        if (!s.drag) return;
        const dx = e.clientX - s.lx;
        const dy = e.clientY - s.ly;
        s.lx = e.clientX;
        s.ly = e.clientY;
        s.vy = dx * 0.01;
        s.ry += s.vy;
        s.rx = Math.max(-0.6, Math.min(0.6, s.rx + dy * 0.006));
        s.idle = 0;
      };
      const onUp = () => (s.drag = false);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      flip.current = () => {
        s.target = (Math.round(s.ry / Math.PI) + 1) * Math.PI;
        s.idle = 0;
        sfx.flip();
      };

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        camera.aspect = w / h;
        const tan = 2 * Math.tan(THREE.MathUtils.degToRad(15));
        camera.position.z = Math.max((CARD_H + 0.9) / tan, (CARD_W + 0.9) / (tan * camera.aspect));
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // Grabación: una vuelta completa en 5 s
      let recorder: MediaRecorder | null = null;
      record.current = () => {
        const mime = pickMime();
        if (!mime || !("captureStream" in canvas)) {
          setNoVideo(true);
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
        s.recFrom = s.ry;
        s.target = null;
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
        s.idle += dt;
        if (s.recording) {
          s.recT += dt;
          s.ry = s.recFrom + (s.recT / 5) * Math.PI * 2;
          s.rx += (0.05 - s.rx) * 0.1;
          if (s.recT >= 5) {
            s.recording = false;
            recorder?.stop();
          }
        } else if (s.target !== null) {
          s.ry += (s.target - s.ry) * 0.12;
          if (Math.abs(s.target - s.ry) < 0.002) s.target = null;
        } else if (!s.drag) {
          s.vy *= 0.94;
          s.ry += s.vy;
          if (!reduce && s.idle > 2.5) s.ry += Math.sin(s.t * 0.6) * 0.004;
          s.rx += (0.05 - s.rx) * 0.03;
        }
        foil.group.rotation.set(s.rx, s.ry, 0);
        foil.group.position.y = reduce ? 0 : Math.sin(s.t * 1.3) * 0.06;
        key.position.set(3 + Math.sin(s.ry) * 2, 4, 5);
        ambience.update(dt, reduce);
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
        flip.current = null;
        foil.dispose();
        ambience.dispose();
        env.dispose();
        pmrem.dispose();
        renderer.dispose();
        canvas.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, [card, t]);

  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video.url);
    },
    [video],
  );

  const canShareFile =
    video && typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare?.({ files: [video.file] });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative h-[480px] w-[min(88vw,400px)] overflow-hidden rounded-3xl border-2 border-ink shadow-[6px_6px_0_#111]"
        style={{ background: "radial-gradient(circle at 50% 45%, #2e2208, #0d0b08 65%)" }}
      >
        <div ref={mount} className="absolute inset-0" aria-label={t.showcase.aria} role="img" />
        {status === "loading" && (
          <div className="absolute inset-0 grid place-items-center">
            <Cromo card={card} width={230} interactive={false} />
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 grid place-items-center">
            <Cromo card={card} className="[--w:min(70vw,280px)]" />
          </div>
        )}
      </div>

      {status !== "failed" && (
        <>
          <p className="text-sm font-bold text-ink-soft">{t.showcase.drag}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn btn-dark" disabled={status !== "ready"} onClick={() => record.current?.()}>
              {status === "recording" ? t.showcase.recording : t.showcase.record}
            </button>
            <button type="button" className="btn btn-ghost" disabled={status !== "ready"} onClick={() => flip.current?.()}>
              {t.showcase.flip}
            </button>
            {video && (
              <a className="btn btn-ghost" href={video.url} download={video.file.name}>
                {t.showcase.download}
              </a>
            )}
            {video && canShareFile && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => navigator.share({ files: [video.file], text: t.showcase.shareText }).catch(() => {})}
              >
                {t.showcase.shareVideo}
              </button>
            )}
          </div>
          {noVideo && (
            <p role="alert" className="max-w-sm text-center text-sm font-semibold">
              {t.showcase.noVideo}
            </p>
          )}
        </>
      )}
    </div>
  );
}

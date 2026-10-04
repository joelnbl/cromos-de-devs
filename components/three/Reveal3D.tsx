"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Card } from "@/lib/cards";
import { sfx } from "@/lib/sound";
import { useT } from "@/lib/i18n/client";
import { CARD_H, CARD_W, LOOK, createAmbience, createFoilCard, drawCardBack, drawCardFace, type FoilCard } from "@/lib/three/foilCard";

type Pull = { card: Card; isNew: boolean };

type Props = {
  pulls: Pull[];
  /** Carta que toca mostrar; al cambiar, la anterior sale volando. */
  index: number;
  /** Se llama cuando la carta `i` ya se ha dado la vuelta. */
  onRevealed: (i: number) => void;
  /** Si algo falla (sin WebGL), el padre usa la versión CSS. */
  onFail: () => void;
  /** Tocar la carta revelada = siguiente. */
  onTap: () => void;
};

type Slot = {
  foil: FoilCard;
  pos: THREE.Vector3;
  rot: THREE.Euler;
  tPos: THREE.Vector3;
  tRot: THREE.Euler;
  visible: boolean;
};

export default function Reveal3D({ pulls, index, onRevealed, onFail, onTap }: Props) {
  const t = useT();
  const tRef = useRef(t);
  const mount = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  const cb = useRef({ onRevealed, onFail, onTap });

  useEffect(() => {
    cb.current = { onRevealed, onFail, onTap };
  });
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        cb.current.onFail();
        return;
      }
      const faces = await Promise.all(pulls.map((p) => drawCardFace(p.card, tRef.current)));
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

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(3, 4, 5);
      const rim = new THREE.PointLight(0xffffff, 0, 12);
      rim.position.set(-3, 2, -2);
      scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.2));

      const ambience = createAmbience("comun");
      ambience.setRarity("comun");
      scene.add(ambience.group);

      const back = drawCardBack();
      const n = pulls.length;
      const mid = (n - 1) / 2;
      const slots: Slot[] = pulls.map((p, i) => {
        const foil = createFoilCard(renderer, faces[i], back, p.card.rarity);
        foil.group.scale.setScalar(0.82);
        scene.add(foil.group);
        const pos = new THREE.Vector3(0, -7, -i * 0.05);
        const rot = new THREE.Euler(0, Math.PI, 0);
        return { foil, pos, rot, tPos: pos.clone(), tRot: rot.clone(), visible: true };
      });

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const s = {
        t: 0,
        phase: "intro" as "intro" | "stack" | "suspense" | "front" | "shown",
        phaseT: 0,
        shown: -1,
        current: -1,
        tilt: new THREE.Vector2(),
        tiltTarget: new THREE.Vector2(),
        boost: 0,
      };


      const goStack = () => {
        slots.forEach((sl, i) => {
          if (i < s.current) return;
          sl.tPos.set(0, -0.1, -0.2 - (i - Math.max(s.current, 0)) * 0.06);
          sl.tRot.set(-0.05, Math.PI, (i % 2 ? 1 : -1) * 0.03);
        });
      };

      const startCard = (k: number) => {
        s.current = k;
        const card = pulls[k].card;
        s.phaseT = 0;
        if (card.rarity === "legendaria" && !reduce) {
          s.phase = "suspense";
          sfx.rumble();
        } else {
          s.phase = "front";
        }
      };

      const flipFront = (k: number) => {
        const sl = slots[k];
        sl.tPos.set(0, 0.05, 1.6);
        sl.tRot.set(0, 0, 0);
        const r = pulls[k].card.rarity;
        ambience.setRarity(r);
        rim.color.setHex(LOOK[r].rim);
        rim.intensity = LOOK[r].rimIntensity;
        s.boost = r === "legendaria" ? 1 : r === "epica" ? 0.7 : r === "rara" ? 0.4 : 0.15;
        sfx.flip();
        setTimeout(() => {
          if (disposed) return;
          sfx.reveal(r);
          if (pulls[k].isNew) setTimeout(() => !disposed && sfx.pop(), 300);
          cb.current.onRevealed(k);
        }, reduce ? 0 : 380);
      };

      // Entrada
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        s.tiltTarget.set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
      };
      const onLeave = () => s.tiltTarget.set(0, 0);
      const onClick = () => {
        if (s.phase === "shown") cb.current.onTap();
      };
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("click", onClick);

      const resize = () => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        renderer.setSize(w, h, false);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        camera.aspect = w / h;
        const tan = 2 * Math.tan(THREE.MathUtils.degToRad(15));
        camera.position.z = (CARD_H * 0.82 + 0.5) / tan + 1.6;
        camera.updateProjectionMatrix();
        const visibleW = tan * (camera.position.z - 0.3) * camera.aspect;
        spacing = Math.min(0.95, Math.max(0.25, (visibleW - CARD_W * 0.82) / Math.max(1, n - 1)));
      };
      let spacing = 0.95;
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      // Intro: abanico y luego pila
      slots.forEach((sl, i) => {
        sl.tPos.set((i - mid) * spacing, 0.35 - Math.abs(i - mid) * 0.18, -i * 0.05);
        sl.tRot.set(0, Math.PI, -(i - mid) * 0.2);
      });
      sfx.whoosh();

      let last = performance.now();
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        s.t += dt;
        s.phaseT += dt;

        // Guion
        if (s.phase === "intro" && s.t > (reduce ? 0.1 : 1.1)) {
          s.phase = "stack";
          s.phaseT = 0;
          goStack();
        }
        if (s.phase === "stack" && s.phaseT > (reduce ? 0.05 : 0.45)) startCard(0);
        if (s.phase === "suspense") {
          const sl = slots[s.current];
          sl.tPos.set(0, 0, 0.5);
          sl.tRot.set(0, Math.PI, 0);
          s.boost = Math.min(1, s.phaseT / 0.8);
          rim.color.setHex(0xffd84d);
          rim.intensity = s.boost * 30;
          sl.pos.x += (Math.random() - 0.5) * 0.06 * s.boost;
          sl.rot.z += (Math.random() - 0.5) * 0.05 * s.boost;
          if (s.phaseT > 0.9) {
            s.phase = "front";
            s.phaseT = 0;
          }
        }
        if (s.phase === "front") {
          flipFront(s.current);
          s.phase = "shown";
          s.phaseT = 0;
        }
        // La persona pasó a la siguiente carta
        if (s.phase === "shown" && indexRef.current !== s.current && indexRef.current < n) {
          const prev = slots[s.current];
          startCard(indexRef.current);
          goStack();
          prev.tPos.set(-7, 1.2, 0.6);
          prev.tRot.set(0, -0.4, 0.6);
          sfx.whoosh();
        }

        // Inclinación con el puntero de la carta de delante
        s.tilt.lerp(s.tiltTarget, 0.08);
        const k = reduce ? 1 : 1 - Math.pow(0.0015, dt);
        slots.forEach((sl, i) => {
          sl.pos.lerp(sl.tPos, k);
          sl.rot.x += (sl.tRot.x - sl.rot.x) * k;
          sl.rot.y += (sl.tRot.y - sl.rot.y) * k;
          sl.rot.z += (sl.tRot.z - sl.rot.z) * k;
          const front = i === s.current && s.phase === "shown";
          sl.foil.group.position.copy(sl.pos);
          if (front && !reduce) sl.foil.group.position.y += Math.sin(s.t * 1.3) * 0.05;
          sl.foil.group.rotation.set(
            sl.rot.x + (front ? s.tilt.y * 0.4 : 0),
            sl.rot.y + (front ? s.tilt.x * 0.7 : 0),
            sl.rot.z,
          );
          sl.foil.group.visible = sl.pos.x > -6.5;
        });

        s.boost = Math.max(0, s.boost - dt * 0.5);
        ambience.update(dt, reduce);
        ambience.boost(s.boost * 0.6);
        key.position.set(3 + s.tilt.x * 4, 4 - s.tilt.y * 4, 5);
        renderer.render(scene, camera);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("click", onClick);
        slots.forEach((sl) => sl.foil.dispose());
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
    // Las cartas del sobre no cambian durante la animación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mount} className="absolute inset-0 cursor-pointer" />;
}

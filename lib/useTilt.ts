"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

/**
 * Inclinación con el móvil: un único listener global de `deviceorientation`
 * compartido por todas las cartas. Convierte beta/gamma en el mismo (px, py)
 * 0..1 que produce el puntero, relativo a la postura inicial del teléfono.
 */

export type TiltStatus = "unavailable" | "ask" | "listening" | "on";
type Subscriber = (px: number, py: number) => void;

const PREF_KEY = "cromos.tilt";
const RANGE = 25; // grados de giro para llegar al borde de la carta
const SMOOTH = 0.2;
const RECENTER = 0.004; // la postura base deriva muy despacio hacia la actual

type IOSOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

const subs = new Set<Subscriber>();
const statusListeners = new Set<() => void>();
let inited = false;
let supported = false;
let needsPermission = false;
let enabled = false;
let denied = false;
let received = false;
let attached = false;
let base: { beta: number; gamma: number } | null = null;
let sx = 0;
let sy = 0;
let raf: number | null = null;
let status: TiltStatus = "unavailable";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function readPref() {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function init() {
  if (inited || typeof window === "undefined") return;
  inited = true;
  const touchOnly = window.matchMedia?.("(hover: none)").matches ?? false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  supported = typeof DeviceOrientationEvent !== "undefined" && touchOnly && !reduce;
  needsPermission = supported && typeof (DeviceOrientationEvent as IOSOrientationEvent).requestPermission === "function";
  enabled = supported && (!needsPermission || readPref());
  status = computeStatus();
}

function computeStatus(): TiltStatus {
  if (!supported || denied) return "unavailable";
  if (!enabled) return "ask";
  if (needsPermission && !received) return "listening";
  return "on";
}

function refreshStatus() {
  const next = computeStatus();
  if (next === status) return;
  status = next;
  statusListeners.forEach((l) => l());
  sync();
}

function flush() {
  raf = null;
  const px = 0.5 + sx * 0.5;
  const py = 0.5 + sy * 0.5;
  subs.forEach((s) => s(px, py));
}

function onOrientation(e: DeviceOrientationEvent) {
  if (e.beta == null || e.gamma == null) return;
  if (!received) {
    received = true;
    refreshStatus();
  }
  if (!base) base = { beta: e.beta, gamma: e.gamma };
  const dg = e.gamma - base.gamma;
  const db = e.beta - base.beta;
  base.gamma += dg * RECENTER;
  base.beta += db * RECENTER;
  const angle = window.screen?.orientation?.angle ?? 0;
  let dx = dg;
  let dy = db;
  if (angle === 90) [dx, dy] = [db, -dg];
  else if (angle === 270) [dx, dy] = [-db, dg];
  else if (angle === 180) [dx, dy] = [-dg, -db];
  sx += (clamp(dx / RANGE, -1, 1) - sx) * SMOOTH;
  sy += (clamp(dy / RANGE, -1, 1) - sy) * SMOOTH;
  if (raf === null) raf = requestAnimationFrame(flush);
}

function resetBase() {
  base = null;
}

function sync() {
  const want = subs.size > 0 && (status === "listening" || status === "on");
  if (want && !attached) {
    attached = true;
    base = null;
    sx = 0;
    sy = 0;
    window.addEventListener("deviceorientation", onOrientation);
    window.addEventListener("orientationchange", resetBase);
  } else if (!want && attached) {
    attached = false;
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("orientationchange", resetBase);
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }
}

function subscribeTilt(fn: Subscriber) {
  init();
  subs.add(fn);
  sync();
  return () => {
    subs.delete(fn);
    sync();
  };
}

/** Debe llamarse dentro de un gesto (toque). En iOS pide el permiso. */
export async function enableTilt(): Promise<boolean> {
  init();
  if (!supported) return false;
  if (needsPermission) {
    try {
      const res = await (DeviceOrientationEvent as IOSOrientationEvent).requestPermission!();
      if (res !== "granted") {
        denied = true;
        refreshStatus();
        return false;
      }
    } catch {
      denied = true;
      refreshStatus();
      return false;
    }
  }
  try {
    localStorage.setItem(PREF_KEY, "1");
  } catch {}
  enabled = true;
  refreshStatus();
  return true;
}

export function useTiltStatus(): TiltStatus {
  return useSyncExternalStore(
    (cb) => {
      init();
      statusListeners.add(cb);
      cb();
      return () => {
        statusListeners.delete(cb);
      };
    },
    () => {
      init();
      return status;
    },
    () => "unavailable" as TiltStatus,
  );
}

/** Mueve las variables CSS de la carta con la inclinación del móvil mientras sea visible. */
export function useTilt(ref: RefObject<HTMLElement | null>, active: boolean) {
  const st = useTiltStatus();
  const on = active && (st === "listening" || st === "on");

  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    let unsub: (() => void) | null = null;

    const apply: Subscriber = (px, py) => {
      el.dataset.active = "true";
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
      el.style.setProperty("--lx", `${(px - 0.5) * 2}`);
      el.style.setProperty("--ly", `${(py - 0.5) * 2}`);
      el.style.setProperty("--ry", `${(px - 0.5) * 24}deg`);
      el.style.setProperty("--rx", `${(0.5 - py) * 24}deg`);
      el.style.setProperty("--o", "1");
    };
    const stop = () => {
      unsub?.();
      unsub = null;
      el.dataset.active = "false";
      for (const p of ["--mx", "--my", "--lx", "--ly", "--rx", "--ry", "--o"]) el.style.removeProperty(p);
    };

    if (typeof IntersectionObserver === "undefined") {
      unsub = subscribeTilt(apply);
      return stop;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !unsub) unsub = subscribeTilt(apply);
      else if (!entry.isIntersecting && unsub) stop();
    });
    io.observe(el);
    return () => {
      io.disconnect();
      if (unsub) stop();
    };
  }, [on, ref]);
}

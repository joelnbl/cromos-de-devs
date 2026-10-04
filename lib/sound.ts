"use client";

/**
 * Sonidos sintetizados con Web Audio: no hay archivos que descargar.
 * El audio solo arranca tras un gesto de la persona (requisito de los navegadores).
 */

import type { Rarity } from "./cards";

const KEY = "cromos.sound";
let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
const listeners = new Set<(on: boolean) => void>();

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // sin almacenamiento: solo dura esta visita
  }
  listeners.forEach((l) => l(on));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !isSoundOn()) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "triangle", vol = 0.18) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noiseBurst(c: AudioContext, start: number, dur: number, from: number, to: number, type: BiquadFilterType, vol: number) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(start, Math.random() * 0.4);
  src.stop(start + dur + 0.05);
}

export function vibrate(pattern: number | number[]) {
  if (!isSoundOn()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no disponible
  }
}

/** Golpecito seco de cartón (una carta cayendo sobre otra). */
function click(c: AudioContext, start: number, vol: number) {
  noiseBurst(c, start, 0.025, 3200 + Math.random() * 1600, 1800, "bandpass", vol);
}

let lastBrush = 0;

export const sfx = {
  /** Barajado en cascada: las cartas caen una tras otra y se cuadran. */
  shuffle() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    // Doblar el mazo
    noiseBurst(c, t, 0.12, 900, 2400, "bandpass", 0.06);
    // Cascada: unas 26 cartas que se aceleran y luego frenan
    let at = t + 0.1;
    for (let i = 0; i < 26; i++) {
      const p = i / 25;
      at += 0.028 - Math.sin(p * Math.PI) * 0.016 + Math.random() * 0.006;
      click(c, at, 0.05 + Math.sin(p * Math.PI) * 0.07);
    }
    // Cuadrar el mazo
    noiseBurst(c, at + 0.06, 0.18, 1800, 500, "lowpass", 0.14);
    click(c, at + 0.2, 0.16);
    vibrate([8, 30, 8, 30, 8]);
  },
  /** Roce suave de cartón al pasar por encima de una carta. */
  brush() {
    const now = performance.now();
    if (now - lastBrush < 140) return;
    lastBrush = now;
    const c = audio();
    if (!c) return;
    noiseBurst(c, c.currentTime, 0.14, 1400, 3400, "bandpass", 0.045);
  },
  /** Papel de aluminio arrugándose al arrastrar. */
  crinkle() {
    const c = audio();
    if (!c) return;
    noiseBurst(c, c.currentTime, 0.09, 2500, 5000, "bandpass", 0.05);
  },
  /** Rasgado del sobre. */
  tear() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(c, t, 0.45, 700, 4200, "bandpass", 0.35);
    noiseBurst(c, t + 0.05, 0.3, 3000, 1200, "highpass", 0.12);
    vibrate([20, 30, 40]);
  },
  /** Aire al salir las cartas. */
  whoosh() {
    const c = audio();
    if (!c) return;
    noiseBurst(c, c.currentTime, 0.35, 300, 1800, "lowpass", 0.18);
  },
  /** Volteo de una carta. */
  flip() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(c, t, 0.06, 4000, 6000, "highpass", 0.12);
    tone(c, 620, t, 0.07, "sine", 0.06);
  },
  /** Sello de «¡NUEVO!». */
  pop() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  },
  /** Temblor grave antes de una legendaria. */
  rumble() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.linearRampToValueAtTime(90, t + 1.3);
    lfo.frequency.value = 14;
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(gain.gain);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(filter).connect(gain).connect(c.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1.5);
    lfo.stop(t + 1.5);
    vibrate([60, 40, 60, 40, 120]);
  },
  /** Música al revelar, según la rareza. */
  reveal(rarity: Rarity) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    if (rarity === "comun") {
      tone(c, 523.25, t, 0.25);
    } else if (rarity === "rara") {
      tone(c, 659.25, t, 0.25);
      tone(c, 987.77, t + 0.09, 0.35);
    } else if (rarity === "epica") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, t + i * 0.07, 0.45, "triangle", 0.14));
      vibrate(40);
    } else if (rarity === "icono") {
      // Fanfarria: acorde mayor que sube y destellos
      [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((f) => tone(c, f, t, 2.6, "sine", 0.08));
      [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(c, f, t + 0.1 + i * 0.07, 0.7, "triangle", 0.06));
      [392.0, 493.88, 587.33].forEach((f) => tone(c, f * 2, t + 0.75, 1.6, "sine", 0.05));
      vibrate([80, 40, 80, 40, 200]);
    } else {
      [261.63, 329.63, 392.0, 523.25, 659.25].forEach((f) => tone(c, f, t, 1.8, "sine", 0.09));
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, f, t + 0.15 + i * 0.09, 0.6, "triangle", 0.06));
      vibrate([80, 40, 160]);
    }
  },
  /** Intercambio: dos golpecitos de cartón (uno grave, otro agudo). */
  swap() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    // Golpecito grave
    click(c, t, 0.08);
    // Golpecito agudo
    click(c, t + 0.12, 0.08);
  },
  /** Pasar página de papel. */
  page() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    noiseBurst(c, t, 0.2, 4000, 800, "lowpass", 0.06);
  },
};

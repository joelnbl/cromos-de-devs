"use client";

/**
 * Sonidos sintetizados con Web Audio: no hay archivos que descargar.
 * El audio solo arranca tras un gesto de la persona (requisito de los navegadores).
 */

import type { Rarity } from "./cards";

const KEY = "cromos.sound";
let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let impulseBuffer: AudioBuffer | null = null;
let master: GainNode | null = null;
let reverbIn: ConvolverNode | null = null;
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
  if (!master) buildGraph(ctx);
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Bus maestro: ganancia → compresor suave → salida, más reverb corta en envío auxiliar. */
function buildGraph(c: AudioContext) {
  master = c.createGain();
  master.gain.value = 0.9;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  master.connect(comp).connect(c.destination);
  reverbIn = c.createConvolver();
  reverbIn.buffer = impulse(c);
  const wet = c.createGain();
  wet.gain.value = 0.7;
  reverbIn.connect(wet).connect(master);
}

/** Impulso de sala cálida: ruido estéreo con caída exponencial (~1.2 s) y agudos que se apagan. */
function impulse(c: AudioContext): AudioBuffer {
  if (impulseBuffer) return impulseBuffer;
  const len = Math.floor(c.sampleRate * 1.2);
  const buf = c.createBuffer(2, len, c.sampleRate);
  const pre = Math.floor(c.sampleRate * 0.008);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let y = 0;
    for (let i = pre; i < len; i++) {
      const x = i / len;
      const a = 0.55 - 0.47 * x;
      y += ((Math.random() * 2 - 1) - y) * a;
      d[i] = y * Math.exp(-6 * x) * Math.min(1, (i - pre) / 200);
    }
  }
  impulseBuffer = buf;
  return buf;
}

function noise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

type Bus = { input: GainNode; panner: StereoPannerNode | null };

/** Salida de un sonido: panorámica, reverb (wet) y nivel de ajuste para igualar volúmenes entre sonidos. */
function bus(c: AudioContext, pan = 0, wet = 0.12, level = 1): Bus {
  const input = c.createGain();
  input.gain.value = level;
  let panner: StereoPannerNode | null = null;
  let last: AudioNode = input;
  if (typeof c.createStereoPanner === "function") {
    panner = c.createStereoPanner();
    panner.pan.value = pan;
    input.connect(panner);
    last = panner;
  }
  last.connect(master!);
  if (wet > 0 && reverbIn) {
    const send = c.createGain();
    send.gain.value = wet;
    last.connect(send).connect(reverbIn);
  }
  return { input, panner };
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Envolvente sin clics: sube desde 0.0001 y vuelve a 0.0001. */
function envelope(g: GainNode, start: number, attack: number, dur: number, vol: number) {
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + Math.max(attack, 0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
}

/** Ruido filtrado con barrido de frecuencia y envolvente. */
function noiseBurst(
  c: AudioContext,
  out: Bus,
  start: number,
  dur: number,
  from: number,
  to: number,
  type: BiquadFilterType,
  vol: number,
  q = 1.2,
  attack = Math.min(0.02, dur * 0.3),
) {
  const src = c.createBufferSource();
  src.buffer = noise(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(to, start + dur);
  const gain = c.createGain();
  envelope(gain, start, attack, dur, vol);
  src.connect(filter).connect(gain).connect(out.input);
  src.start(start, Math.random() * 1.4);
  src.stop(start + dur + 0.05);
}

/** Micro-grano: ruido muy corto con bandpass aleatorio (textura granular). */
function grain(c: AudioContext, out: Bus, start: number, dur: number, f: number, q: number, vol: number) {
  noiseBurst(c, out, start, dur, f, f * rnd(0.7, 1.4), "bandpass", vol, q, dur * 0.25);
}

/** Cuerpo grave breve (golpe de cartón / sello). */
function thump(c: AudioContext, out: Bus, start: number, f: number, dur: number, vol: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f, start);
  osc.frequency.exponentialRampToValueAtTime(f * 0.5, start + dur);
  envelope(gain, start, 0.004, dur, vol);
  osc.connect(gain).connect(out.input);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

type VoiceOpts = {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  detune?: number[];
};

/** Nota con 2-3 osciladores desafinados (chorus) y envolvente ADSR suave. */
function voice(c: AudioContext, out: Bus, freq: number, start: number, dur: number, o: VoiceOpts = {}) {
  const { type = "triangle", vol = 0.1, attack = 0.012, decay = 0.12, sustain = 0.6, release = 0.35, detune = [-6, 0, 6] } = o;
  const gain = c.createGain();
  const end = start + dur;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol * sustain, 0.0002), start + attack + decay);
  gain.gain.setValueAtTime(Math.max(vol * sustain, 0.0002), Math.max(end, start + attack + decay));
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, start + attack + decay) + release);
  gain.connect(out.input);
  const stop = Math.max(end, start + attack + decay) + release + 0.05;
  for (const d of detune) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.value = d;
    osc.connect(gain);
    osc.start(start);
    osc.stop(stop);
  }
}

/** Campanita: parcial fundamental + parcial inarmónico que se apaga antes. */
function bell(c: AudioContext, out: Bus, freq: number, start: number, dur: number, vol: number) {
  voice(c, out, freq, start, 0.02, { type: "sine", vol, attack: 0.004, decay: 0.05, sustain: 0.8, release: dur, detune: [-4, 4] });
  voice(c, out, freq * 2.76, start, 0.01, { type: "sine", vol: vol * 0.35, attack: 0.003, decay: 0.04, sustain: 0.6, release: dur * 0.35, detune: [0] });
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
function click(c: AudioContext, out: Bus, start: number, vol: number) {
  noiseBurst(c, out, start, 0.025, rnd(3200, 4800), 1800, "bandpass", vol, 1.4, 0.004);
}

let lastBrush = 0;

export const sfx = {
  /** Barajado en cascada: las cartas caen una tras otra, de izquierda a derecha, y se cuadran. */
  shuffle() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const mid = bus(c, 0, 0.1, 1.4);
    // Doblar el mazo
    noiseBurst(c, mid, t, 0.12, 900, 2400, "bandpass", 0.07);
    // Cascada: unas 26 cartas que se aceleran y luego frenan, paneando de izquierda a derecha
    let at = t + 0.1;
    for (let i = 0; i < 26; i++) {
      const p = i / 25;
      at += 0.028 - Math.sin(p * Math.PI) * 0.016 + Math.random() * 0.006;
      const b = bus(c, -0.8 + 1.6 * p, 0.08, 1.4);
      click(c, b, at, 0.1 + Math.sin(p * Math.PI) * 0.14);
    }
    // Cuadrar el mazo
    noiseBurst(c, mid, at + 0.06, 0.18, 1800, 500, "lowpass", 0.2);
    thump(c, mid, at + 0.2, 150, 0.08, 0.2);
    click(c, mid, at + 0.2, 0.22);
    vibrate([8, 30, 8, 30, 8]);
  },
  /** Roce suave de cartón al pasar por encima de una carta. */
  brush() {
    const now = performance.now();
    if (now - lastBrush < 140) return;
    lastBrush = now;
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, rnd(-0.25, 0.25), 0.1, 10);
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      grain(c, out, t + (i / n) * 0.15 + rnd(0, 0.012), rnd(0.02, 0.05), rnd(1500, 4200), rnd(2, 5), rnd(0.05, 0.08));
    }
  },
  /** Papel de aluminio arrugándose al arrastrar. */
  crinkle() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, rnd(-0.3, 0.3), 0.14, 10);
    const n = 7 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      grain(c, out, t + Math.random() * 0.1, rnd(0.008, 0.03), rnd(3000, 8500), rnd(4, 9), rnd(0.05, 0.09));
    }
  },
  /** Rasgado del sobre: granos que aceleran y frenan, y un «pop» al abrirse. */
  tear() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, 0, 0.16, 1.05);
    const total = 0.5;
    let at = t;
    while (at - t < total) {
      const p = (at - t) / total;
      const swell = 0.35 + 0.65 * Math.sin(p * Math.PI);
      grain(c, out, at, rnd(0.012, 0.03), 900 + p * 3600 * rnd(0.6, 1.2), rnd(1.5, 4), 0.2 * swell);
      at += 0.034 - 0.026 * Math.sin(p * Math.PI) + Math.random() * 0.004;
    }
    noiseBurst(c, out, t, total, 700, 3800, "bandpass", 0.1, 0.9, 0.08);
    // El sobre se abre
    const end = t + total + 0.03;
    thump(c, out, end, 420, 0.1, 0.32);
    noiseBurst(c, out, end, 0.07, 2500, 1500, "bandpass", 0.2, 0.8, 0.004);
    vibrate([20, 30, 40]);
  },
  /** Aire al salir las cartas: barrido de grave a agudo, cruzando de lado a lado. */
  whoosh() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, -0.7, 0.18, 3.4);
    out.panner?.pan.linearRampToValueAtTime(0.7, t + 0.45);
    const src = c.createBufferSource();
    src.buffer = noise(c);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(250, t);
    f.frequency.exponentialRampToValueAtTime(3600, t + 0.45);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    src.connect(f).connect(g).connect(out.input);
    src.start(t, Math.random() * 1.4);
    src.stop(t + 0.5);
  },
  /** Volteo de una carta: chasquido de cartulina. */
  flip() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const k = rnd(0.92, 1.08);
    const out = bus(c, rnd(-0.1, 0.1), 0.1, 2.9);
    noiseBurst(c, out, t, 0.04, 4200 * k, 7000 * k, "highpass", 0.3, 0.8, 0.002);
    noiseBurst(c, out, t + 0.012, 0.06, 1800 * k, 1000 * k, "bandpass", 0.12, 1.2, 0.004);
    thump(c, out, t, 190 * k, 0.07, 0.22);
  },
  /** Sello de «¡NUEVO!»: burbuja que cae de tono y un clic. */
  pop() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, 0, 0.14, 4.6);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.13);
    envelope(gain, t, 0.006, 0.16, 0.3);
    osc.connect(gain).connect(out.input);
    osc.start(t);
    osc.stop(t + 0.2);
    noiseBurst(c, out, t, 0.015, 5000, 3000, "highpass", 0.14, 0.8, 0.002);
  },
  /** Temblor grave antes de una legendaria. */
  rumble() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, 0, 0.06, 1.25);
    // Grave con trémolo
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, t);
    osc.frequency.linearRampToValueAtTime(90, t + 1.3);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    const trem = c.createGain();
    trem.gain.value = 0.65;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 14;
    lfoGain.gain.value = 0.35;
    lfo.connect(lfoGain).connect(trem.gain);
    const env = c.createGain();
    envelope(env, t, 0.3, 1.4, 0.2);
    osc.connect(filter).connect(trem).connect(env).connect(out.input);
    // Sub que crece
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(38, t);
    sub.frequency.exponentialRampToValueAtTime(62, t + 1.3);
    const subGain = c.createGain();
    envelope(subGain, t, 1.0, 1.4, 0.3);
    sub.connect(subGain).connect(out.input);
    // Ruido de tierra
    noiseBurst(c, out, t, 1.4, 140, 220, "lowpass", 0.14, 0.7, 0.5);
    osc.start(t);
    lfo.start(t);
    sub.start(t);
    osc.stop(t + 1.5);
    lfo.stop(t + 1.5);
    sub.stop(t + 1.5);
    vibrate([60, 40, 60, 40, 120]);
  },
  /** Música al revelar, según la rareza. */
  reveal(rarity: Rarity) {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const trim = { comun: 2.2, rara: 1, epica: 1.3, legendaria: 0.83, icono: 1.07 }[rarity] ?? 1;
    const out = bus(c, 0, 0.4, trim);
    if (rarity === "comun") {
      // Una nota limpia tipo marimba
      voice(c, out, 523.25, t, 0.02, { type: "sine", vol: 0.2, attack: 0.004, decay: 0.2, sustain: 0.2, release: 0.3, detune: [-5, 5] });
      voice(c, out, 523.25 * 4, t, 0.01, { type: "sine", vol: 0.05, attack: 0.002, decay: 0.05, sustain: 0.3, release: 0.08, detune: [0] });
      noiseBurst(c, out, t, 0.02, 3000, 2000, "bandpass", 0.05, 1.5, 0.002);
    } else if (rarity === "rara") {
      voice(c, out, 659.25, t, 0.05, { vol: 0.17, attack: 0.006, decay: 0.15, sustain: 0.4, release: 0.3 });
      voice(c, out, 987.77, t + 0.09, 0.1, { vol: 0.17, attack: 0.006, decay: 0.15, sustain: 0.4, release: 0.45 });
      voice(c, out, 987.77 * 2, t + 0.09, 0.02, { type: "sine", vol: 0.035, attack: 0.004, decay: 0.1, sustain: 0.2, release: 0.3, detune: [0] });
    } else if (rarity === "epica") {
      // Arpegio mayor ascendente + destello
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        voice(c, out, f, t + i * 0.075, 0.12, { vol: 0.12, attack: 0.01, decay: 0.12, sustain: 0.5, release: 0.55 }),
      );
      voice(c, out, 261.63, t, 0.45, { type: "sine", vol: 0.1, attack: 0.03, release: 0.5 });
      [2093, 2637].forEach((f, i) => bell(c, out, f, t + 0.3 + i * 0.07, 0.7, 0.03));
      noiseBurst(c, out, t + 0.3, 0.5, 6000, 9500, "highpass", 0.05, 0.7, 0.05);
      vibrate(40);
    } else if (rarity === "icono") {
      // «Whoosh» inverso antes de la fanfarria
      const f0 = t + 0.5;
      noiseBurst(c, out, t, 0.5, 200, 5500, "bandpass", 0.3, 1.2, 0.46);
      // Acorde mayor-9 (do, mi, sol, si, re)
      [130.81, 261.63, 329.63, 392.0, 493.88, 587.33].forEach((f, i) =>
        voice(c, out, f, f0, 1.5, { type: i < 2 ? "sine" : "triangle", vol: i < 2 ? 0.1 : 0.07, attack: 0.04, decay: 0.3, sustain: 0.7, release: 1.1 }),
      );
      // Campanas que suben en escala
      [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5].forEach((f, i) => bell(c, out, f, f0 + 0.1 + i * 0.075, 1.2, 0.055));
      // Brillo agudo
      noiseBurst(c, out, f0, 1.6, 7000, 10000, "highpass", 0.05, 0.7, 0.2);
      vibrate([80, 40, 80, 40, 200]);
    } else {
      // Legendaria: acorde amplio, campanas y subida
      noiseBurst(c, out, t, 0.35, 400, 4000, "bandpass", 0.14, 1.2, 0.3);
      const f0 = t + 0.3;
      [130.81, 196.0, 261.63, 329.63, 392.0, 523.25].forEach((f, i) =>
        voice(c, out, f, f0, 1.0, { type: i < 2 ? "sine" : "triangle", vol: i < 2 ? 0.11 : 0.08, attack: 0.05, decay: 0.3, sustain: 0.7, release: 1.0 }),
      );
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(c, out, f, f0 + 0.1 + i * 0.09, 1.0, 0.06));
      vibrate([80, 40, 160]);
    }
  },
  /** Intercambio: dos golpes de cartón, uno por cada lado. */
  swap() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const l = bus(c, -0.7, 0.1, 1.2);
    click(c, l, t, 0.25);
    thump(c, l, t, 170, 0.06, 0.18);
    noiseBurst(c, l, t, 0.05, 1500, 900, "bandpass", 0.1, 1, 0.003);
    const r = bus(c, 0.7, 0.1, 1.2);
    click(c, r, t + 0.12, 0.25);
    thump(c, r, t + 0.12, 210, 0.06, 0.18);
    noiseBurst(c, r, t + 0.12, 0.05, 1800, 1100, "bandpass", 0.1, 1, 0.003);
  },
  /** Pasar página de papel. */
  page() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, rnd(-0.2, 0.2), 0.14, 3.5);
    noiseBurst(c, out, t, 0.22, 3800, 900, "bandpass", 0.2, 0.9, 0.05);
    for (let i = 0; i < 4; i++) grain(c, out, t + rnd(0, 0.18), rnd(0.01, 0.025), rnd(2500, 5000), 4, 0.05);
  },
};

/** Ambiente: pad grave y suave que dura mientras haya un mundo abierto. */
let pad: { out: GainNode; oscs: OscillatorNode[]; lfo: OscillatorNode } | null = null;
let ambientWanted = false;
let ambientOff: (() => void) | null = null;

function killPad(fade: number) {
  const p = pad;
  if (!p || !ctx) {
    pad = null;
    return;
  }
  pad = null;
  const t = ctx.currentTime;
  p.out.gain.cancelScheduledValues(t);
  p.out.gain.setValueAtTime(Math.max(p.out.gain.value, 0.0001), t);
  p.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  const stopAt = t + fade + 0.1;
  p.oscs.forEach((o) => o.stop(stopAt));
  p.lfo.stop(stopAt);
}

function startPad() {
  if (pad || !ambientWanted) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const out = bus(c, 0, 0.6, 1);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 1.5);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.value = 420;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(filter.frequency);
  const oscs = [
    [55, -7],
    [82.4, 5],
    [110, -3],
  ].map(([f, d]) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.detune.value = d;
    o.connect(filter);
    o.start(t);
    return o;
  });
  lfo.start(t);
  filter.connect(g).connect(out.input);
  pad = { out: g, oscs, lfo };
}

export const ambient = {
  start() {
    ambientWanted = true;
    if (!ambientOff) {
      ambientOff = onSoundChange((on) => {
        if (on) startPad();
        else killPad(0.4);
      });
    }
    startPad();
  },
  stop() {
    ambientWanted = false;
    ambientOff?.();
    ambientOff = null;
    killPad(1);
  },
};

/** Sonidos suaves del mundo 3D. */
export const worldSfx = {
  /** Aire muy suave al acercar o alejar la cámara. */
  zoom() {
    const c = audio();
    if (!c) return;
    const t = c.currentTime;
    const out = bus(c, 0, 0.3, 1.1);
    noiseBurst(c, out, t, 0.7, 300, 1800, "bandpass", 0.35, 0.9, 0.3);
  },
};

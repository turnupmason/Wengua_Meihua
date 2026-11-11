/**
 * Ritual sounds, synthesised (no recorded assets) and sent through a generated hall reverb.
 * No low drone. Softly in the background: a sparse guqin-style melody with occasional 箫
 * (startMusic). Sound also marks the moments —
 *   bowl()   颂钵  entering the hall; the hexagram is granted (soft, no deep strike)
 *   qing()   磬    the bestowal; the carving complete
 *   knock()        a soft muted tap as each line is written
 * Starts only after a user gesture; suspends while the app is hidden.
 */
export class TempleAudio {
  private ctx: AudioContext | null = null;
  private dry: GainNode | null = null;
  private wet: GainNode | null = null;
  private enabled = false;

  /** Pitches the 道乐 can play (D 宫 pentatonic and the octave below); rendered ahead of time. */
  private static readonly PITCHES = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33];
  private plucks = new Map<number, AudioBuffer>();
  private preparing = false;

  /**
   * Builds the audio graph, the hall reverb and the guqin notes in small idle-time slices while
   * the title screen shows, so the tap that enters the hall only resumes playback. (Building the
   * 4-second reverb on the tap itself froze the screen for a quarter of a second.)
   */
  prepare() {
    if (this.ctx || this.preparing) return;
    this.preparing = true;
    const ctx = this.createContext();
    if (!ctx) return;
    const idle = (fn: () => void) => {
      const w = globalThis as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1000 });
      else setTimeout(fn, 30);
    };
    const len = Math.floor(ctx.sampleRate * TempleAudio.REVERB_SECONDS);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    const lp = [0, 0];
    let i = 0;
    const STEP = 24000;
    const fill = () => {
      const end = Math.min(len, i + STEP);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let v = lp[ch];
        for (let k = i; k < end; k++) {
          v = v * 0.82 + (Math.random() * 2 - 1) * 0.18;
          d[k] = v * Math.pow(1 - k / len, 2.6);
        }
        lp[ch] = v;
      }
      i = end;
      if (i < len) return idle(fill);
      idle(() => {
        this.attachReverb(ir);
        // Then the notes, one per idle slice.
        const pitches = [...TempleAudio.PITCHES, ...TempleAudio.PITCHES.map((f) => f / 2)];
        const next = () => {
          const f = pitches.shift();
          if (f === undefined) return;
          this.pluckBuffer(f);
          idle(next);
        };
        idle(next);
      });
    };
    idle(fill);
  }

  private static readonly REVERB_SECONDS = 3.4;

  private createContext(): AudioContext | null {
    const Ctor = globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = 0.9;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 6;
      master.connect(limiter).connect(ctx.destination);
      this.master = master;
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.55;
      this.dry = ctx.createGain();
      this.dry.gain.value = 0.75;
      this.dry.connect(master);
      this.ctx = ctx;
      return ctx;
    } catch {
      this.ctx = null;
      return null;
    }
  }

  private master: GainNode | null = null;

  /** Hall reverb: a decaying stereo noise impulse, darkened. */
  private attachReverb(ir: AudioBuffer) {
    if (!this.ctx || !this.wet || !this.master) return;
    const conv = this.ctx.createConvolver();
    conv.buffer = ir;
    this.wet.connect(conv).connect(this.master);
  }

  /** Must be called from a user gesture. Cheap when prepare() already ran. */
  unlock() {
    if (this.ctx) return;
    const ctx = this.createContext();
    if (!ctx) return;
    // Not prepared (e.g. a very fast tap): build a short reverb now rather than none.
    const len = Math.floor(ctx.sampleRate * 1.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let v = 0;
      for (let k = 0; k < len; k++) {
        v = v * 0.82 + (Math.random() * 2 - 1) * 0.18;
        d[k] = v * Math.pow(1 - k / len, 2.6);
      }
    }
    this.attachReverb(ir);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stopMusic();
    if (on) this.unlock();
    if (on && this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  private ready() {
    return this.enabled && this.ctx && this.dry && this.wet && this.ctx.state === 'running';
  }

  private out(node: AudioNode, wet = 1) {
    node.connect(this.dry!);
    const send = this.ctx!.createGain();
    send.gain.value = wet;
    node.connect(send).connect(this.wet!);
  }

  /** Inharmonic struck partials with long, independent decays. */
  private strike(base: number, partials: [number, number, number][], gain: number, attack = 0.004) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const bus = ctx.createGain();
    bus.gain.value = gain;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    bus.connect(lp);
    this.out(lp);
    for (const [ratio, amp, decay] of partials) {
      for (const detune of [-1.2, 1.2]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = base * ratio;
        osc.detune.value = detune; // slow beating like real bronze
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp / 2, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        osc.connect(g).connect(bus);
        osc.start(t);
        osc.stop(t + decay + 0.05);
      }
    }
  }

  /** Singing bowl (颂钵): a soft, slow swell that rings and fades; no deep strike. */
  bowl(strength = 1) {
    if (!this.ready()) return;
    this.strike(528, [[1, 0.8, 6], [2.76, 0.22, 3.8], [5.4, 0.06, 2.2]], 0.09 * strength, 0.22);
  }

  /** Bowl gong (磬): clear, long ring. */
  qing(pitch = 1, strength = 1) {
    if (!this.ready()) return;
    this.strike(392 * pitch, [[1, 0.9, 5.5], [2.71, 0.35, 3.2], [5.15, 0.12, 1.8], [8.43, 0.04, 0.9]], 0.16 * strength);
  }

  /** Soft, muted tap (no clicks): a low thump with a little body. */
  knock() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(g);
    this.out(g, 0.7);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  /** One note for each line written into the stone (`step` 0–17: six per hexagram). */
  chime(step: number) {
    if (!this.ready()) return;
    // Each hexagram has its own voice, six ascending notes 初爻 → 上爻 (pentatonic):
    // 本卦 (目前) a low bowl 磬, 互卦 (经过) a soft 埙-like tone, 变卦 (结果) a bright 编钟 bell.
    const stage = Math.floor(step / 6) % 3;
    const k = step % 6;
    if (stage === 0) {
      const notes = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33];
      this.strike(notes[k], [[1, 0.8, 3.6], [2.71, 0.3, 2.2], [5.15, 0.08, 1.2]], 0.07, 0.006);
    } else if (stage === 1) {
      // A soft, breathy tone (like a 埙): slow attack, almost pure, quiet.
      const notes = [220.0, 246.94, 293.66, 329.63, 392.0, 440.0];
      this.strike(notes[k], [[1, 0.7, 1.9], [2, 0.06, 1.0], [3, 0.015, 0.6]], 0.03, 0.06);
    } else {
      const notes = [587.33, 659.25, 783.99, 880.0, 987.77, 1174.66];
      this.strike(notes[k], [[1, 0.7, 2.8], [2.0, 0.22, 1.6], [2.76, 0.18, 1.2], [5.4, 0.05, 0.6]], 0.05, 0.003);
    }
  }

  // ---------------- 道乐: guqin-style melody with occasional 箫 ----------------

  private music: { timer: number; next: number; plucks: Map<number, AudioBuffer> } | null = null;

  /** Karplus–Strong plucked string, rendered once per pitch (a soft, woody guqin-like tone). */
  private pluckBuffer(freq: number): AudioBuffer {
    const ctx = this.ctx!;
    const cached = this.plucks.get(freq);
    if (cached) return cached;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 3.6);
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const period = Math.round(sr / freq);
    const ring = new Float32Array(period);
    for (let i = 0; i < period; i++) ring[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin((i / period) * Math.PI));
    let idx = 0;
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const cur = ring[idx];
      const nxt = ring[(idx + 1) % period];
      const v = 0.4985 * (cur + nxt);
      ring[idx] = v;
      // Gentle one-pole low-pass for a mellow silk-string colour.
      prev = prev * 0.55 + cur * 0.45;
      d[i] = prev * Math.min(1, i / 60);
      idx = (idx + 1) % period;
    }
    this.plucks.set(freq, buf);
    return buf;
  }

  private pluck(freq: number, when: number, gain: number, slide = 0) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.pluckBuffer(freq);
    // 吟猱: a slight slide or vibrato after the pluck.
    src.playbackRate.setValueAtTime(1, when);
    if (slide) src.playbackRate.linearRampToValueAtTime(1 + slide, when + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.setTargetAtTime(0, when + 2.6, 0.6);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    src.connect(lp).connect(g);
    this.out(g, 0.85);
    src.start(when);
    src.stop(when + 4.5);
  }

  /** A long, breathy 箫 note. */
  private xiao(freq: number, when: number, dur: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.8;
    const vibGain = ctx.createGain();
    vibGain.gain.value = freq * 0.004;
    vib.connect(vibGain).connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(0.028, when + 0.9);
    g.gain.setValueAtTime(0.028, when + dur - 1.2);
    g.gain.linearRampToValueAtTime(0, when + dur);
    // Breath noise around the note.
    const len = Math.floor(ctx.sampleRate * dur);
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = nb;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 8;
    const ng = ctx.createGain();
    ng.gain.value = 0.18;
    noise.connect(bp).connect(ng).connect(g);
    osc.connect(g);
    this.out(g, 0.9);
    osc.start(when);
    vib.start(when);
    noise.start(when);
    osc.stop(when + dur + 0.1);
    vib.stop(when + dur + 0.1);
  }

  /** Starts the ambient 道乐 (sparse phrases with long rests). Safe to call repeatedly. */
  startMusic() {
    if (!this.ready() || this.music) return;
    // D 宫 pentatonic across two octaves.
    const scale = TempleAudio.PITCHES;
    const music = { timer: 0, next: this.ctx!.currentTime + 1.5, plucks: new Map<number, AudioBuffer>() };
    this.music = music;
    let pos = 5;
    let phraseLeft = 0;
    let xiaoAt = this.ctx!.currentTime + 6;
    const schedule = () => {
      if (!this.ctx || this.music !== music) return;
      const now = this.ctx.currentTime;
      while (music.next < now + 1.2) {
        if (phraseLeft <= 0) {
          // Rest between phrases, then a new phrase of 4–7 notes.
          music.next += 3 + Math.random() * 4;
          phraseLeft = 4 + Math.floor(Math.random() * 4);
          continue;
        }
        pos = Math.max(0, Math.min(scale.length - 1, pos + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
        const f = scale[pos];
        this.pluck(f, music.next, 0.22, Math.random() < 0.3 ? (Math.random() < 0.5 ? 0.02 : -0.015) : 0);
        if (Math.random() < 0.25) this.pluck(f / 2, music.next + 0.02, 0.12); // octave below, like an open string
        music.next += [0.6, 0.9, 0.9, 1.2, 1.8][Math.floor(Math.random() * 5)];
        phraseLeft -= 1;
      }
      if (xiaoAt < now + 1.2) {
        this.xiao(scale[3 + Math.floor(Math.random() * 5)] * 2, xiaoAt, 4 + Math.random() * 2);
        xiaoAt += 14 + Math.random() * 10;
      }
      music.timer = window.setTimeout(schedule, 400);
    };
    schedule();
  }

  stopMusic() {
    if (this.music) window.clearTimeout(this.music.timer);
    this.music = null;
  }

  // ---------------- ritual sounds ----------------

  /** Soft footstep on stone. */
  footstep() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700 + Math.random() * 200;
    const g = ctx.createGain();
    g.gain.value = 0.07;
    src.connect(lp).connect(g);
    this.out(g, 0.5);
    src.start(t);
  }

  /** Cloth rustle as one sits down at the table. */
  rustle() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    src.connect(bp).connect(g);
    this.out(g, 0.4);
    src.start(t);
  }

  /** 法铃: a small hand bell, bright and brief, rung a few times. */
  handbell(times = 3) {
    if (!this.ready()) return;
    for (let k = 0; k < times; k++) {
      setTimeout(() => this.ready() && this.strike(1320, [[1, 0.5, 1.4], [2.32, 0.25, 0.9], [4.1, 0.12, 0.5]], 0.07), k * 260);
    }
  }

  suspend() {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume() {
    if (this.enabled && this.ctx?.state === 'suspended') void this.ctx.resume();
  }
}

export const templeAudio = new TempleAudio();

export function haptic(enabled: boolean, ms: number | number[] = 12) {
  if (!enabled) return;
  try {
    globalThis.navigator?.vibrate?.(ms);
  } catch {
    /* optional */
  }
}

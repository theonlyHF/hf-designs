(() => {
  "use strict";

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  const progressions = {
    home: [[146.83, 220, 261.63], [130.81, 196, 246.94], [116.54, 174.61, 220], [130.81, 207.65, 246.94]],
    gallery: [[164.81, 246.94, 311.13], [146.83, 220, 277.18], [130.81, 196, 261.63], [146.83, 220, 277.18]],
  };
  let context;
  let bus;
  let musicBus;
  let bootBus;
  let bootPlayed = false;
  let bootTrack;
  let lastHover = -Infinity;
  let muted = false;
  let savedMute = false;
  let simpleMode = false;
  let config;
  let audioUrl = value => value;
  let unlocked = false;
  let lowpass;
  let duck;
  let scope;
  let playlist = [];
  let position = 0;
  let playlistTimer;
  const effects = new Map();
  const fadingTracks = new Map();
  const voices = new Map();
  const lastCue = new Map();
  const mobile = matchMedia("(pointer: coarse)");
  const isMuted = () => muted || simpleMode || (mobile.matches && config?.master.muteOnMobile);
  const volumes = { music: 1, effects: 1, master: 1 };
  try {
    const saved = JSON.parse(localStorage.getItem("hf-audio") || "{}");
    muted = saved.muted === true;
    savedMute = typeof saved.muted === "boolean";
    for (const key of Object.keys(volumes)) {
      if (Number.isFinite(saved[key])) volumes[key] = Math.max(0, Math.min(1, saved[key]));
    }
  } catch { /* Mantém os valores iniciais quando o armazenamento está indisponível. */ }
  let scene;
  let sceneFile = "";
  let music;

  function tone({ frequency, endFrequency, offset = 0, attack, length, volume, waveform = "sine" }, output = bus) {
    const now = context.currentTime + Math.max(offset, 0);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + length);
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + length);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(now);
    oscillator.stop(now + length + .01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  // Vinheta original, com uma base grave, um acorde metálico e uma cauda harmônica.
  function startup(preset = "classic") {
    if (bootPlayed || scene || context?.state !== "running") return;
    bootPlayed = true;
    if (preset === "silent") return;
    bootBus.gain.setValueAtTime(1, context.currentTime);
    const chime = notes => tone(notes, bootBus);
    if (preset === "crystal") {
      [261.63, 392, 523.25, 659.25, 783.99].forEach((frequency, index) =>
        chime({ frequency, offset: .17 + index * .31, attack: .09, length: 2.7, volume: .084 - index * .008 }));
      return;
    }
    if (preset === "pulse") {
      chime({ frequency: 98, endFrequency: 65.4, attack: .1, length: 2.1, volume: .16, waveform: "triangle" });
      [130.81, 164.81, 196, 261.63].forEach((frequency, index) =>
        chime({ frequency, offset: .25 + index * .19, attack: .035, length: 1.3, volume: .075, waveform: "triangle" }));
      return;
    }

    chime({ frequency: 92.5, endFrequency: 73.42, attack: .62, length: 3.95, volume: .14 });
    [138.59, 207.65, 277.18, 415.3].forEach((frequency, index) => {
      chime({ frequency, offset: .38 + index * .19, attack: .75, length: 3.8, volume: .12 - index * .018 });
      chime({ frequency: frequency * 2.009, offset: .46 + index * .19, attack: .91, length: 3.5, volume: .032, waveform: "triangle" });
    });
    chime({ frequency: 554.37, offset: 1.28, attack: .07, length: 3.55, volume: .075 });
    chime({ frequency: 830.61, offset: 1.54, attack: .055, length: 3.35, volume: .048 });
  }

  function mechanicalNoise(offset, length, frequency, volume) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    const now = context.currentTime + offset;
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;
    envelope.gain.setValueAtTime(.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, now + length);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    source.start(now);
  }

  function eject() {
    mechanicalNoise(0, .07, 2300, .24);
    tone({ frequency: 174, endFrequency: 56, offset: .045, attack: .05, length: .65, volume: .16, waveform: "triangle" });
    mechanicalNoise(.12, .58, 720, .22);
    mechanicalNoise(.66, .12, 1480, .32);
  }

  function prepareAudio() {
    if (context || !AudioEngine) return;
    try {
      context = new AudioEngine();
      bus = context.createGain();
      musicBus = context.createGain();
      bootBus = context.createGain();
      bootBus.connect(bus);
      bus.connect(context.destination);
      duck = context.createGain();
      lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 22000;
      musicBus.connect(duck).connect(lowpass).connect(context.destination);
      applyVolume();
      context.addEventListener("statechange", () => {
        if (context.state === "running" && scene) startMusic();
      });
    } catch {
      context = null;
    }
  }

  function powerOn(preset = "classic", file = "", repeat = false) {
    unlocked = true;
    if (simpleMode) return;
    prepareAudio();
    if (config?.sfx.powerOn?.file) unlock();
    cue("powerOn");
    if (repeat && !scene) bootPlayed = false;
    const playPreset = () => {
      if (context?.state === "running") startup(preset);
      else context?.resume().then(() => startup(preset)).catch(() => {});
    };
    if (!file) {
      playPreset();
      return;
    }
    if (context?.state === "suspended") context.resume().catch(() => {});
    const element = new Audio(file);
    const began = performance.now();
    bootTrack = element;
    applyVolume();
    const fallback = () => {
      if (bootTrack !== element) return;
      finishBoot();
      bootPlayed = false;
      if (performance.now() - began < 1200) playPreset();
    };
    element.addEventListener("error", fallback, { once: true });
    element.play().catch(fallback);
  }

  function finishBoot() {
    bootPlayed = true;
    if (bootBus) bootBus.gain.setTargetAtTime(0, context.currentTime, .045);
    if (!bootTrack) return;
    const element = bootTrack;
    bootTrack = null;
    element.pause();
    element.removeAttribute("src");
    element.load();
  }

  function startMusic(useDefault = false) {
    if (!scene || !unlocked || document.hidden || simpleMode || music || playlistTimer ||
      (context && context.state !== "running")) return;
    if (playlist.length && !useDefault) {
      const track = playlist[position % playlist.length];
      if (track.delayMs) playlistTimer = setTimeout(() => {
        playlistTimer = null;
        if (scene && !document.hidden) playTrack(track);
      }, track.delayMs);
      else playTrack(track);
      return;
    }
    if (sceneFile && !useDefault) {
      const element = new Audio();
      const track = { element };
      const fallback = () => {
        if (music !== track) return;
        stopMusic();
        startMusic(true);
      };
      element.loop = true;
      element.preload = "metadata";
      element.addEventListener("error", fallback, { once: true });
      music = track;
      applyVolume();
      element.src = sceneFile;
      element.play().catch(fallback);
      return;
    }
    if (!context) return;
    const track = scene;
    const chords = progressions[track];
    const gallery = track === "gallery";
    const beat = gallery ? .31 : .65;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(.44, context.currentTime + .8);
    gain.connect(musicBus);
    let next = context.currentTime + .04;
    let step = 0;

    function schedule() {
      if (context.state !== "running") return;
      if (next < context.currentTime - beat) next = context.currentTime;
      while (next < context.currentTime + .22) {
        const offset = next - context.currentTime;
        const position = step % 8;
        const chord = chords[Math.floor(step / 8) % chords.length];
        if (position === 0) chord.forEach(frequency => tone({
          frequency, offset, attack: gallery ? .55 : 1.15, length: beat * 7.7, volume: gallery ? .026 : .045,
        }, gain));
        if (gallery) {
          const note = [0, 1, 2, 1, 0, 2, 1, 2][position];
          tone({ frequency: chord[note] * 2, offset, attack: .018, length: .22, volume: position % 2 ? .037 : .057, waveform: "triangle" }, gain);
          if (position === 0 || position === 4) tone({
            frequency: 88, endFrequency: 44, offset, attack: .009, length: .19, volume: .065,
          }, gain);
        } else if (position === 2 || position === 6) {
          tone({ frequency: chord[position === 2 ? 1 : 2] * 2, offset, attack: .06, length: 1.25, volume: .04 }, gain);
        }
        next += beat;
        step++;
      }
    }

    music = { gain, timer: setInterval(schedule, 110) };
    schedule();
  }

  function stopMusic() {
    clearTimeout(playlistTimer);
    playlistTimer = null;
    for (const [record, timer] of fadingTracks) {
      clearTimeout(timer);
      disposeElement(record);
    }
    fadingTracks.clear();
    if (!music) return;
    const { element, gain, timer, source, routeGain } = music;
    music = null;
    if (element) {
      disposeElement({element,source,routeGain});
      return;
    }
    clearInterval(timer);
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0, context.currentTime, .12);
    setTimeout(() => gain.disconnect(), 650);
  }

  function disposeElement({element,source,routeGain}) {
    element.pause();
    element.removeAttribute("src");
    element.load();
    source?.disconnect();
    routeGain?.disconnect();
  }

  function playTrack(track, transitionIn = 0) {
    const element = new Audio();
    const record = { element, track };
    const active = () => music === record;
    music = record;
    element.preload = "metadata";
    if (location.protocol !== "file:") element.crossOrigin = "anonymous";
    element.playbackRate = track.playbackRate;
    element.loop = track.loop && track.loopStart === null && !track.trimEnd && !track.trimStart && !track.fadeOutMs;
    if (context && location.protocol !== "file:") {
      try {
        record.source = context.createMediaElementSource(element);
        record.routeGain = context.createGain();
        record.routeGain.gain.value = 0;
        record.source.connect(record.routeGain).connect(musicBus);
      } catch {}
    }
    applyVolume();
    function ramp(level, ms) {
      if (!record.routeGain) return;
      const gain = record.routeGain.gain;
      gain.cancelScheduledValues(context.currentTime);
      gain.setValueAtTime(gain.value, context.currentTime);
      gain.linearRampToValueAtTime(level, context.currentTime + ms / 1000);
    }
    function advance(failed = false) {
      if (!active()) return;
      stopMusic();
      if (failed) { startMusic(true); return; }
      position++;
      if (!track.gapMs) { startMusic(); return; }
      playlistTimer = setTimeout(() => { playlistTimer = null; startMusic(); }, track.gapMs);
    }
    element.addEventListener("loadedmetadata", () => {
      if (active() && track.trimStart < element.duration) element.currentTime = track.trimStart;
    });
    element.addEventListener("timeupdate", () => {
      if (!active()) return;
      const end = Math.min(track.loop && track.loopEnd || track.trimEnd || element.duration, element.duration);
      const left = end - element.currentTime;
      const upcoming = playlist[(position+1) % playlist.length];
      if (!track.loop && !track.gapMs && !upcoming?.delayMs && playlist.length > 1 &&
        record.routeGain && left > .03 && left * 1000 <= track.crossfadeMs) {
        const milliseconds = left * 1000 / track.playbackRate;
        ramp(0,milliseconds);
        const cleanup = setTimeout(() => { fadingTracks.delete(record); disposeElement(record); }, milliseconds+70);
        fadingTracks.set(record,cleanup);
        position++;
        playTrack(upcoming,milliseconds);
        return;
      }
      if (left <= 0 && track.loop) {
        element.currentTime = track.loopStart ?? track.trimStart;
        record.fading = false;
        ramp(.35 * track.volume, track.fadeInMs);
      } else if (left <= 0 && track.trimEnd) advance();
      else if (left * 1000 <= track.fadeOutMs && !record.fading) {
        record.fading = true;
        ramp(0, Math.max(0, left * 1000));
      }
    });
    element.addEventListener("ended", () => {
      if (!active()) return;
      if (track.loop && element.duration > track.trimStart) {
        element.currentTime = track.loopStart ?? track.trimStart;
        record.fading = false;
        ramp(.35 * track.volume, track.fadeInMs);
        element.play().catch(() => advance(true));
      } else advance();
    });
    element.addEventListener("error", () => advance(true), {once:true});
    element.src = audioUrl(track.file);
    element.play().then(() => { if (active()) ramp(.35 * track.volume, Math.max(transitionIn,track.fadeInMs)); }, () => advance(true));
  }

  function matchingTracks() {
    const tracks = config?.tracks.filter(track => track.enabled && (!mobile.matches || track.mobile) &&
      (track.scope === scope || track.scope === "all" || (scene === "gallery" && track.scope === "gallery"))) ?? [];
    if (config?.mode === "shuffle") for (let n = tracks.length - 1; n > 0; n--) {
      const other = Math.floor(Math.random() * (n+1));
      [tracks[n], tracks[other]] = [tracks[other], tracks[n]];
    }
    return tracks;
  }

  function setScene(nextScene, nextFile = "", nextScope = null) {
    if (nextScene === scene && nextFile === sceneFile && nextScope === scope) return;
    scene = nextScene;
    sceneFile = nextFile;
    scope = nextScope;
    playlist = matchingTracks();
    position = 0;
    stopMusic();
    startMusic();
  }

  function toggleMute() {
    muted = !muted;
    savedMute = true;
    saveVolume();
    return muted;
  }

  function applyVolume() {
    const master = volumes.master * (config?.master.volume ?? 1);
    if (bus) bus.gain.setTargetAtTime(isMuted() ? 0 : master * .4 * volumes.effects, context.currentTime, .045);
    if (musicBus) musicBus.gain.setTargetAtTime(isMuted() ? 0 : master * .4 * volumes.music, context.currentTime, .045);
    if (music?.element) {
      music.element.volume = music.routeGain ? 1 : .14 * volumes.music * master * (music.track?.volume ?? 1);
      music.element.muted = Boolean(isMuted());
    }
    if (bootTrack) {
      bootTrack.muted = Boolean(isMuted());
      bootTrack.volume = .35 * volumes.effects * master;
    }
  }

  function saveVolume() {
    applyVolume();
    try { localStorage.setItem("hf-audio", JSON.stringify({ ...volumes, muted })); } catch { /* Vale nesta visita. */ }
  }

  function setVolume(key, value) {
    if (!Object.hasOwn(volumes, key) || !Number.isFinite(value)) return;
    volumes[key] = Math.max(0, Math.min(1, value));
    saveVolume();
  }

  function playEffect(name, effect) {
    if (!effect.enabled) return;
    const now = performance.now();
    if (now - (lastCue.get(name) ?? -Infinity) < effect.cooldownMs) return;
    lastCue.set(name, now);
    const url = audioUrl(effect.file);
    if (!effects.has(url)) {
      if (effects.size >= 24) effects.delete(effects.keys().next().value);
      const data = fetch(url).then(response => {
        if (!response.ok) throw new Error("Efeito indisponível");
        return response.arrayBuffer();
      }).then(buffer => context.decodeAudioData(buffer)).catch(() => null);
      effects.set(url, data);
    }
    effects.get(url).then(buffer => {
      if (!buffer || document.hidden || isMuted() || context.state !== "running") return;
      const count = voices.get(name) ?? 0;
      if (count >= effect.maxVoices || [...voices.values()].reduce((a,b)=>a+b,0) >= 8) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.detune.value = (Math.random() * 2 - 1) * effect.pitchVariancePct * 17.3;
      gain.gain.value = effect.volume;
      source.connect(gain).connect(bus);
      voices.set(name, count+1);
      source.onended = () => { voices.set(name, voices.get(name)-1); source.disconnect(); gain.disconnect(); };
      if (config?.ducking.enabled) {
        duck.gain.cancelScheduledValues(context.currentTime);
        duck.gain.setTargetAtTime(10 ** (config.ducking.amountDb/20), context.currentTime, config.ducking.attackMs / 1000);
        duck.gain.setTargetAtTime(1, context.currentTime + Math.min(buffer.duration, 3), config.ducking.releaseMs / 1000);
      }
      source.start();
    });
  }

  function cue(name, fallback = name) {
    if (!context || document.hidden || isMuted()) return;
    if (context.state !== "running") {
      if (name !== "hover" && navigator.userActivation?.hasBeenActive) {
        context.resume().then(() => {
          if (context.state === "running") cue(name, fallback);
        }).catch(() => {});
      }
      return;
    }
    const mapped = name === "select" ? "confirm" : name === "eject" ? "back" : name;
    const effect = config?.sfx[mapped];
    if (effect?.enabled === false) return;
    if (effect?.file) { playEffect(mapped, effect); return; }
    name = fallback;
    if (name === "eject") {
      eject();
      return;
    }
    const now = performance.now();
    if (name === "hover") {
      if (now - lastHover < 105) return;
      lastHover = now;
      tone({ frequency: 930, endFrequency: 690, attack: .008, length: .115, volume: .095 });
      tone({ frequency: 1470, endFrequency: 1080, offset: .012, attack: .007, length: .09, volume: .032 });
    } else if (["select","confirm","open","close","move","back"].includes(name)) {
      lastHover = now;
      tone({ frequency: 523.25, endFrequency: 561, attack: .01, length: .145, volume: .115 });
      tone({ frequency: 783.99, offset: .05, attack: .015, length: .19, volume: .1 });
    }
  }

  function unlock() {
    unlocked = true;
    if (simpleMode || document.hidden) return;
    prepareAudio();
    if (context && context.state !== "running") context.resume().then(() => startMusic()).catch(() => {});
    else startMusic();
  }
  function suspend() {
    stopMusic();
    finishBoot();
    if (context?.state === "running") context.suspend().catch(() => {});
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); else if (unlocked) unlock(); });
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", () => { if (unlocked && !document.hidden) unlock(); });
  function configure(settings, resolver) {
    const changed = JSON.stringify(config) !== JSON.stringify(settings);
    config = settings;
    audioUrl = resolver;
    if (!savedMute) muted = config?.master.startMuted === true;
    if (changed && scene) {
      stopMusic();
      playlist = matchingTracks();
      position = 0;
      startMusic();
    }
    applyVolume();
  }
  window.hfAudio = { powerOn, finishBoot, cue, setScene, toggleMute, setVolume, configure, unlock,
    simple(enabled) { simpleMode = enabled; if (enabled) suspend(); else if (unlocked) unlock(); applyVolume(); },
    overlay(open) { if (lowpass) lowpass.frequency.setTargetAtTime(open && config?.modalLowpass.enabled ? config.modalLowpass.hz : 22000, context.currentTime, .10); },
    preferences: () => ({ ...volumes, muted: Boolean(isMuted()) }) };
})();

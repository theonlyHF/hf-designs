(() => {
  "use strict";

  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  const progressions = {
    home: [[146.83, 220, 261.63], [130.81, 196, 246.94], [116.54, 174.61, 220], [130.81, 207.65, 246.94]],
    gallery: [[164.81, 246.94, 311.13], [146.83, 220, 277.18], [130.81, 196, 261.63], [146.83, 220, 277.18]],
  };
  let context;
  let bus;
  let bootPlayed = false;
  let lastHover = -Infinity;
  let muted = false;
  let scene;
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
  }

  // Vinheta original, com uma base grave, um acorde metálico e uma cauda harmônica.
  function startup() {
    if (bootPlayed || scene || context?.state !== "running") return;
    bootPlayed = true;

    tone({ frequency: 92.5, endFrequency: 73.42, attack: .62, length: 3.95, volume: .14 });
    [138.59, 207.65, 277.18, 415.3].forEach((frequency, index) => {
      tone({ frequency, offset: .38 + index * .19, attack: .75, length: 3.8, volume: .12 - index * .018 });
      tone({ frequency: frequency * 2.009, offset: .46 + index * .19, attack: .91, length: 3.5, volume: .032, waveform: "triangle" });
    });
    tone({ frequency: 554.37, offset: 1.28, attack: .07, length: 3.55, volume: .075 });
    tone({ frequency: 830.61, offset: 1.54, attack: .055, length: 3.35, volume: .048 });
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
      bus.gain.value = muted ? 0 : .4;
      bus.connect(context.destination);
      context.addEventListener("statechange", () => {
        if (context.state === "running" && scene) startMusic();
      });
    } catch {
      context = null;
    }
  }

  function powerOn() {
    prepareAudio();
    if (!context) return;
    if (context.state === "running") {
      startup();
    } else {
      context.resume().then(startup).catch(() => {});
    }
  }

  function startMusic() {
    if (!scene || context?.state !== "running" || music) return;
    const track = scene;
    const chords = progressions[track];
    const gallery = track === "gallery";
    const beat = gallery ? .31 : .65;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(.44, context.currentTime + .8);
    gain.connect(bus);
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

  function setScene(nextScene) {
    if (nextScene === scene) return;
    scene = nextScene;
    if (music) {
      const { gain, timer } = music;
      clearInterval(timer);
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(0, context.currentTime, .12);
      setTimeout(() => gain.disconnect(), 650);
      music = null;
    }
    startMusic();
  }

  function toggleMute() {
    muted = !muted;
    if (bus) bus.gain.setTargetAtTime(muted ? 0 : .4, context.currentTime, .045);
    return muted;
  }

  function cue(name) {
    if (!context) return;
    if (context.state !== "running") {
      if (name !== "hover" && navigator.userActivation?.hasBeenActive) {
        context.resume().then(() => {
          if (context.state === "running") cue(name);
        }).catch(() => {});
      }
      return;
    }
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
    } else {
      lastHover = now;
      tone({ frequency: 523.25, endFrequency: 561, attack: .01, length: .145, volume: .115 });
      tone({ frequency: 783.99, offset: .05, attack: .015, length: .19, volume: .1 });
    }
  }

  window.hfAudio = { powerOn, cue, setScene, toggleMute };
})();

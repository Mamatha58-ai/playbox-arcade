const AudioFx = (() => {
  let ctx;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, duration, type = "sine", gain = 0.08) {
    if (!enabled) return;
    const audio = ac();
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(audio.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.stop(audio.currentTime + duration);
  }

  return {
    setEnabled(value) {
      enabled = value;
      if (value) ac();
    },
    isEnabled() {
      return enabled;
    },
    flip() {
      beep(420, 0.08, "triangle", 0.05);
    },
    match() {
      beep(620, 0.12, "sine", 0.07);
      setTimeout(() => beep(840, 0.14, "sine", 0.07), 70);
    },
    miss() {
      beep(180, 0.16, "sawtooth", 0.04);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18), i * 90));
    },
    lose() {
      beep(220, 0.25, "triangle", 0.06);
      setTimeout(() => beep(160, 0.3, "triangle", 0.06), 180);
    },
    tap() {
      beep(700, 0.05, "square", 0.03);
    },
  };
})();

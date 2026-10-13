let audio;
const cues = {
  tap: { notes: [520], duration: 0.055, vibration: 8, volume: 0.025 },
  care: { notes: [440, 660], duration: 0.09, vibration: [12, 35, 12], volume: 0.035 },
  reward: {
    notes: [523.25, 659.25, 783.99],
    duration: 0.13,
    vibration: [18, 45, 25],
    volume: 0.045,
  },
  error: { notes: [220], duration: 0.07, vibration: 18, volume: 0.02 },
};

// Best-effort sensory feedback: unsupported devices and blocked audio stay usable.
// No autoplay: callers invoke this only after a user interaction.
export function feedback(kind = 'tap', { sound = false, haptics = false } = {}) {
  if (typeof document !== 'undefined' && document.hidden) return;
  const cue = cues[kind] || cues.tap;
  if (haptics) {
    try {
      globalThis.navigator?.vibrate?.(cue.vibration);
    } catch {}
  }
  if (!sound) return;
  try {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    if (!audio || audio.state === 'closed') audio = new Audio();
    const play = () => {
      const start = audio.currentTime;
      cue.notes.forEach((frequency, index) => {
        const oscillator = audio.createOscillator(),
          gain = audio.createGain();
        const at = start + index * cue.duration * 0.8;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(cue.volume, at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, at + cue.duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(at);
        oscillator.stop(at + cue.duration + 0.01);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      });
    };
    if (audio.state === 'suspended')
      audio
        .resume()
        .then(play)
        .catch(() => {});
    else play();
  } catch {}
}

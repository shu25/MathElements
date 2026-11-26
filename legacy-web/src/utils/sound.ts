let audioContext: AudioContext | null = null;
export function playSound(type: 'combine' | 'correct' | 'invalid', muted: boolean) {
  if (muted || typeof AudioContext === 'undefined') return;
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const oscillator = audioContext.createOscillator(),
      gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    const t = audioContext.currentTime,
      duration = type === 'correct' ? 0.22 : 0.055;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      type === 'correct' ? 660 : type === 'combine' ? 380 : 120,
      t,
    );
    if (type === 'correct') oscillator.frequency.exponentialRampToValueAtTime(880, t + 0.1);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.035, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    oscillator.start(t);
    oscillator.stop(t + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  } catch {
    /* Audio is optional when a browser disallows it. */
  }
}

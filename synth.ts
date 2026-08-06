// Web Audio API Synthesizer for Wolly Post-It Music
// Synthesizes beautifully stylized ambient melodies and retro warm tones using Web Audio API

let audioContext: AudioContext | null = null;
let currentOscillators: { osc: OscillatorNode; gain: GainNode }[] = [];
let noteTimeoutIds: any[] = [];
let isLooping = false;
let currentSongId: string | null = null;

function getAudioContext() {
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// Standard musical scale note frequencies (Hz)
const NOTES: { [key: string]: number } = {
  "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.00, "A3": 220.00, "B3": 246.94,
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
  "C6": 1046.50
};

// Rich melodies mapped to genres and keywords
const MELODIES: { [key: string]: [string, number, number][] } = {
  "bossa": [
    // Garota de Ipanema / Bossa Nova vibe (Cmaj7 -> D9 -> Dm7 -> G7)
    ["E4", 0.3, 0.0], ["G4", 0.3, 0.3], ["B4", 0.4, 0.6], ["D5", 0.5, 1.0],
    ["E5", 0.4, 1.6], ["D5", 0.4, 2.0], ["B4", 0.4, 2.4], ["A4", 0.5, 2.8],
    ["F#4", 0.4, 3.4], ["A4", 0.4, 3.8], ["C5", 0.5, 4.2], ["E5", 0.6, 4.8]
  ],
  "lofi": [
    // Lofi Chill jazzy chords (Am7 -> D7 -> Gmaj7 -> Cmaj7)
    ["A3", 0.6, 0.0], ["C4", 0.5, 0.2], ["E4", 0.5, 0.4], ["G4", 0.8, 0.6],
    ["D4", 0.5, 1.6], ["F#4", 0.5, 1.8], ["A4", 0.5, 2.0], ["C5", 0.8, 2.2],
    ["G3", 0.5, 3.2], ["B3", 0.5, 3.4], ["D4", 0.5, 3.6], ["F#4", 0.8, 3.8]
  ],
  "mpb": [
    // MPB Soft acoustic warmth (Construção / Chico Buarque feel)
    ["C4", 0.4, 0.0], ["D#4", 0.4, 0.4], ["G4", 0.4, 0.8], ["C5", 0.5, 1.2],
    ["D#5", 0.5, 1.8], ["D5", 0.4, 2.4], ["B4", 0.4, 2.8], ["G4", 0.6, 3.2],
    ["C4", 0.8, 4.0]
  ],
  "sertanejo": [
    // Sertanejo Smooth accordion/guitar duets
    ["A4", 0.3, 0.0], ["C5", 0.3, 0.3], ["E5", 0.4, 0.6], ["D5", 0.3, 1.0], ["C5", 0.3, 1.3],
    ["B4", 0.4, 1.6], ["A4", 0.3, 2.0], ["G4", 0.3, 2.3], ["A4", 0.6, 2.6], ["C5", 0.5, 3.2]
  ],
  "natureza": [
    // Nature / Ambient Pentatonic Rain
    ["E4", 0.8, 0.0], ["G4", 0.8, 0.5], ["A4", 0.8, 1.0], ["B4", 0.8, 1.5],
    ["D5", 0.8, 2.0], ["E5", 1.0, 2.5], ["B4", 0.8, 3.2], ["G4", 1.0, 3.8]
  ],
  "samba": [
    // Mas Que Nada samba groove
    ["E4", 0.25, 0.0], ["G4", 0.25, 0.25], ["A4", 0.4, 0.5], ["A4", 0.25, 0.9],
    ["G4", 0.25, 1.15], ["A4", 0.4, 1.4], ["C5", 0.4, 1.85], ["A4", 0.3, 2.3], ["G4", 0.3, 2.6], ["E4", 0.6, 2.9]
  ],
  "pop": [
    // Modern Pop Synth
    ["C5", 0.3, 0.0], ["G4", 0.3, 0.3], ["A4", 0.3, 0.6], ["F4", 0.4, 0.9],
    ["C5", 0.3, 1.4], ["G4", 0.3, 1.7], ["A4", 0.4, 2.0], ["F4", 0.6, 2.4]
  ]
};

// Match input song name to a known key or build a procedural arpeggio
function resolveMelody(songName: string): [string, number, number][] {
  if (!songName) return MELODIES["bossa"];
  const lower = songName.toLowerCase();

  if (lower.includes("bossa") || lower.includes("garota") || lower.includes("ipanema")) return MELODIES["bossa"];
  if (lower.includes("lofi") || lower.includes("chill") || lower.includes("mas, que")) return MELODIES["lofi"];
  if (lower.includes("mpb") || lower.includes("construção") || lower.includes("soft")) return MELODIES["mpb"];
  if (lower.includes("sertanejo") || lower.includes("smooth") || lower.includes("chorando")) return MELODIES["sertanejo"];
  if (lower.includes("chuva") || lower.includes("natureza") || lower.includes("aquarela") || lower.includes("ocean")) return MELODIES["natureza"];
  if (lower.includes("samba") || lower.includes("carnaval")) return MELODIES["samba"];
  if (lower.includes("pop") || lower.includes("funk") || lower.includes("dance")) return MELODIES["pop"];

  // Default fallback: generate a pleasant 8-note pentatonic arpeggio based on string characters
  const baseScale = ["C4", "E4", "G4", "A4", "C5", "D5", "E5", "G5"];
  const result: [string, number, number][] = [];
  let time = 0;
  for (let i = 0; i < 8; i++) {
    const charCode = songName.charCodeAt(i % songName.length) || 65;
    const note = baseScale[charCode % baseScale.length];
    const duration = 0.4 + (charCode % 3) * 0.1;
    result.push([note, duration, time]);
    time += duration + 0.1;
  }
  return result;
}

// Play particular chiptune / ambient song
export function playPostItSynth(songId: string, onEnded?: () => void) {
  try {
    stopPostItSynth();

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    isLooping = true;
    currentSongId = songId;

    const melody = resolveMelody(songId);
    let maxEndTime = 0;

    melody.forEach(([noteName, duration, delay]) => {
      const frequency = NOTES[noteName] || 440;

      const timerId = setTimeout(() => {
        try {
          if (!ctx || ctx.state === "closed" || !isLooping) return;

          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          // Smooth warm tone
          osc.type = songId.toLowerCase().includes("chuva") || songId.toLowerCase().includes("natureza") ? "sine" : "triangle";
          osc.frequency.setValueAtTime(frequency, ctx.currentTime);

          // Volume Envelope: gentle fade to prevent clicking
          gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + duration);

          const entry = { osc, gain: gainNode };
          currentOscillators.push(entry);

          setTimeout(() => {
            currentOscillators = currentOscillators.filter(item => item !== entry);
          }, duration * 1000 + 100);

        } catch (e) {
          console.warn("Error playing synth note:", e);
        }
      }, delay * 1000);

      noteTimeoutIds.push(timerId);
      maxEndTime = Math.max(maxEndTime, delay + duration);
    });

    // Schedule loop trigger
    const loopTimerId = setTimeout(() => {
      if (isLooping && currentSongId === songId) {
        playPostItSynth(songId, onEnded);
      } else if (onEnded) {
        onEnded();
      }
    }, maxEndTime * 1000 + 400);

    noteTimeoutIds.push(loopTimerId);

  } catch (err) {
    console.error("Failed to play Post-It synth melody:", err);
    if (onEnded) onEnded();
  }
}

// Stop all playing loops and sound oscillators
export function stopPostItSynth() {
  isLooping = false;
  currentSongId = null;

  noteTimeoutIds.forEach(id => clearTimeout(id));
  noteTimeoutIds = [];

  currentOscillators.forEach(item => {
    try {
      item.osc.stop();
      item.osc.disconnect();
      item.gain.disconnect();
    } catch (e) {}
  });
  currentOscillators = [];
}


'use client';

// Sound Engine: Strictly plays the real audio meme files from sound/

class SoundFXEngine {
  private currentAudio: HTMLAudioElement | null = null;

  playAudioFile(url: string) {
    if (typeof window === 'undefined' || !url) return;
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      }
      this.currentAudio = new Audio(url);
      this.currentAudio.play().catch((err) => {
        console.warn('Audio playback waiting for user interaction:', err);
      });
      this.triggerHaptic([30, 30]);
    } catch {
      // ignore
    }
  }

  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
  }

  playClick() {
    this.triggerHaptic([15]);
  }

  playCelebration() {
    this.triggerHaptic([50, 50, 50]);
  }

  triggerHaptic(pattern: number[]) {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore if denied
      }
    }
  }
}

export const soundFX = new SoundFXEngine();

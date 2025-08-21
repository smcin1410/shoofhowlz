// Audio utility functions for generating simple sounds
export const createBeepSound = (frequency = 800, duration = 0.5) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    return () => {
      try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
      } catch (error) {
        console.warn('🔇 Could not play beep sound:', error.message);
      }
    };
  } catch (error) {
    console.warn('🔇 Audio context not supported:', error.message);
    // Return a no-op function if Web Audio API is not supported
    return () => {};
  }
};
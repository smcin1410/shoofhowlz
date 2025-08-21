import { useState, useEffect } from 'react';

export const useSound = (src, { volume = 1, playbackRate = 1 } = {}) => {
  const [audio] = useState(() => {
    try {
      return new Audio(src);
    } catch (error) {
      console.warn('Audio not supported or file missing:', src);
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    if (!audio) {
      console.warn('🔇 Audio not available for:', src);
      return;
    }
    
    try {
      audio.volume = volume;
      audio.playbackRate = playbackRate;
      audio.play().catch(error => {
        console.warn('🔇 Audio play failed:', error.message);
      });
      setIsPlaying(true);
    } catch (error) {
      console.warn('🔇 Audio play error:', error.message);
    }
  };

  const stop = () => {
    if (!audio) return;
    
    try {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    } catch (error) {
      console.warn('🔇 Audio stop error:', error.message);
    }
  };

  useEffect(() => {
    if (!audio) return;
    
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audio]);

  return [play, { stop, isPlaying }];
};

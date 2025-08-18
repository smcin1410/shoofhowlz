import { useState, useEffect } from 'react';

export const useSound = (src, { volume = 1, playbackRate = 1 } = {}) => {
  const [audio] = useState(new Audio(src));
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    audio.volume = volume;
    audio.playbackRate = playbackRate;
    audio.play();
    setIsPlaying(true);
  };

  const stop = () => {
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  useEffect(() => {
    audio.addEventListener('ended', () => setIsPlaying(false));
    return () => {
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audio]);

  return [play, { stop, isPlaying }];
};

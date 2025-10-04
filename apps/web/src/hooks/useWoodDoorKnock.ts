import { useRef, useEffect } from 'react';
import { Howl } from 'howler';

export function useWoodDoorKnock() {
  const soundRef = useRef<Howl | null>(null);

  useEffect(() => {
    soundRef.current = new Howl({
      src: ['/wood-door-knock.mp3'],
    });

    return () => {
      soundRef.current?.unload();
    };
  }, []);

  const play = () => {
    soundRef.current?.play();
  };

  return { play };
}

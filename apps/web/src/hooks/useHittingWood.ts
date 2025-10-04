import { useRef, useEffect } from "react";
import { Howl } from "howler";

export function useHittingWood() {
  const soundRef = useRef<Howl | null>(null);
  const lastIndexRef = useRef(0);

  useEffect(() => {
    // 13 hits in 8 seconds = ~615ms per hit
    // Creating sprite definitions for each hit, offset by 500ms
    const sprite: Record<string, [number, number]> = {
      hit0: [400, 300],
      hit1: [1500, 300],
      hit2: [2400, 300],
      hit3: [3000, 300],
      hit4: [4000, 300],
      hit5: [4700, 300],
      hit6: [5300, 300],
      hit7: [5800, 300],
      hit8: [6300, 300],
      hit9: [6900, 300],
      hit10: [7550, 300],
      hit11: [8150, 300],
      hit12: [8700, 300],
    };

    soundRef.current = new Howl({
      src: ["/hitting-wood.mp3"],
      sprite,
    });

    return () => {
      soundRef.current?.unload();
    };
  }, []);

  const play = () => {
    if (soundRef.current) {
      const spriteName = `hit${lastIndexRef.current}`;
      console.log(
        "Playing sprite:",
        spriteName,
        "at index:",
        lastIndexRef.current
      );
      soundRef.current.play(spriteName);
      lastIndexRef.current = (lastIndexRef.current + 1) % 13;
    }
  };

  return { play };
}

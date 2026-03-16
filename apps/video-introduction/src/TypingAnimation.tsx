import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { useMemo } from 'react';

type TypingAnimationProps = {
  text: string;
  startFrame?: number;
};

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();

  // Generate random delays for each character to feel more human
  const characterDelays = useMemo(() => {
    return text.split('').map(() => {
      // Random delay between 1-3 frames per character (faster typing)
      return Math.floor(Math.random() * 3) + 1;
    });
  }, [text]);

  // Calculate which characters should be visible
  const visibleText = useMemo(() => {
    const relativeFrame = frame - startFrame;
    if (relativeFrame < 0) return '';

    let currentFrame = 0;
    let visibleChars = 0;

    for (let i = 0; i < characterDelays.length; i++) {
      currentFrame += characterDelays[i];
      if (relativeFrame >= currentFrame) {
        visibleChars = i + 1;
      } else {
        break;
      }
    }

    return text.substring(0, visibleChars);
  }, [frame, startFrame, text, characterDelays]);

  // Calculate total animation duration
  const totalDuration = useMemo(() => {
    return characterDelays.reduce((sum, delay) => sum + delay, 0);
  }, [characterDelays]);

  // Pause after typing before showing link
  const pauseDuration = 20; // frames
  const linkAppearFrame = totalDuration + pauseDuration;
  const showLink = frame - startFrame >= linkAppearFrame;

  // Blinking cursor - show during typing and pause, hide after link appears
  const showCursor =
    frame - startFrame < linkAppearFrame && Math.floor(frame / 15) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgb(17 24 39)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: '100%',
          paddingTop: 'calc(50vh - 150px)', // Center content initially
        }}
      >
        <div style={{ maxWidth: '80rem', width: '100%', padding: '0 48px' }}>
          {/* Invisible placeholder for day header to prevent jump */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              marginBottom: '16px',
              opacity: 0,
            }}
          >
            <time
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Feb 24
            </time>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 500,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Mon
            </span>
          </div>

          <div
            style={{
              fontSize: '3.75rem',
              fontWeight: 500,
              lineHeight: 1.25,
              textAlign: 'left',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              color: 'rgb(255 255 255)',
              height: '200px',
            }}
          >
          {visibleText}
          {showLink && (
            <span
              style={{
                color: 'rgb(99 102 241)',
                textDecoration: 'underline',
                marginLeft: '0.25em',
              }}
            >
              notion.so
            </span>
          )}
          {showCursor && (
            <span
              className="inline-block ml-2 align-middle"
              style={{
                width: '4px',
                height: '60px',
                backgroundColor: 'rgb(99 102 241)',
              }}
            />
          )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import { useCurrentFrame, interpolate, Easing } from 'remotion';

type DayHeaderProps = {
  monthDay: string;
  dayName: string;
  startFrame: number;
  animateToTopFrame: number;
};

export const DayHeader: React.FC<DayHeaderProps> = ({
  monthDay,
  dayName,
  startFrame,
  animateToTopFrame,
}) => {
  const frame = useCurrentFrame();

  // Show month/day first (fade in)
  const monthDayOpacity = interpolate(
    frame,
    [startFrame, startFrame + 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Show day name second (fade in)
  const dayNameOpacity = interpolate(
    frame,
    [startFrame + 15, startFrame + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  // Animate to top
  const moveProgress = interpolate(
    frame,
    [animateToTopFrame, animateToTopFrame + 40],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  // Move from center to top
  const translateY = interpolate(
    moveProgress,
    [0, 1],
    [0, -45]
  );

  const scale = interpolate(
    moveProgress,
    [0, 1],
    [1, 0.5]
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) translateY(${translateY}%) scale(${scale})`,
        width: '100%',
        maxWidth: '1200px',
        padding: '48px',
      }}
    >
      {/* Day header - matching DayCell styling */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '8px',
          paddingLeft: '12px',
          paddingRight: '12px',
        }}
      >
        <time
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'rgb(255 255 255)',
            opacity: monthDayOpacity,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {monthDay}
        </time>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            color: 'rgb(156 163 175)',
            opacity: dayNameOpacity,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {dayName}
        </span>
      </div>
    </div>
  );
};

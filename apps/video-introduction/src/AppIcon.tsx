import { useCurrentFrame, interpolate, Easing } from 'remotion';

type AppIconProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  notifications?: number;
  startFrame: number;
  notificationStartFrame?: number;
  notificationPopOutFrame?: number;
  position: { x: number; y: number };
};

export const AppIcon: React.FC<AppIconProps> = ({
  icon: Icon,
  color,
  notifications,
  startFrame,
  notificationStartFrame,
  notificationPopOutFrame,
  position,
}) => {
  const frame = useCurrentFrame();

  // Icon pop-in animation - more dramatic and faster
  const iconProgress = interpolate(
    frame,
    [startFrame, startFrame + 8],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.back(2.5)), // Higher overshoot
    }
  );

  const iconScale = interpolate(iconProgress, [0, 1], [0, 1]);
  const iconOpacity = iconProgress;
  const iconRotation = interpolate(iconProgress, [0, 0.5, 1], [0, 10, 0]); // Slight rotation

  // Notification badge pop-in animation (if applicable) - more dramatic and faster
  let notificationScale = 0;
  let notificationOpacity = 0;
  let notificationRotation = 0;

  if (notifications && notificationStartFrame && frame >= notificationStartFrame) {
    const notificationProgress = interpolate(
      frame,
      [notificationStartFrame, notificationStartFrame + 6],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(3)), // Even more bounce
      }
    );

    notificationScale = interpolate(notificationProgress, [0, 1], [0, 1]);
    notificationOpacity = notificationProgress;
    notificationRotation = interpolate(notificationProgress, [0, 0.5, 1], [0, -15, 0]); // Rotation

    // Pop-out animation (notifications disappear)
    if (notificationPopOutFrame && frame >= notificationPopOutFrame) {
      const popOutProgress = interpolate(
        frame,
        [notificationPopOutFrame, notificationPopOutFrame + 6],
        [0, 1],
        {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.back(2)),
        }
      );

      notificationScale = interpolate(popOutProgress, [0, 1], [1, 0]);
      notificationOpacity = interpolate(popOutProgress, [0, 1], [1, 0]);
      notificationRotation = interpolate(popOutProgress, [0, 1], [0, 180]); // Spin out
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        opacity: iconOpacity,
      }}
    >
      <div style={{ transform: `scale(${iconScale}) rotate(${iconRotation}deg)` }}>
      {/* App Icon */}
      <div
        style={{
          position: 'relative',
          width: '120px',
          height: '120px',
          borderRadius: '24px',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Icon style={{ width: '60px', height: '60px', color: 'white' }} />

        {/* Notification Badge */}
        {notifications && (
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              right: '-12px',
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              backgroundColor: 'rgb(239 68 68)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: notificationOpacity,
              transform: `scale(${notificationScale}) rotate(${notificationRotation}deg)`,
            }}
          >
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {notifications}
            </span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

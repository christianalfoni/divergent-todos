import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

type YearReflectionProps = {
  startFrame: number;
};

export const YearReflection: React.FC<YearReflectionProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  // Total days to animate (52 weeks * 5 days = 260 days)
  const totalDays = 260;

  // Animation accelerates dramatically - starts faster, accelerates earlier
  const getDayFrame = (dayIndex: number) => {
    const progress = dayIndex / totalDays;
    // Start at 1.5 frames/day, accelerate to nearly instant
    const framesPerDay = 1.5 * Math.pow(1 - progress, 2.5) + 0.03;
    let cumulativeFrame = startFrame;
    for (let i = 0; i < dayIndex; i++) {
      const p = i / totalDays;
      const fpd = 1.5 * Math.pow(1 - p, 2.5) + 0.03;
      cumulativeFrame += fpd;
    }
    return cumulativeFrame;
  };

  // Modal appears after all days are filled
  const modalStart = getDayFrame(totalDays) + 30;

  const modalProgress = interpolate(
    frame,
    [modalStart, modalStart + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  const modalOpacity = modalProgress;
  const modalScale = interpolate(modalProgress, [0, 1], [0.9, 1]);
  const blurAmount = interpolate(modalProgress, [0, 1], [0, 8]);

  // 12 months, ~4 weeks each (simplified)
  const months = [
    { name: 'Jan', weeks: 4 },
    { name: 'Feb', weeks: 4 },
    { name: 'Mar', weeks: 5 },
    { name: 'Apr', weeks: 4 },
    { name: 'May', weeks: 4 },
    { name: 'Jun', weeks: 5 },
    { name: 'Jul', weeks: 4 },
    { name: 'Aug', weeks: 4 },
    { name: 'Sep', weeks: 5 },
    { name: 'Oct', weeks: 4 },
    { name: 'Nov', weeks: 4 },
    { name: 'Dec', weeks: 5 },
  ];

  let dayCounter = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgb(17 24 39)' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '40px',
          backdropFilter: `blur(${blurAmount}px)`,
        }}
      >
        {/* Year grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '56px 48px',
            height: '100%',
          }}
        >
          {months.map((month, monthIndex) => {
            return (
              <div
                key={monthIndex}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Month name */}
                <div
                  style={{
                    color: 'rgb(156 163 175)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    marginBottom: '4px',
                  }}
                >
                  {month.name}
                </div>

                {/* Weeks - 5x5 grid with fixed dimensions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Array.from({ length: month.weeks }).map((_, weekIndex) => {
                    return (
                      <div
                        key={weekIndex}
                        style={{
                          display: 'flex',
                          gap: '8px',
                        }}
                      >
                        {/* 5 days per week with heatmap-style intensity */}
                        {Array.from({ length: 5 }).map((_, dayIndex) => {
                          const thisDayIndex = dayCounter++;
                          const dayAppearFrame = getDayFrame(thisDayIndex);
                          const isVisible = frame >= dayAppearFrame;

                          // Random intensity for heatmap effect (productivity level)
                          // Using day index as seed for consistent results
                          const seed = (thisDayIndex * 9301 + 49297) % 233280;
                          const random = seed / 233280;

                          // Add clustering pattern using sine wave for natural grouping
                          const clusterWave = Math.sin(thisDayIndex / 12) * 0.5 + 0.5; // Creates waves
                          const clusterThreshold = clusterWave * 0.3; // Higher wave = more likely to be inactive

                          // Intensity levels: 0 (no activity), 0.2 (low), 0.4 (medium-low), 0.65 (medium), 0.85 (high), 1.0 (very high)
                          let intensity;
                          if (random < clusterThreshold) {
                            intensity = 0; // Variable % based on wave - no activity (transparent)
                          } else if (random < 0.25) {
                            intensity = 0.2; // 10% - very low activity
                          } else if (random < 0.4) {
                            intensity = 0.4; // 15% - low activity
                          } else if (random < 0.6) {
                            intensity = 0.65; // 20% - medium activity
                          } else if (random < 0.8) {
                            intensity = 0.85; // 20% - high activity
                          } else {
                            intensity = 1.0; // 20% - very high activity
                          }

                          const dayOpacity = isVisible
                            ? interpolate(
                                frame,
                                [dayAppearFrame, dayAppearFrame + 2],
                                [0, intensity],
                                {
                                  extrapolateLeft: 'clamp',
                                  extrapolateRight: 'clamp',
                                }
                              )
                            : 0;

                          return (
                            <div
                              key={dayIndex}
                              style={{
                                width: '64px',
                                height: '36px',
                                backgroundColor: 'rgb(99 102 241)',
                                borderRadius: '4px',
                                opacity: dayOpacity,
                                flexShrink: 0,
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflection Modal */}
      {frame >= modalStart && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: modalOpacity,
          }}
        >
          <div
            style={{
              transform: `scale(${modalScale})`,
              backgroundColor: 'rgb(31 41 55)',
              borderRadius: '16px',
              padding: '40px 48px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgb(55 65 81)',
              maxWidth: '600px',
              width: '90%',
            }}
          >
            {/* Week header placeholder */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '20px',
                  backgroundColor: 'rgb(156 163 175)',
                  borderRadius: '4px',
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  width: '60px',
                  height: '20px',
                  backgroundColor: 'rgb(156 163 175)',
                  borderRadius: '4px',
                  opacity: 0.4,
                }}
              />
            </div>

            {/* Stats placeholders - now at top */}
            <div
              style={{
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid rgb(55 65 81)',
                display: 'flex',
                gap: '32px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ width: '48px', height: '40px', backgroundColor: 'rgb(99 102 241)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ width: '60px', height: '12px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px', opacity: 0.5 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ width: '48px', height: '40px', backgroundColor: 'rgb(99 102 241)', borderRadius: '4px', marginBottom: '8px' }} />
                <div style={{ width: '70px', height: '12px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px', opacity: 0.5 }} />
              </div>
            </div>

            {/* Summary text placeholders - now at bottom */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Line 1 */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '70px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '90px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '60px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '80px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
              </div>

              {/* Line 2 */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '85px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '65px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '35px', height: '12px', backgroundColor: 'rgb(139 92 246)', borderRadius: '6px', opacity: 0.9 }} />
                <div style={{ width: '75px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
              </div>

              {/* Line 3 */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '95px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
                <div style={{ width: '40px', height: '12px', backgroundColor: 'rgb(34 197 94)', borderRadius: '6px', opacity: 0.9 }} />
                <div style={{ width: '70px', height: '16px', backgroundColor: 'rgb(255 255 255)', borderRadius: '4px', opacity: 0.8 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

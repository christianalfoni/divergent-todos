import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

type TodoBlock = {
  type: 'word' | 'link' | 'tag';
  color: string;
  width: number;
};

type FocusModeProps = {
  startFrame: number;
  todoBlocks: TodoBlock[];
};

export const FocusMode: React.FC<FocusModeProps> = ({ startFrame, todoBlocks }) => {
  const frame = useCurrentFrame();

  // Blur in animation
  const blurProgress = interpolate(
    frame,
    [startFrame, startFrame + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  const blurAmount = interpolate(blurProgress, [0, 1], [0, 10]);

  // Modal fade in and scale
  const modalProgress = interpolate(
    frame,
    [startFrame + 10, startFrame + 30],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  const modalOpacity = modalProgress;
  const modalScale = interpolate(modalProgress, [0, 1], [0.9, 1]);

  const getColorStyles = (type: 'word' | 'link' | 'tag', color: string) => {
    if (type === 'word') {
      return { bg: 'rgb(255 255 255)' };
    }

    if (type === 'link') {
      return { bg: 'rgb(99 102 241)' };
    }

    const tagColors: Record<string, string> = {
      gray: 'rgb(156 163 175)',
      red: 'rgb(248 113 113)',
      yellow: 'rgb(234 179 8)',
      green: 'rgb(74 222 128)',
      blue: 'rgb(96 165 250)',
      indigo: 'rgb(129 140 248)',
      purple: 'rgb(192 132 252)',
      pink: 'rgb(244 114 182)',
    };
    return { bg: tagColors[color] || tagColors.blue };
  };

  if (frame < startFrame) return null;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'transparent',
        backdropFilter: `blur(${blurAmount}px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Modal */}
      <div
        style={{
          opacity: modalOpacity,
          transform: `scale(${modalScale})`,
          backgroundColor: 'rgb(31 41 55)', // Slightly lighter than background
          borderRadius: '16px',
          padding: '48px 64px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgb(55 65 81)',
          maxWidth: '800px',
        }}
      >
        {/* Todo blocks - larger scale */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {todoBlocks.map((block, index) => {
            const colorStyles = getColorStyles(block.type, block.color);
            const height = block.type === 'tag' ? '28px' : '36px'; // Larger than normal
            const width = block.width * 2; // 2x larger

            return (
              <div
                key={index}
                style={{
                  height,
                  width: `${width}px`,
                  backgroundColor: colorStyles.bg,
                  borderRadius: block.type === 'tag' ? '8px' : '6px',
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

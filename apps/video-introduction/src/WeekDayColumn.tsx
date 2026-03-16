import { useCurrentFrame, interpolate, Easing } from 'remotion';

type TodoBlock = {
  type: 'word' | 'link' | 'tag';
  color: string;
  width: number; // Width in pixels
};

type Todo = {
  id: string;
  blocks: TodoBlock[];
  completed?: boolean;
  fadeInStartFrame?: number; // Only new todos have this - moved todos appear instantly
};

type WeekDayColumnProps = {
  monthDay: string;
  dayName: string;
  todos: Todo[];
  startFrame: number;
  isLastDay?: boolean;
  isActive?: boolean;
  todosStartFrame?: number;
};

export const WeekDayColumn: React.FC<WeekDayColumnProps> = ({
  monthDay,
  dayName,
  todos,
  startFrame,
  isLastDay = false,
  isActive = false,
  todosStartFrame,
}) => {
  const frame = useCurrentFrame();

  // Crash in from right animation
  const progress = interpolate(
    frame,
    [startFrame, startFrame + 15],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.ease),
    }
  );

  const translateX = interpolate(progress, [0, 1], [100, 0]);
  const opacity = progress;

  // Small bounce effect
  const bounce = interpolate(
    frame,
    [startFrame + 10, startFrame + 20],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );
  const bounceOffset = bounce > 0 && bounce < 1 ? Math.sin(bounce * Math.PI) * -5 : 0;

  const getColorStyles = (type: 'word' | 'link' | 'tag', color: string) => {
    if (type === 'word') {
      return { bg: 'rgb(255 255 255)' };
    }

    if (type === 'link') {
      return { bg: 'rgb(99 102 241)' }; // Primary blue for links
    }

    // Tag colors
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

  // Determine if todos should be visible
  const showTodos = todosStartFrame !== undefined && frame >= todosStartFrame;

  return (
    <div
      style={{
        width: '20%',
        height: '100%',
        opacity,
        transform: `translateX(${translateX + bounceOffset}%)`,
        borderRight: isLastDay ? 'none' : '1px solid rgb(55 65 81)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
        overflow: 'hidden',
      }}
    >
      {/* Day header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '32px',
        }}
      >
        <time
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: isActive ? 'rgb(99 102 241)' : 'rgb(255 255 255)', // Primary color when active
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {monthDay}
        </time>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 500,
            color: 'rgb(156 163 175)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}
        >
          {dayName}
        </span>
      </div>

      {/* Todos as abstract colored blocks */}
      {showTodos && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {todos.map((todo, index) => {
            // If todo has fadeInStartFrame, it's new and should animate
            // Otherwise it's moved from previous day and appears instantly
            const isNewTodo = todo.fadeInStartFrame !== undefined;

            if (isNewTodo) {
              const todoFadeStart = todo.fadeInStartFrame!;

              if (frame < todoFadeStart) return null;

              const todoOpacity = interpolate(
                frame,
                [todoFadeStart, todoFadeStart + 10],
                [0, todo.completed ? 0.4 : 1],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                }
              );

              const todoTranslateY = interpolate(
                frame,
                [todoFadeStart, todoFadeStart + 10],
                [-20, 0],
                {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: Easing.out(Easing.ease),
                }
              );

              return (
                <div
                  key={todo.id}
                  style={{
                    marginBottom: '20px',
                    opacity: todoOpacity,
                    transform: `translateY(${todoTranslateY}px)`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {todo.blocks.map((block, blockIndex) => {
                      const colorStyles = getColorStyles(block.type, block.color);
                      const height = block.type === 'tag' ? '12px' : '16px'; // Tags are shorter

                      return (
                        <div
                          key={blockIndex}
                          style={{
                            height,
                            width: `${block.width}px`,
                            backgroundColor: colorStyles.bg,
                            borderRadius: block.type === 'tag' ? '6px' : '4px',
                            position: 'relative',
                          }}
                        />

                      );
                    })}
                  </div>
                </div>
              );
            } else {
              // Moved todo - appears instantly at full opacity
              return (
                <div
                  key={todo.id}
                  style={{
                    marginBottom: '20px',
                    opacity: todo.completed ? 0.4 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {todo.blocks.map((block, blockIndex) => {
                      const colorStyles = getColorStyles(block.type, block.color);
                      const height = block.type === 'tag' ? '12px' : '16px'; // Tags are shorter

                      return (
                        <div
                          key={blockIndex}
                          style={{
                            height,
                            width: `${block.width}px`,
                            backgroundColor: colorStyles.bg,
                            borderRadius: block.type === 'tag' ? '6px' : '4px',
                            position: 'relative',
                          }}
                        />

                      );
                    })}
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
};

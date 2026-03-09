import { useCurrentFrame, interpolate } from 'remotion';

type Todo = {
  text: string;
  link?: string;
  tags?: Array<{ name: string; color: string }>;
  completed?: boolean;
};

type TodoListProps = {
  todos: Todo[];
  startFrame: number;
  staggerDelay?: number;
};

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  startFrame,
  staggerDelay = 10,
}) => {
  const frame = useCurrentFrame();

  const getTagColorStyles = (color: string) => {
    // Dark mode colors from the app
    const colors: Record<string, { bg: string; text: string }> = {
      gray: { bg: 'rgb(156 163 175 / 0.1)', text: 'rgb(156 163 175)' },
      red: { bg: 'rgb(248 113 113 / 0.1)', text: 'rgb(248 113 113)' },
      yellow: { bg: 'rgb(234 179 8 / 0.1)', text: 'rgb(234 179 8)' },
      green: { bg: 'rgb(74 222 128 / 0.1)', text: 'rgb(74 222 128)' },
      blue: { bg: 'rgb(96 165 250 / 0.1)', text: 'rgb(96 165 250)' },
      indigo: { bg: 'rgb(129 140 248 / 0.1)', text: 'rgb(129 140 248)' },
      purple: { bg: 'rgb(192 132 252 / 0.1)', text: 'rgb(192 132 252)' },
      pink: { bg: 'rgb(244 114 182 / 0.1)', text: 'rgb(244 114 182)' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div style={{ width: '100%', marginTop: '-40px' }}>
      {todos.map((todo, index) => {
        const todoStartFrame = startFrame + index * staggerDelay;

        // Fade in
        const opacity = interpolate(
          frame,
          [todoStartFrame, todoStartFrame + 15],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        // Slight downward movement
        const translateY = interpolate(
          frame,
          [todoStartFrame, todoStartFrame + 15],
          [-70, 0],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }
        );

        if (frame < todoStartFrame) return null;

        return (
          <div
            key={index}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              marginTop: '48px',
            }}
          >
            {/* Todo text with tags and link - same size as first todo */}
            <div
              style={{
                color: 'rgb(255 255 255)',
                fontSize: '3.75rem',
                fontWeight: 500,
                lineHeight: 1.25,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              {todo.text}
              {todo.link && (
                <span
                  style={{
                    color: 'rgb(99 102 241)',
                    textDecoration: 'underline',
                    marginLeft: '0.25em',
                  }}
                >
                  {todo.link}
                </span>
              )}
              {todo.tags && todo.tags.map((tag, tagIndex) => {
                const colorStyles = getTagColorStyles(tag.color);
                return (
                  <span
                    key={tagIndex}
                    style={{
                      position: 'relative',
                      top: '-8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 12px',
                      borderRadius: '12px',
                      lineHeight: 1.4,
                      marginLeft: '12px',
                      marginTop: '4px',
                      userSelect: 'none',
                      fontSize: '0.6em',
                      fontWeight: 500,
                      backgroundColor: colorStyles.bg,
                      color: colorStyles.text,
                    }}
                  >
                    {tag.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

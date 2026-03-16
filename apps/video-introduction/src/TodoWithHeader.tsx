import { useCurrentFrame, interpolate, Easing } from 'remotion';
import { TodoList } from './TodoList';

type Todo = {
  text: string;
  link?: string;
  tags?: Array<{ name: string; color: string }>;
  completed?: boolean;
};

type TodoWithHeaderProps = {
  text: string;
  link: string;
  monthDay: string;
  dayName: string;
  startFrame: number;
  animateToTopFrame: number;
  additionalTodos?: Todo[];
  additionalTodosStartFrame?: number;
};

export const TodoWithHeader: React.FC<TodoWithHeaderProps> = ({
  text,
  link,
  monthDay,
  dayName,
  startFrame,
  animateToTopFrame,
  additionalTodos = [],
  additionalTodosStartFrame = 0,
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

  // Move from center toward top (not all the way)
  const translateY = interpolate(
    moveProgress,
    [0, 1],
    [0, 200]
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        width: '100%',
        paddingTop: `calc(50vh - 150px - ${translateY}px)`, // Center initially, then move up
      }}
    >
      <div style={{ maxWidth: '80rem', width: '100%', padding: '0 48px' }}>
        {/* Day header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '16px',
            paddingLeft: '0',
            paddingRight: '0',
          }}
        >
          <time
            style={{
              fontSize: '1.5rem',
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
              fontSize: '1.5rem',
              fontWeight: 500,
              color: 'rgb(156 163 175)',
              opacity: dayNameOpacity,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {dayName}
          </span>
        </div>

        {/* Todo text with link - matching TypingAnimation exactly */}
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
          {text}
          <span
            style={{
              color: 'rgb(99 102 241)',
              textDecoration: 'underline',
              marginLeft: '0.25em',
            }}
          >
            {link}
          </span>
        </div>

        {/* Additional todos */}
        {additionalTodos.length > 0 && (
          <TodoList
            todos={additionalTodos}
            startFrame={additionalTodosStartFrame}
            staggerDelay={10}
          />
        )}
      </div>
    </div>
  );
};

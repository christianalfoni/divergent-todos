import { AbsoluteFill, Sequence } from 'remotion';
import { AppIconsChaos } from './AppIconsChaos';
import { TypingAnimation } from './TypingAnimation';
import { TodoWithHeader } from './TodoWithHeader';
import { WeekView } from './WeekView';
import { FocusMode } from './FocusMode';
import { YearReflection } from './YearReflection';

type IntroVideoProps = {
  title: string;
  subtitle: string;
};

export const IntroVideo: React.FC<IntroVideoProps> = () => {
  // Animation timing
  const appIconsStart = 0;
  const appIconsDuration = 110; // Apps (faster overlapping) + notifications pop out
  const typingStart = appIconsStart + appIconsDuration;
  const typingDuration = 180;
  const todoWithHeaderStart = typingStart + typingDuration;
  const animateToTopStart = 40; // Relative to todoWithHeaderStart
  const additionalTodosStart = animateToTopStart + 40; // After animation to top completes
  const weekViewStart = todoWithHeaderStart + additionalTodosStart + 150; // After todos fade in
  const weekViewDuration = 500; // Days crash in empty, Monday todos, then week progression with pauses
  const focusModeStart = weekViewStart + weekViewDuration; // After week view completes
  const focusModeDuration = 120; // Focus mode demonstration
  const weekViewTotalDuration = weekViewDuration + focusModeDuration; // Keep week visible during focus mode
  const yearReflectionStart = focusModeStart + focusModeDuration; // After focus mode
  const yearReflectionDuration = 600; // Year fills up dramatically faster + modal with more display time

  // Sample todos with tags
  const additionalTodos = [
    {
      text: 'Review team PRs',
      link: 'github.com',
      tags: [{ name: 'code', color: 'blue' }],
    },
    {
      text: 'Update deployment documentation',
      tags: [
        { name: 'docs', color: 'green' },
        { name: 'devops', color: 'purple' },
      ],
    },
    {
      text: 'Fix critical payment bug',
      link: 'linear.app',
      tags: [{ name: 'urgent', color: 'red' }],
    },
    {
      text: 'Design new dashboard layout',
      link: 'figma.com',
      tags: [{ name: 'design', color: 'pink' }],
    },
  ];


  // Focused todo - one of Friday's incomplete todos
  const focusedTodo = [
    { type: 'word' as const, color: 'white', width: 70 },
    { type: 'tag' as const, color: 'purple', width: 36 },
    { type: 'link' as const, color: 'blue', width: 90 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgb(17 24 39)' }}>
      {/* App Icons Chaos - apps pop in with notifications */}
      <Sequence from={appIconsStart} durationInFrames={appIconsDuration} name="App Icons Chaos">
        <AppIconsChaos startFrame={0} />
      </Sequence>

      {/* Typing Animation - shows text + link */}
      <Sequence from={typingStart} durationInFrames={typingDuration} name="Typing Todo">
        <TypingAnimation text="Finish quarterly product roadmap presentation:" />
      </Sequence>

      {/* Todo with Header - day header appears, then everything animates to top, then more todos fade in */}
      <Sequence from={todoWithHeaderStart} durationInFrames={weekViewStart - todoWithHeaderStart} name="Todo with Header">
        <TodoWithHeader
          text="Finish quarterly product roadmap presentation:"
          link="notion.so"
          monthDay="Feb 24"
          dayName="Mon"
          startFrame={0}
          animateToTopFrame={animateToTopStart}
          additionalTodos={additionalTodos}
          additionalTodosStartFrame={additionalTodosStart}
        />
      </Sequence>

      {/* Week View - Days crash in from right to left, stays visible during focus mode */}
      <Sequence from={weekViewStart} durationInFrames={weekViewTotalDuration} name="Week View">
        <WeekView startFrame={0} />
      </Sequence>

      {/* Focus Mode - Overlays on week view with blur */}
      <Sequence from={focusModeStart} durationInFrames={focusModeDuration} name="Focus Mode">
        <FocusMode startFrame={0} todoBlocks={focusedTodo} />
      </Sequence>

      {/* Year Reflection - Shows year filling up with weeks, then reflection modal */}
      <Sequence from={yearReflectionStart} durationInFrames={yearReflectionDuration} name="Year Reflection">
        <YearReflection startFrame={0} />
      </Sequence>
    </AbsoluteFill>
  );
};

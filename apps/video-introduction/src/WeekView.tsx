import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { WeekDayColumn } from './WeekDayColumn';

type TodoBlock = {
  type: 'word' | 'link' | 'tag';
  color: string;
  width: number;
};

type Todo = {
  id: string;
  blocks: TodoBlock[];
  completed?: boolean;
  fadeInStartFrame?: number;
};

type WeekViewProps = {
  startFrame: number;
};

export const WeekView: React.FC<WeekViewProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();

  const dayCrashInFrames = [
    startFrame,
    startFrame + 18,
    startFrame + 36,
    startFrame + 54,
    startFrame + 72,
  ];

  // After days crash in, start with Monday
  const mondayStart = startFrame + 90;

  // Day timing: moved todos → pause → new todos → pause → completions → pause → next day
  const mondayTodosStart = mondayStart;
  const mondayCompletionsStart = mondayStart + 40; // After new todos animate in
  const tuesdayStart = mondayStart + 70; // After completions + pause

  const tuesdayMovedStart = tuesdayStart;
  const tuesdayNewStart = tuesdayStart + 15; // Pause after moved todos
  const tuesdayCompletionsStart = tuesdayStart + 50; // After new todos animate in
  const wednesdayStart = tuesdayStart + 80;

  const wednesdayMovedStart = wednesdayStart;
  const wednesdayNewStart = wednesdayStart + 15;
  const wednesdayCompletionsStart = wednesdayStart + 50;
  const thursdayStart = wednesdayStart + 80;

  const thursdayMovedStart = thursdayStart;
  const thursdayNewStart = thursdayStart + 15;
  const thursdayCompletionsStart = thursdayStart + 60; // More todos, so more time
  const fridayStart = thursdayStart + 95;

  const fridayMovedStart = fridayStart;
  const fridayNewStart = fridayStart + 15;
  const fridayCompletionsStart = fridayStart + 40;

  const getActiveDay = () => {
    if (frame < tuesdayStart) return 0; // Monday
    if (frame < wednesdayStart) return 1; // Tuesday
    if (frame < thursdayStart) return 2; // Wednesday
    if (frame < fridayStart) return 3; // Thursday
    return 4; // Friday
  };

  const activeDay = getActiveDay();

  const createTodo = (
    id: string,
    blockConfig: Array<{ type: 'word' | 'link' | 'tag'; color: string; width: number }>,
    fadeInFrame?: number
  ): Todo => ({
    id,
    blocks: blockConfig,
    fadeInStartFrame: fadeInFrame,
  });

  // === MONDAY ===
  // New todos appear when Monday starts (no moved todos)
  const mondayTodo1 = createTodo('mon-1', [
    { type: 'word', color: 'white', width: 80 },
    { type: 'word', color: 'white', width: 60 },
    { type: 'link', color: 'blue', width: 70 },
    { type: 'tag', color: 'blue', width: 45 },
  ], mondayTodosStart);

  const mondayTodo2 = createTodo('mon-2', [
    { type: 'word', color: 'white', width: 90 },
    { type: 'tag', color: 'purple', width: 40 },
    { type: 'word', color: 'white', width: 50 },
  ], mondayTodosStart + 8);

  const mondayTodo3 = createTodo('mon-3', [
    { type: 'word', color: 'white', width: 100 },
    { type: 'word', color: 'white', width: 55 },
    { type: 'tag', color: 'green', width: 35 },
    { type: 'link', color: 'blue', width: 80 },
  ], mondayTodosStart + 16);

  // Complete 2 Monday todos after they've all appeared
  if (frame >= mondayCompletionsStart) {
    mondayTodo1.completed = true;
  }
  if (frame >= mondayCompletionsStart + 10) {
    mondayTodo2.completed = true;
  }

  const mondayTodos = frame >= tuesdayStart
    ? [mondayTodo1, mondayTodo2, mondayTodo3].filter(t => t.completed)
    : [mondayTodo1, mondayTodo2, mondayTodo3];

  // === TUESDAY ===
  const tuesdayMovedTodos = frame >= tuesdayMovedStart
    ? [mondayTodo3].filter(t => !t.completed).map(t => {
        t.fadeInStartFrame = undefined; // Remove fade-in for moved todos
        return t;
      })
    : [];

  const tuesdayNewTodo1 = createTodo('tue-new-1', [
    { type: 'tag', color: 'indigo', width: 38 },
    { type: 'word', color: 'white', width: 70 },
    { type: 'word', color: 'white', width: 65 },
  ], tuesdayNewStart);

  const tuesdayNewTodo2 = createTodo('tue-new-2', [
    { type: 'word', color: 'white', width: 85 },
    { type: 'tag', color: 'red', width: 35 },
    { type: 'link', color: 'blue', width: 75 },
  ], tuesdayNewStart + 8);

  const tuesdayNewTodo3 = createTodo('tue-new-3', [
    { type: 'word', color: 'white', width: 75 },
    { type: 'word', color: 'white', width: 60 },
    { type: 'tag', color: 'yellow', width: 40 },
  ], tuesdayNewStart + 16);

  // Complete 3 Tuesday todos (moved + 2 new), tuesdayNewTodo3 moves forward
  if (frame >= tuesdayCompletionsStart) {
    mondayTodo3.completed = true;
  }
  if (frame >= tuesdayCompletionsStart + 8) {
    tuesdayNewTodo1.completed = true;
  }
  if (frame >= tuesdayCompletionsStart + 16) {
    tuesdayNewTodo2.completed = true;
  }

  const allTuesdayTodos = [...tuesdayMovedTodos, tuesdayNewTodo1, tuesdayNewTodo2, tuesdayNewTodo3];
  const tuesdayTodos = frame >= wednesdayStart
    ? allTuesdayTodos.filter(t => t.completed)
    : frame >= tuesdayStart ? allTuesdayTodos : [];

  // === WEDNESDAY ===
  const wednesdayMovedTodos = frame >= wednesdayMovedStart
    ? allTuesdayTodos.filter(t => !t.completed).map(t => {
        t.fadeInStartFrame = undefined;
        return t;
      })
    : [];

  const wednesdayNewTodo1 = createTodo('wed-new-1', [
    { type: 'word', color: 'white', width: 95 },
    { type: 'tag', color: 'pink', width: 36 },
    { type: 'word', color: 'white', width: 60 },
  ], wednesdayNewStart);

  const wednesdayNewTodo2 = createTodo('wed-new-2', [
    { type: 'word', color: 'white', width: 75 },
    { type: 'tag', color: 'purple', width: 42 },
    { type: 'link', color: 'blue', width: 65 },
  ], wednesdayNewStart + 8);

  const wednesdayNewTodo3 = createTodo('wed-new-3', [
    { type: 'tag', color: 'green', width: 38 },
    { type: 'word', color: 'white', width: 80 },
    { type: 'word', color: 'white', width: 70 },
  ], wednesdayNewStart + 16);

  // Complete only 1 Wednesday todo - low productivity day
  if (frame >= wednesdayCompletionsStart) {
    wednesdayNewTodo1.completed = true;
  }
  // tuesdayNewTodo3, wednesdayNewTodo2, and wednesdayNewTodo3 move to Thursday

  const allWednesdayTodos = [...wednesdayMovedTodos, wednesdayNewTodo1, wednesdayNewTodo2, wednesdayNewTodo3];
  const wednesdayTodos = frame >= thursdayStart
    ? allWednesdayTodos.filter(t => t.completed)
    : frame >= wednesdayStart ? allWednesdayTodos : [];

  // === THURSDAY ===
  const thursdayMovedTodos = frame >= thursdayMovedStart
    ? allWednesdayTodos.filter(t => !t.completed).map(t => {
        t.fadeInStartFrame = undefined;
        return t;
      })
    : [];

  const thursdayNewTodo1 = createTodo('thu-new-1', [
    { type: 'word', color: 'white', width: 80 },
    { type: 'tag', color: 'red', width: 36 },
    { type: 'word', color: 'white', width: 70 },
  ], thursdayNewStart);

  const thursdayNewTodo2 = createTodo('thu-new-2', [
    { type: 'tag', color: 'indigo', width: 38 },
    { type: 'word', color: 'white', width: 90 },
    { type: 'link', color: 'blue', width: 85 },
  ], thursdayNewStart + 8);

  const thursdayNewTodo3 = createTodo('thu-new-3', [
    { type: 'word', color: 'white', width: 85 },
    { type: 'word', color: 'white', width: 65 },
    { type: 'tag', color: 'green', width: 35 },
  ], thursdayNewStart + 16);

  const thursdayNewTodo4 = createTodo('thu-new-4', [
    { type: 'word', color: 'white', width: 75 },
    { type: 'tag', color: 'yellow', width: 38 },
    { type: 'word', color: 'white', width: 80 },
  ], thursdayNewStart + 24);

  // Complete 4 Thursday todos (moved + 3 new), thursdayNewTodo4 moves forward
  if (frame >= thursdayCompletionsStart) {
    wednesdayNewTodo3.completed = true;
  }
  if (frame >= thursdayCompletionsStart + 8) {
    thursdayNewTodo1.completed = true;
  }
  if (frame >= thursdayCompletionsStart + 16) {
    thursdayNewTodo2.completed = true;
  }
  if (frame >= thursdayCompletionsStart + 24) {
    thursdayNewTodo3.completed = true;
  }

  const allThursdayTodos = [...thursdayMovedTodos, thursdayNewTodo1, thursdayNewTodo2, thursdayNewTodo3, thursdayNewTodo4];
  const thursdayTodos = frame >= fridayStart
    ? allThursdayTodos.filter(t => t.completed)
    : frame >= thursdayStart ? allThursdayTodos : [];

  // === FRIDAY ===
  const fridayMovedTodos = frame >= fridayMovedStart
    ? allThursdayTodos.filter(t => !t.completed).map(t => {
        t.fadeInStartFrame = undefined;
        return t;
      })
    : [];

  const fridayNewTodo1 = createTodo('fri-new-1', [
    { type: 'tag', color: 'indigo', width: 38 },
    { type: 'word', color: 'white', width: 85 },
    { type: 'word', color: 'white', width: 60 },
  ], fridayNewStart);

  const fridayNewTodo2 = createTodo('fri-new-2', [
    { type: 'word', color: 'white', width: 70 },
    { type: 'tag', color: 'purple', width: 36 },
    { type: 'link', color: 'blue', width: 90 },
  ], fridayNewStart + 8);

  // Complete 2 Friday todos, leaving 1 incomplete
  if (frame >= fridayCompletionsStart) {
    thursdayNewTodo4.completed = true;
  }
  if (frame >= fridayCompletionsStart + 10) {
    fridayNewTodo1.completed = true;
  }
  // fridayNewTodo2 stays incomplete

  const fridayTodos = frame >= fridayStart
    ? [...fridayMovedTodos, fridayNewTodo1, fridayNewTodo2]
    : [];

  const days = [
    {
      monthDay: 'Feb 24',
      dayName: 'Mon',
      todos: mondayTodos,
      todosStartFrame: mondayTodosStart,
    },
    {
      monthDay: 'Feb 25',
      dayName: 'Tue',
      todos: tuesdayTodos,
      todosStartFrame: tuesdayStart,
    },
    {
      monthDay: 'Feb 26',
      dayName: 'Wed',
      todos: wednesdayTodos,
      todosStartFrame: wednesdayStart,
    },
    {
      monthDay: 'Feb 27',
      dayName: 'Thu',
      todos: thursdayTodos,
      todosStartFrame: thursdayStart,
    },
    {
      monthDay: 'Feb 28',
      dayName: 'Fri',
      todos: fridayTodos,
      todosStartFrame: fridayStart,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: 'rgb(17 24 39)' }}>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
        }}
      >
        {days.map((day, index) => (
          <WeekDayColumn
            key={index}
            monthDay={day.monthDay}
            dayName={day.dayName}
            todos={day.todos}
            startFrame={dayCrashInFrames[index]}
            isLastDay={index === days.length - 1}
            isActive={activeDay === index && frame >= mondayStart}
            todosStartFrame={day.todosStartFrame}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

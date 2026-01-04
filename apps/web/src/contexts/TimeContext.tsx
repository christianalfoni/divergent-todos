import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface TimeContextValue {
  currentTime: Date;
}

const TimeContext = createContext<TimeContextValue | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60 seconds

    // Also update when window gains focus
    const handleFocus = () => {
      setCurrentTime(new Date());
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return (
    <TimeContext.Provider value={{ currentTime }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useCurrentTime() {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error('useCurrentTime must be used within a TimeProvider');
  }
  return context.currentTime;
}

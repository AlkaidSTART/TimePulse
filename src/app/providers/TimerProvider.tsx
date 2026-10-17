import { createContext, useEffect, type ReactNode } from 'react';
import type { Holiday, Timer } from '@/domain/timer';
import {
  useTimers,
  useTimerStore,
  type TimerInput,
  type TimerUpdate,
} from '@/stores/useTimerStore';

export type { TimerInput, TimerUpdate };

export interface TimerContextValue {
  timers: Timer[];
  activeTimerId: string | null;
  setActiveTimerId: (id: string | null) => void;
  reorderTimers: (orderedIds: string[]) => void;
  addTimer: (timerData: TimerInput) => string;
  deleteTimer: (id: string) => void;
  updateTimer: (id: string, updatedData: TimerUpdate) => void;
  renameStopwatchLap: (timerId: string, lapIndex: number, name: string) => void;
  deleteStopwatchLap: (timerId: string, lapIndex: number) => void;
  getActiveTimer: () => Timer | null;
  holidaysList: Holiday[];
}

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const value = useTimers();
  const isLoaded = useTimerStore((s) => s.isLoaded);
  const initTimers = useTimerStore((s) => s.initTimers);

  useEffect(() => {
    if (!isLoaded) {
      void initTimers();
    }
  }, [isLoaded, initTimers]);

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
}

export { useTimers, useTimerStore };

export default TimerContext;

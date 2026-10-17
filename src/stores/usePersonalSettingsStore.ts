import { create } from 'zustand';

export type CheerStyle = 'energetic' | 'warm' | 'poetic' | 'funny';
export type DefaultStartPage = 'cheer' | 'main' | 'todo';

export interface CheerNote {
  id: string;
  date: string;
  time: string;
  content: string;
  moodEmoji: string;
}

export interface PersonalSettingsState {
  nickname: string;
  avatar: string;
  customMotto: string;
  cheerStyle: CheerStyle;
  defaultStartPage: DefaultStartPage;
  cheerCount: number;
  lastCheerDate: string;
  cheerNotes: CheerNote[];
  vibrationEnabled: boolean;

  // Actions
  updateSettings: (partial: Partial<Omit<PersonalSettingsState, 'updateSettings' | 'boostCheer' | 'addCheerNote' | 'removeCheerNote' | 'resetSettings'>>) => void;
  boostCheer: () => { count: number; isFirstToday: boolean };
  addCheerNote: (content: string, moodEmoji?: string) => void;
  removeCheerNote: (id: string) => void;
  resetSettings: () => void;
}

const STORAGE_KEY = 'timepulse_personal_settings';

interface PersistedData {
  nickname?: string;
  avatar?: string;
  customMotto?: string;
  cheerStyle?: CheerStyle;
  defaultStartPage?: DefaultStartPage;
  cheerCount?: number;
  lastCheerDate?: string;
  cheerNotes?: CheerNote[];
  vibrationEnabled?: boolean;
}

const DEFAULT_SETTINGS = {
  nickname: '阳光旅人',
  avatar: '专注',
  customMotto: '心怀热爱，奔赴每一个灿烂的日子',
  cheerStyle: 'energetic' as CheerStyle,
  defaultStartPage: 'main' as DefaultStartPage,
  cheerCount: 0,
  lastCheerDate: '',
  cheerNotes: [] as CheerNote[],
  vibrationEnabled: true,
};

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadInitialSettings(): PersistedData {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as PersistedData;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(data: PersistedData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save personal settings to localStorage:', e);
  }
}

export const usePersonalSettingsStore = create<PersonalSettingsState>((set, get) => {
  const initial = loadInitialSettings();
  const today = getTodayString();
  const isDifferentDay = initial.lastCheerDate !== today;
  const initialCheerCount = isDifferentDay ? 0 : (initial.cheerCount ?? 0);

  return {
    nickname: initial.nickname ?? DEFAULT_SETTINGS.nickname,
    avatar: initial.avatar ?? DEFAULT_SETTINGS.avatar,
    customMotto: initial.customMotto ?? DEFAULT_SETTINGS.customMotto,
    cheerStyle: initial.cheerStyle ?? DEFAULT_SETTINGS.cheerStyle,
    defaultStartPage: initial.defaultStartPage ?? DEFAULT_SETTINGS.defaultStartPage,
    cheerCount: initialCheerCount,
    lastCheerDate: isDifferentDay ? today : (initial.lastCheerDate ?? today),
    cheerNotes: initial.cheerNotes ?? [],
    vibrationEnabled: initial.vibrationEnabled ?? DEFAULT_SETTINGS.vibrationEnabled,

    updateSettings: (partial) => {
      set((state) => {
        const nextState = { ...state, ...partial };
        saveSettings({
          nickname: nextState.nickname,
          avatar: nextState.avatar,
          customMotto: nextState.customMotto,
          cheerStyle: nextState.cheerStyle,
          defaultStartPage: nextState.defaultStartPage,
          cheerCount: nextState.cheerCount,
          lastCheerDate: nextState.lastCheerDate,
          cheerNotes: nextState.cheerNotes,
          vibrationEnabled: nextState.vibrationEnabled,
        });
        return nextState;
      });
    },

    boostCheer: () => {
      const todayStr = getTodayString();
      const current = get();
      const isNewDay = current.lastCheerDate !== todayStr;
      const newCount = (isNewDay ? 0 : current.cheerCount) + 1;

      set({
        cheerCount: newCount,
        lastCheerDate: todayStr,
      });

      saveSettings({
        nickname: current.nickname,
        avatar: current.avatar,
        customMotto: current.customMotto,
        cheerStyle: current.cheerStyle,
        defaultStartPage: current.defaultStartPage,
        cheerCount: newCount,
        lastCheerDate: todayStr,
        cheerNotes: current.cheerNotes,
        vibrationEnabled: current.vibrationEnabled,
      });

      return { count: newCount, isFirstToday: isNewDay || current.cheerCount === 0 };
    },

    addCheerNote: (content: string, moodEmoji = '') => {
      if (!content.trim()) return;
      const now = new Date();
      const newNote: CheerNote = {
        id: `cheer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: getTodayString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: content.trim(),
        moodEmoji,
      };

      set((state) => {
        const nextNotes = [newNote, ...state.cheerNotes].slice(0, 50); // 保留最新50条
        saveSettings({
          nickname: state.nickname,
          avatar: state.avatar,
          customMotto: state.customMotto,
          cheerStyle: state.cheerStyle,
          defaultStartPage: state.defaultStartPage,
          cheerCount: state.cheerCount,
          lastCheerDate: state.lastCheerDate,
          cheerNotes: nextNotes,
          vibrationEnabled: state.vibrationEnabled,
        });
        return { cheerNotes: nextNotes };
      });
    },

    removeCheerNote: (id: string) => {
      set((state) => {
        const nextNotes = state.cheerNotes.filter((n) => n.id !== id);
        saveSettings({
          nickname: state.nickname,
          avatar: state.avatar,
          customMotto: state.customMotto,
          cheerStyle: state.cheerStyle,
          defaultStartPage: state.defaultStartPage,
          cheerCount: state.cheerCount,
          lastCheerDate: state.lastCheerDate,
          cheerNotes: nextNotes,
          vibrationEnabled: state.vibrationEnabled,
        });
        return { cheerNotes: nextNotes };
      });
    },

    resetSettings: () => {
      const todayStr = getTodayString();
      set({
        ...DEFAULT_SETTINGS,
        lastCheerDate: todayStr,
      });
      saveSettings({
        ...DEFAULT_SETTINGS,
        lastCheerDate: todayStr,
      });
    },
  };
});

import { create } from 'zustand';
import {
  type InspirationalQuote,
  loadInspirationalQuotes,
  getCachedQuotes,
} from '@/services/quotes';

export interface QuotesStoreState {
  quotes: InspirationalQuote[];
  currentIndex: number;
  isLoading: boolean;
  hasLoadedFromCloud: boolean;
  error: string | null;

  // Actions
  loadQuotes: (options?: { forceRefresh?: boolean; timeoutMs?: number }) => Promise<void>;
  nextQuote: (manual?: boolean) => void;
  setQuoteIndex: (index: number) => void;
  getCurrentQuote: () => InspirationalQuote;
}

const initialQuotes = getCachedQuotes();
const initialIndex = initialQuotes.length > 0 ? Math.floor(Math.random() * initialQuotes.length) : 0;

export const useQuotesStore = create<QuotesStoreState>((set, get) => ({
  quotes: initialQuotes,
  currentIndex: initialIndex,
  isLoading: false,
  hasLoadedFromCloud: false,
  error: null,

  loadQuotes: async (options) => {
    set({ isLoading: true, error: null });

    try {
      const list = await loadInspirationalQuotes(options);
      set((state) => {
        // 保持当前正在阅读的名言不被打断
        const current = state.quotes[state.currentIndex];
        let newIndex = state.currentIndex;
        if (current) {
          const found = list.findIndex((q) => q.text === current.text);
          if (found !== -1) {
            newIndex = found;
          } else if (newIndex >= list.length) {
            newIndex = 0;
          }
        } else {
          newIndex = 0;
        }

        return {
          quotes: list,
          currentIndex: newIndex,
          isLoading: false,
          hasLoadedFromCloud: true,
        };
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '获取名言失败',
      });
    }
  },

  nextQuote: (_manual = false) => {
    set((state) => {
      const len = state.quotes.length;
      if (len <= 1) return state;

      // 随机抽取不与当前重复的新名言，让每次轮播与切换都充满新鲜感与真实感
      let nextIndex = Math.floor(Math.random() * (len - 1));
      if (nextIndex >= state.currentIndex) {
        nextIndex += 1;
      }
      return { currentIndex: nextIndex };
    });
  },

  setQuoteIndex: (index: number) => {
    set((state) => ({
      currentIndex: Math.max(0, Math.min(index, state.quotes.length - 1)),
    }));
  },

  getCurrentQuote: () => {
    const { quotes, currentIndex } = get();
    return quotes[currentIndex] || quotes[0] || initialQuotes[0];
  },
}));

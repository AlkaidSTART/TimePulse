import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuotesStore } from '../useQuotesStore';
import * as quotesService from '@/services/quotes';

describe('useQuotesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with cached or default quotes and valid currentIndex', () => {
    const state = useQuotesStore.getState();
    expect(state.quotes.length).toBeGreaterThan(0);
    expect(state.currentIndex).toBeGreaterThanOrEqual(0);
    expect(state.currentIndex).toBeLessThan(state.quotes.length);
    expect(state.isLoading).toBe(false);
  });

  it('switches to a different quote when nextQuote() is called', () => {
    useQuotesStore.setState({
      quotes: [
        { text: '名言1', author: '作者1' },
        { text: '名言2', author: '作者2' },
        { text: '名言3', author: '作者3' },
      ],
      currentIndex: 0,
    });

    useQuotesStore.getState().nextQuote(true);
    const newIndex = useQuotesStore.getState().currentIndex;

    expect(newIndex).not.toBe(0);
    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeLessThan(3);
  });

  it('clamps quote index when setQuoteIndex is called', () => {
    useQuotesStore.setState({
      quotes: [
        { text: '名言1', author: '作者1' },
        { text: '名言2', author: '作者2' },
      ],
      currentIndex: 0,
    });

    useQuotesStore.getState().setQuoteIndex(99);
    expect(useQuotesStore.getState().currentIndex).toBe(1);

    useQuotesStore.getState().setQuoteIndex(-5);
    expect(useQuotesStore.getState().currentIndex).toBe(0);
  });

  it('loads quotes dynamically and preserves current quote if found in new list', async () => {
    const mockList: quotesService.InspirationalQuote[] = [
      { text: '全新动态名言1', author: '新作者1' },
      { text: '当前正在看的名言', author: '原作者' },
      { text: '全新动态名言3', author: '新作者3' },
    ];

    useQuotesStore.setState({
      quotes: [{ text: '当前正在看的名言', author: '原作者' }],
      currentIndex: 0,
    });

    vi.spyOn(quotesService, 'loadInspirationalQuotes').mockResolvedValueOnce(mockList);

    await useQuotesStore.getState().loadQuotes();

    const state = useQuotesStore.getState();
    expect(state.quotes).toEqual(mockList);
    expect(state.hasLoadedFromCloud).toBe(true);
    // Index should match where "当前正在看的名言" is located (index 1)
    expect(state.currentIndex).toBe(1);
    expect(state.getCurrentQuote().text).toBe('当前正在看的名言');
  });

  it('getCurrentQuote returns the quote at current index or safe fallback', () => {
    useQuotesStore.setState({
      quotes: [{ text: '目标名言', author: '目标作者' }],
      currentIndex: 0,
    });

    const quote = useQuotesStore.getState().getCurrentQuote();
    expect(quote.text).toBe('目标名言');
    expect(quote.author).toBe('目标作者');
  });
});

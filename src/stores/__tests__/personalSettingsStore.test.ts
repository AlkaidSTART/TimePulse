import { describe, it, expect, beforeEach } from 'vitest';
import { usePersonalSettingsStore } from '../usePersonalSettingsStore';

describe('usePersonalSettingsStore', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    usePersonalSettingsStore.getState().resetSettings();
  });

  it('initializes with default values', () => {
    const state = usePersonalSettingsStore.getState();
    expect(state.nickname).toBe('');
    expect(state.avatar).toBe('');
    expect(state.cheerStyle).toBe('energetic');
    expect(state.defaultStartPage).toBe('main');
  });

  it('updates profile settings correctly', () => {
    const { updateSettings } = usePersonalSettingsStore.getState();
    updateSettings({
      nickname: '星辰探索者',
      avatar: '远航',
      customMotto: '去看看外面的星辰大海',
      cheerStyle: 'poetic',
    });

    const updated = usePersonalSettingsStore.getState();
    expect(updated.nickname).toBe('星辰探索者');
    expect(updated.avatar).toBe('远航');
    expect(updated.customMotto).toBe('去看看外面的星辰大海');
    expect(updated.cheerStyle).toBe('poetic');
  });

  it('boosts cheer and increments counter', () => {
    const { boostCheer } = usePersonalSettingsStore.getState();
    const result1 = boostCheer();
    expect(result1.count).toBe(1);

    const result2 = boostCheer();
    expect(result2.count).toBe(2);
    expect(usePersonalSettingsStore.getState().cheerCount).toBe(2);
  });

  it('adds and removes cheer notes', () => {
    const { addCheerNote, removeCheerNote } = usePersonalSettingsStore.getState();
    addCheerNote('今天跑了五公里，精神倍棒！', '运动');

    let state = usePersonalSettingsStore.getState();
    expect(state.cheerNotes.length).toBe(1);
    expect(state.cheerNotes[0].content).toBe('今天跑了五公里，精神倍棒！');
    expect(state.cheerNotes[0].moodEmoji).toBe('运动');

    const noteId = state.cheerNotes[0].id;
    removeCheerNote(noteId);

    state = usePersonalSettingsStore.getState();
    expect(state.cheerNotes.length).toBe(0);
  });
});

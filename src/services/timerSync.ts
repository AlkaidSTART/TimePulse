import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { parseTimer, type Timer } from '@/domain/timer';
import type { TimerAction } from '@/features/timer-management/reducer';
import { addNotification } from '@/services/notificationManager';

export interface TimerSyncPayload {
  originDeviceId: string;
  userId: string;
  timestamp: number;
  actionType?: string;
  timers: Timer[];
  activeTimerId: string | null;
}

let clientDeviceId: string | null = null;

export function getClientDeviceId(): string {
  if (!clientDeviceId) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        clientDeviceId = window.sessionStorage.getItem('timepulse_device_id');
        if (!clientDeviceId) {
          clientDeviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          window.sessionStorage.setItem('timepulse_device_id', clientDeviceId);
        }
      } catch {
        clientDeviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      }
    } else {
      clientDeviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
  }
  return clientDeviceId;
}

export function setClientDeviceIdForTest(id: string | null): void {
  clientDeviceId = id;
}

let activeChannel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
let isApplyingRemote = false;
let lastAppliedTimestamp = 0;
let cloudPushTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingPushData: { timers: Timer[]; activeTimerId: string | null } | null = null;

export function isApplyingRemoteSync(): boolean {
  return isApplyingRemote;
}

function toNotification(timer: Timer): { id: string; title: string; targetTime: number } | null {
  if (timer.type !== 'countdown' && timer.type !== undefined) return null;
  if (!('targetDate' in timer)) return null;
  const targetDate = (timer as { targetDate: unknown }).targetDate;
  const targetTime = targetDate instanceof Date
    ? targetDate.getTime()
    : typeof targetDate === 'number'
      ? targetDate
      : new Date(String(targetDate)).getTime();
  if (Number.isNaN(targetTime)) return null;
  return { id: timer.id, title: timer.name, targetTime };
}

export function applyRemoteTimers(timers: Timer[], activeTimerId?: string | null): void {
  if (!Array.isArray(timers) || timers.length === 0) return;

  isApplyingRemote = true;
  try {
    const store = useTimerStore.getState();
    const targetActiveId = activeTimerId && timers.some((t) => t.id === activeTimerId)
      ? activeTimerId
      : (store.activeTimerId && timers.some((t) => t.id === store.activeTimerId)
        ? store.activeTimerId
        : timers[0].id);

    store.dispatch({
      type: 'replace',
      timers,
      activeTimerId: targetActiveId,
    });

    for (const timer of timers) {
      const notification = toNotification(timer);
      if (notification && notification.targetTime > Date.now()) {
        void addNotification(notification).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[TimerSync] 应用远程数据失败:', error);
  } finally {
    isApplyingRemote = false;
  }
}

export async function pushTimersToCloud(
  timers: Timer[],
  activeTimerId: string | null,
  userId?: string,
): Promise<boolean> {
  const targetUserId = userId || currentUserId || useAuthStore.getState().user?.id;
  if (!targetUserId) return false;

  try {
    if (timers.length > 0) {
      const rows = timers.map((timer, index) => ({
        user_id: targetUserId,
        id: timer.id,
        data: timer,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('timers')
        .upsert(rows, { onConflict: 'user_id,id' });

      if (upsertError) {
        console.warn('[TimerSync] 上传计时器失败:', upsertError.message);
        return false;
      }

      const currentIds = timers.map((t) => t.id);
      const filter = `(${currentIds.map((id) => `"${id}"`).join(',')})`;
      const { error: deleteError } = await supabase
        .from('timers')
        .delete()
        .eq('user_id', targetUserId)
        .not('id', 'in', filter);

      if (deleteError) {
        console.warn('[TimerSync] 清理已删除计时器失败:', deleteError.message);
      }
    } else {
      await supabase.from('timers').delete().eq('user_id', targetUserId);
    }

    const { error: stateError } = await supabase.from('app_state').upsert(
      {
        user_id: targetUserId,
        key: 'activeTimerId',
        value: activeTimerId ? { activeTimerId } : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' },
    );

    if (stateError) {
      console.warn('[TimerSync] 保存活动计时器状态失败:', stateError.message);
    }

    return true;
  } catch (error) {
    console.error('[TimerSync] 推送到云端异常:', error);
    return false;
  }
}

const CLOUD_PUSH_DEBOUNCE_MS = 500;

export function schedulePushToCloud(timers: Timer[], activeTimerId: string | null): void {
  const targetUserId = currentUserId || useAuthStore.getState().user?.id;
  if (!targetUserId) return;

  pendingPushData = { timers, activeTimerId };
  if (cloudPushTimeout) {
    clearTimeout(cloudPushTimeout);
  }
  cloudPushTimeout = setTimeout(() => {
    cloudPushTimeout = null;
    void flushPushToCloud();
  }, CLOUD_PUSH_DEBOUNCE_MS);
}

export async function flushPushToCloud(): Promise<void> {
  if (cloudPushTimeout) {
    clearTimeout(cloudPushTimeout);
    cloudPushTimeout = null;
  }
  if (!pendingPushData) return;
  const { timers, activeTimerId } = pendingPushData;
  pendingPushData = null;
  await pushTimersToCloud(timers, activeTimerId);
}

export async function pullTimersFromCloud(
  userId?: string,
): Promise<{ timers: Timer[]; activeTimerId: string | null } | null> {
  const targetUserId = userId || currentUserId || useAuthStore.getState().user?.id;
  if (!targetUserId) return null;

  try {
    const [timersRes, stateRes] = await Promise.all([
      supabase
        .from('timers')
        .select('id, data, sort_order, updated_at')
        .eq('user_id', targetUserId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('app_state')
        .select('value')
        .eq('user_id', targetUserId)
        .eq('key', 'activeTimerId')
        .maybeSingle(),
    ]);

    if (timersRes.error) {
      console.warn('[TimerSync] 拉取云端计时器失败:', timersRes.error.message);
      return null;
    }

    const cloudTimers = (timersRes.data || [])
      .map((row) => parseTimer(row.data))
      .filter((t): t is Timer => t !== null);

    let activeTimerId: string | null = null;
    if (stateRes.data?.value) {
      const val = stateRes.data.value;
      if (typeof val === 'string') {
        activeTimerId = val;
      } else if (typeof val === 'object' && val !== null && 'activeTimerId' in val) {
        activeTimerId = String((val as { activeTimerId: unknown }).activeTimerId);
      }
    }

    return { timers: cloudTimers, activeTimerId };
  } catch (error) {
    console.error('[TimerSync] 从云端拉取异常:', error);
    return null;
  }
}

export async function reconcileCloudOnLogin(userId: string): Promise<void> {
  try {
    if (!useTimerStore.getState().isLoaded) {
      await useTimerStore.getState().initTimers();
    }

    const cloudData = await pullTimersFromCloud(userId);
    if (!cloudData) return;

    const { timers: cloudTimers, activeTimerId: cloudActiveId } = cloudData;
    const localTimers = useTimerStore.getState().timers;
    const localActiveId = useTimerStore.getState().activeTimerId;

    if (cloudTimers.length > 0) {
      const cloudIdSet = new Set(cloudTimers.map((t) => t.id));
      const localExtraTimers = localTimers.filter((t) => !cloudIdSet.has(t.id) && !t.isAutoGenerated);

      let mergedTimers = cloudTimers;
      let targetActiveId = cloudActiveId;

      if (localExtraTimers.length > 0) {
        console.log(`[TimerSync] 检测到 ${localExtraTimers.length} 个本地新增计时器，合并并同步至云端`);
        mergedTimers = [...cloudTimers, ...localExtraTimers];
        targetActiveId = localActiveId || cloudActiveId;
        void pushTimersToCloud(mergedTimers, targetActiveId, userId);
      }

      applyRemoteTimers(mergedTimers, targetActiveId);
    } else {
      if (localTimers.length > 0) {
        console.log(`[TimerSync] 云端暂无计时器，自动将本地 ${localTimers.length} 个计时器同步至云端`);
        void pushTimersToCloud(localTimers, localActiveId, userId);
      }
    }
  } catch (error) {
    console.error('[TimerSync] 登录时同步云端异常:', error);
  }
}

export function notifyLocalTimerChange(
  timers: Timer[],
  activeTimerId: string | null,
  action?: TimerAction,
): void {
  if (isApplyingRemote) return;

  const user = useAuthStore.getState().user;
  if (!user) return;

  const originDeviceId = getClientDeviceId();
  const timestamp = Date.now();

  if (activeChannel) {
    try {
      void activeChannel.send({
        type: 'broadcast',
        event: 'timer_sync',
        payload: {
          originDeviceId,
          userId: user.id,
          timestamp,
          actionType: action?.type || 'update',
          timers,
          activeTimerId,
        },
      });
    } catch (err) {
      console.warn('[TimerSync] 广播多端同步消息失败:', err);
    }
  }

  schedulePushToCloud(timers, activeTimerId);
}

export function setupRealtimeChannel(userId: string): RealtimeChannel {
  teardownRealtimeChannel();
  currentUserId = userId;

  const channelName = `timepulse:sync:${userId}`;
  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { self: false },
    },
  });

  channel.on('broadcast', { event: 'timer_sync' }, ({ payload }: { payload: TimerSyncPayload }) => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.originDeviceId === getClientDeviceId()) return;
    if (payload.userId !== currentUserId) return;
    if (payload.timestamp && payload.timestamp < lastAppliedTimestamp) return;

    lastAppliedTimestamp = payload.timestamp || Date.now();
    console.log(`[TimerSync] 收到多端同步事件 [${payload.actionType || 'SYNC'}]，来自设备: ${payload.originDeviceId}`);

    if (Array.isArray(payload.timers) && payload.timers.length > 0) {
      applyRemoteTimers(payload.timers, payload.activeTimerId);
    }
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[TimerSync] 实时多端同步通道已建立: ${channelName}`);
    }
  });

  activeChannel = channel;
  return channel;
}

export function teardownRealtimeChannel(): void {
  if (activeChannel) {
    try {
      if (activeChannel && typeof (activeChannel as unknown as { unsubscribe?: unknown }).unsubscribe === 'function') {
        void supabase.removeChannel(activeChannel).catch(() => {});
      }
    } catch {
      // ignore
    }
    activeChannel = null;
  }
  currentUserId = null;
  if (cloudPushTimeout) {
    clearTimeout(cloudPushTimeout);
    cloudPushTimeout = null;
  }
  pendingPushData = null;
}

let isInitialized = false;

export function initTimerSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isInitialized) return () => {};
  isInitialized = true;

  const unsubscribeAuth = useAuthStore.subscribe((state) => {
    const user = state.user;
    if (user && user.id !== currentUserId) {
      setupRealtimeChannel(user.id);
      void reconcileCloudOnLogin(user.id);
    } else if (!user && currentUserId) {
      teardownRealtimeChannel();
    }
  });

  const currentUser = useAuthStore.getState().user;
  if (currentUser) {
    setupRealtimeChannel(currentUser.id);
    void reconcileCloudOnLogin(currentUser.id);
  }

  const handleVisibilityOrOnline = () => {
    if (document.visibilityState === 'visible' && currentUserId) {
      void pullTimersFromCloud(currentUserId).then((cloudData) => {
        if (cloudData && cloudData.timers.length > 0) {
          applyRemoteTimers(cloudData.timers, cloudData.activeTimerId);
        }
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityOrOnline);
  window.addEventListener('online', handleVisibilityOrOnline);
  window.addEventListener('pagehide', () => {
    void flushPushToCloud();
  });

  return () => {
    unsubscribeAuth();
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    window.removeEventListener('online', handleVisibilityOrOnline);
    teardownRealtimeChannel();
    isInitialized = false;
  };
}

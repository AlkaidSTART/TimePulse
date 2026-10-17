import { useEffect } from 'react';
import { BackgroundProvider, FullscreenProvider, ThemeProvider, TimerProvider } from './providers';
import OfflineNotification from '@/features/notification/components/OfflineNotification';
import GlobalNotificationManager from '@/features/notification/components/GlobalNotificationManager';
import Home from './Home';
import { testNotification } from '@/services/notifications';
import notificationManager from '@/services/notificationManager';
import { PageTransitionProvider } from '@/hooks/usePageTransition';
import GlobalScrollbars from '@/components/layout/GlobalScrollbars';

declare global {
  interface Window {
    testNotification?: typeof testNotification;
    notificationManager?: typeof notificationManager;
  }
}

function useViteAppLifecycle() {
  useEffect(() => {
    console.log(`TimePulse 初始化完成 - ${new Date().toLocaleString()}`);

    const onControllerChange = () => {
      console.log('Service Worker已接管页面，可以发送通知');
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    if (import.meta.env.DEV) {
      window.testNotification = testNotification;
      window.notificationManager = notificationManager;
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      }
    };
  }, []);
}

export default function App() {
  useViteAppLifecycle();

  return (
    <ThemeProvider>
      <BackgroundProvider>
        <FullscreenProvider>
          <PageTransitionProvider>
            <TimerProvider>
              <GlobalScrollbars />
              <OfflineNotification />
              <GlobalNotificationManager />
              <Home />
            </TimerProvider>
          </PageTransitionProvider>
        </FullscreenProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
}

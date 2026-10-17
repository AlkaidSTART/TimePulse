import { lazy, Suspense, type ReactNode } from 'react';
import Header from './Header';
import UpdateToast from '@/features/notification/components/UpdateToast';
import OptimisticUpdateBanner from '@/features/version/components/OptimisticUpdateBanner';
import { ThemeColorSynchronizer } from '@/app/providers/ThemeProvider';

const AboutVersionModal = lazy(() => import('@/features/version/components/AboutVersionModal'));

type LayoutProps = {
  children: ReactNode;
  onHeaderHeightChange?: (height: number) => void;
};

export default function Layout({ children, onHeaderHeightChange }: LayoutProps) {
  return (
    <ThemeColorSynchronizer>
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <Header onHeightChange={onHeaderHeightChange} />

        <div className="relative h-full min-h-0 overflow-hidden">
          {children}
        </div>

        <UpdateToast />
        <OptimisticUpdateBanner />
        <Suspense fallback={null}>
          <AboutVersionModal />
        </Suspense>
      </div>
    </ThemeColorSynchronizer>
  );
}

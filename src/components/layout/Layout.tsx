import type { ReactNode } from 'react';
import Header from './Header';
import UpdateToast from '@/features/notification/components/UpdateToast';
import { ThemeColorSynchronizer } from '@/app/providers/ThemeProvider';

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
      </div>
    </ThemeColorSynchronizer>
  );
}

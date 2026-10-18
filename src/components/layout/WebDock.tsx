import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  HomeIcon,
  Component,
  Package,
  Activity,
  Image as ImageIcon,
  ScrollText,
  Mail,
  SunMoon,
  Maximize,
  Minimize,
  Smile,
  User,
} from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel, DockBadge } from '@/components/core/dock';
import { usePageTransition } from '@/hooks/usePageTransition';
import { useFullscreen } from '@/app/providers/FullscreenProvider';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useVersionStore } from '@/stores/useVersionStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePersonalSettingsStore } from '@/stores/usePersonalSettingsStore';
import { useTranslation } from '@/i18n/useTranslation';
import { readTodoItems, TODO_STORAGE_EVENT } from '@/features/todo/todoStorage';
import { getEffectiveAvatarUrl } from '@/utils/avatar';
import { cn } from '@/lib/utils';

export interface WebDockProps {
  onOpenAdd?: () => void;
  onOpenManage?: () => void;
  onOpenBackground?: () => void;
  onOpenShare?: () => void;
  onOpenThemeLibrary?: () => void;
  className?: string;
}

export default function WebDock({
  onOpenAdd,
  onOpenManage,
  onOpenBackground,
  onOpenShare,
  onOpenThemeLibrary,
  className,
}: WebDockProps) {
  const shouldReduceMotion = useReducedMotion();
  const { view, transitionTo } = usePageTransition();
  const { isFullscreen, isHeaderVisible, toggleFullscreen } = useFullscreen();
  const { theme, toggleTheme, accentColor } = useTheme();
  const currentVersion = useVersionStore((s) => s.currentVersion);
  const hasUpdate = useVersionStore((s) => s.hasUpdate);
  const openAboutModal = useVersionStore((s) => s.openAboutModal);
  const user = useAuthStore((s) => s.user);
  const avatar = usePersonalSettingsStore((s) => s.avatar);
  const userAvatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || (avatar && (avatar.startsWith('http') || avatar.startsWith('data:')) ? avatar : null);
  const { t } = useTranslation();

  const [pendingTodoCount, setPendingTodoCount] = useState(0);

  // Sync uncompleted todo count
  useEffect(() => {
    const updateCount = () => {
      try {
        const items = readTodoItems();
        const pending = items.filter((item) => !item.completed);
        setPendingTodoCount(pending.length);
      } catch {
        // storage fallback
      }
    };
    updateCount();
    window.addEventListener(TODO_STORAGE_EVENT, updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener(TODO_STORAGE_EVENT, updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const handleOpenAdd = () => {
    if (onOpenAdd) {
      onOpenAdd();
    } else {
      if (window.location.hash !== '#add') window.location.hash = 'add';
    }
  };

  const handleOpenManage = () => {
    if (onOpenManage) {
      onOpenManage();
    } else {
      if (window.location.hash !== '#manage') window.location.hash = 'manage';
    }
  };

  const handleOpenBackground = () => {
    if (onOpenBackground) {
      onOpenBackground();
    } else {
      if (window.location.hash !== '#background') window.location.hash = 'background';
    }
  };

  const handleOpenShare = () => {
    if (onOpenShare) {
      onOpenShare();
    } else {
      if (window.location.hash !== '#share') window.location.hash = 'share';
    }
  };

  const handleOpenChangelog = () => {
    openAboutModal();
  };

  const dockItems = [
    {
      id: 'cheer',
      title: t('header.cheerTab', '元气打气'),
      icon: <Smile className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        if (view !== 'cheer') transitionTo('cheer');
      },
      isActive: view === 'cheer',
    },
    {
      id: 'home',
      title: t('header.timers', '主计时器'),
      icon: <HomeIcon className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: () => {
        if (view !== 'main') transitionTo('main');
      },
      isActive: view === 'main',
    },
    {
      id: 'todo',
      title: t('header.todoTab', '待办清单'),
      icon: <Component className="size-full text-neutral-700 dark:text-neutral-200" />,
      badge: pendingTodoCount > 0 ? (
        <DockBadge style={{ backgroundColor: accentColor || '#0ea5e9' }}>
          {pendingTodoCount > 99 ? '99+' : pendingTodoCount}
        </DockBadge>
      ) : null,
      onClick: () => {
        if (view !== 'todo') transitionTo('todo');
      },
      isActive: view === 'todo',
    },
    {
      id: 'add',
      title: t('header.newTimer', '新建计时器'),
      icon: <Package className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: handleOpenAdd,
    },
    {
      id: 'manage',
      title: t('header.manageAllTimers', '管理全部计时器'),
      icon: <Activity className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: handleOpenManage,
    },
    {
      id: 'background',
      title: t('header.background', '背景与壁纸'),
      icon: <ImageIcon className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: handleOpenBackground,
    },
    {
      id: 'changelog',
      title: `${t('version.title', '更新日志与版本')} (v${currentVersion})`,
      icon: <ScrollText className="size-full text-neutral-700 dark:text-neutral-200" />,
      badge: hasUpdate ? (
        <span className="pointer-events-none absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-amber-500 animate-pulse ring-2 ring-white dark:ring-[#141416] cream:ring-[#faf7ee]" />
      ) : null,
      onClick: handleOpenChangelog,
    },
    {
      id: 'share',
      title: t('share.title', '分享与二维码'),
      icon: <Mail className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: handleOpenShare,
    },
    {
      id: 'theme',
      title: `${t('theme.title', '切换主题')} (${theme === 'cream' ? t('personalSettings.themeCream', '米白模式') : t('personalSettings.themeLight', '白色模式')})`,
      icon: <SunMoon className="size-full text-neutral-700 dark:text-neutral-200" />,
      onClick: toggleTheme,
    },
    {
      id: 'settings',
      title: user ? `${t('personalSettings.cloudAccount', '个人账号')}: ${user.user_metadata?.nickname || user.email}` : t('header.settingsTab', '个人设置中心'),
      icon: userAvatarUrl ? (
        <img
          src={userAvatarUrl}
          alt="Avatar"
          className="size-full rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10"
        />
      ) : (
        <User className="size-full text-neutral-700 dark:text-neutral-200" />
      ),
      onClick: () => {
        if (view !== 'settings') transitionTo('settings');
      },
      isActive: view === 'settings' || view === 'auth',
    },
    {
      id: 'fullscreen',
      title: isFullscreen ? t('header.exitFullscreen', '退出全屏') : t('header.fullscreen', '全屏显示'),
      icon: isFullscreen ? (
        <Minimize className="size-full text-neutral-700 dark:text-neutral-200" />
      ) : (
        <Maximize className="size-full text-neutral-700 dark:text-neutral-200" />
      ),
      onClick: toggleFullscreen,
      isActive: isFullscreen,
    },
  ];

  return (
    <motion.aside
      aria-label={t('header.dockBar', 'Web端桌面快捷栏')}
      initial={false}
      animate={{
        y: isFullscreen && !isHeaderVisible ? 100 : 0,
        opacity: isFullscreen && !isHeaderVisible ? 0 : 1,
      }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'hidden lg:flex fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-full pointer-events-auto',
        className
      )}
    >
      <Dock className="ios-liquid-glass-dock relative items-end pb-3 rounded-2xl px-3.5">

        {dockItems.map((item) => (
          <DockItem
            key={item.id}
            onClick={item.onClick}
            isActive={item.isActive}
            badge={item.badge}
            className="aspect-square rounded-2xl bg-black/[0.03] hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.12] transition-colors shadow-xs border border-black/[0.04] dark:border-white/[0.06]"
            aria-label={item.title}
          >
            <DockLabel>{item.title}</DockLabel>
            <DockIcon>{item.icon}</DockIcon>
          </DockItem>
        ))}
      </Dock>
    </motion.aside>
  );
}
